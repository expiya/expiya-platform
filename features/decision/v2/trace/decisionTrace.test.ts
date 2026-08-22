import { describe, expect, it } from "vitest";

import { DecisionTraceCollector, evaluateDecisionTurnTrace, traceChecksum, type DecisionTurnTrace } from "./decisionTrace";

const base = (): DecisionTurnTrace => ({
  schemaVersion: 1,
  messageId: "turn-6",
  interpretedActs: ["RECOMMENDATION_REQUEST"],
  activeConstraints: [
    { fieldId: "bodyStyle", decisionEffect: "STRONG_RANK", normalizedValue: { operator: "EQUALS", value: "Sedan" } },
    { fieldId: "fuelType", decisionEffect: "STRONG_RANK", normalizedValue: { operator: "EQUALS", value: "HEV" } },
    { fieldId: "transmission", decisionEffect: "STRONG_RANK", normalizedValue: { operator: "EQUALS", value: "AUTOMATIC" } },
  ],
  rankingCandidates: [
    { exactVariantId: "corolla-sedan", modelFamilyId: "corolla", brand: "Toyota", model: "Corolla", bodyStyle: "Sedan", fuelType: "HEV", transmissionClass: "AUTOMATIC", finalOrdinal: 1, functionalFitScore: 3, rankingReasonCodes: [] },
    { exactVariantId: "corolla-cross", modelFamilyId: "corolla-cross", brand: "Toyota", model: "Corolla Cross", bodyStyle: "SUV", fuelType: "HEV", transmissionClass: "AUTOMATIC", finalOrdinal: 2, functionalFitScore: 2, rankingReasonCodes: [] },
  ],
  shortlistCandidateIds: ["corolla-cross"],
  shortlistMode: "SINGLE_REQUESTED",
  exactModelPreferenceScope: false,
  action: "REQUEST_REVEAL_CONSENT",
  recommendationReadiness: "READY_FOR_OFFER",
});

describe("decision trace invariants", () => {
  it("catches the general preference-dominance and false single-request failure", () => {
    expect(evaluateDecisionTurnTrace(base()).map((failure) => failure.code)).toEqual([
      "SHORTLIST_PREFERENCE_DOMINANCE_VIOLATION",
      "SINGLE_SHORTLIST_WITHOUT_EXACT_MODEL_SCOPE",
    ]);
  });

  it("blocks an offer when no selectable candidate covers a material preference", () => {
    const trace = { ...base(), activeConstraints: [base().activeConstraints[0]!], rankingCandidates: [base().rankingCandidates[1]!], shortlistCandidateIds: ["corolla-cross"], shortlistMode: "FAMILY_DIVERSE" };
    expect(evaluateDecisionTurnTrace(trace).map((failure) => failure.code)).toContain("OFFER_WITH_ZERO_MATERIAL_PREFERENCE_COVERAGE");
  });

  it("is deterministic and never requires raw conversation text", () => {
    const collector = new DecisionTraceCollector(); collector.record(base());
    expect(collector.evaluate()).toHaveLength(2);
    expect(traceChecksum(base())).toBe(traceChecksum({ ...base() }));
    expect(JSON.stringify(collector.snapshot())).not.toContain("merhaba");
  });

  it("fails closed for hard-filter, affordability accounting and premature-offer violations", () => {
    const trace: DecisionTurnTrace = {
      ...base(), activeConstraints: [{ fieldId: "bodyStyle", decisionEffect: "HARD_FILTER", normalizedValue: { operator: "EQUALS", value: "Sedan" } }],
      shortlistMode: "FAMILY_DIVERSE", shortlistCandidateIds: ["corolla-cross"], offerCreated: true,
      recommendationReadiness: "NEEDS_MORE_INFORMATION",
      affordabilityBuckets: { selectable: 2, verifiedWithin: 0, estimateWithin: 0, estimateOverConditional: 0, budgetNotApplied: 1, verifiedOver: 0, unresolved: 0, technicalUnknown: 0, eliminated: 0 },
    };
    expect(evaluateDecisionTurnTrace(trace).map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "HARD_FILTER_SHORTLIST_VIOLATION", "OFFER_WITHOUT_READY_SHORTLIST", "AFFORDABILITY_BUCKET_ACCOUNTING_INVALID",
    ]));
  });
});
