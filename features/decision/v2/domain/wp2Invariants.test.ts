import { describe, expect, it } from "vitest";

import type { CandidateEvaluation, CandidateEvaluationSet } from "./candidate";
import type { DecisionTurnResult } from "./decisionTurnResult";
import { validateCandidateEvaluationSet, validateDecisionTurnResult } from "./invariants";

function candidate(id: string, eligibility: CandidateEvaluation["affordability"]["recommendationEligibility"]): CandidateEvaluation {
  return {
    exactVariantId: id,
    modelFamilyId: `family-${id}`,
    technicalEligibility: eligibility === "INELIGIBLE" ? "ELIMINATED" : "ELIGIBLE",
    affordability: {
      priceAuthorityState: eligibility === "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED" ? "UNKNOWN" : "VERIFIED_CURRENT",
      budgetDisposition: eligibility === "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED" ? "NOT_EVALUABLE" : eligibility === "INELIGIBLE" ? "CONFIRMED_OVER_BUDGET" : "CONFIRMED_WITHIN_BUDGET",
      recommendationEligibility: eligibility,
      affordabilityClaimAllowed: eligibility === "FULLY_ELIGIBLE",
      includedInMinimumBudgetIncrease: eligibility !== "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED",
      requiresUnverifiedGroupConsent: eligibility === "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED",
    },
    rankingContributions: [],
    eliminationReasonCodes: eligibility === "INELIGIBLE" ? ["ELIMINATED"] : [],
  };
}

function set(overrides: Partial<CandidateEvaluationSet> = {}): CandidateEvaluationSet {
  const candidates = [candidate("one", "FULLY_ELIGIBLE"), candidate("two", "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED"), candidate("three", "INELIGIBLE")];
  return {
    evaluatedFromCatalogFingerprint: "catalog-fingerprint",
    initialCandidateIds: candidates.map((item) => item.exactVariantId),
    candidates,
    fullyEligibleCandidateIds: ["one"],
    priceUnverifiedCandidateIds: ["two"],
    ineligibleCandidateIds: ["three"],
    ...overrides,
  };
}

function result(overrides: Partial<DecisionTurnResult> = {}): DecisionTurnResult {
  return {
    state: "DIRECT_MODEL_LOOKUP",
    nextAction: { type: "ANSWER_MODEL_LOOKUP" },
    directAnswerObligation: {
      kind: "MODEL_AVAILABILITY",
      sourceMessageId: "message-1",
      authorizedExplanationFactIds: ["lookup-fact"],
      authorizedCandidateIds: ["variant-1"],
      placement: "BEFORE_MATERIAL_QUESTION",
    },
    memoryEvents: [],
    candidateEvaluation: set({ candidates: [], fullyEligibleCandidateIds: [], priceUnverifiedCandidateIds: [], ineligibleCandidateIds: [], initialCandidateIds: [] }),
    conflictAnalysis: null,
    materialQuestion: null,
    offer: null,
    explanationFacts: [{
      id: "lookup-fact",
      kind: "CATALOG_FACT",
      value: "catalog lookup match",
      authorityReference: "catalog-fingerprint",
      userVisible: true,
      candidateIds: ["variant-1"],
    }],
    realization: {
      authorizedExplanationFactIds: ["lookup-fact"],
      prohibitedClaims: [],
      mentionableCandidateIds: ["variant-1"],
      revealableCandidateIds: [],
      directAnswerPlacement: "BEFORE_MATERIAL_QUESTION",
    },
    trace: { turn: 1, catalogFingerprint: "catalog-fingerprint", memoryFingerprint: "memory-fingerprint", decisionFingerprint: "decision-fingerprint", policyReferences: [] },
    ...overrides,
  };
}

describe("V2 candidate buckets", () => {
  it("accepts disjoint buckets matching candidate eligibility", () => {
    expect(validateCandidateEvaluationSet(set())).toEqual({ ok: true });
  });

  it("rejects bucket overlap", () => {
    const validation = validateCandidateEvaluationSet(set({ priceUnverifiedCandidateIds: ["one", "two"] }));
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.errors.map((error) => error.code)).toContain("CANDIDATE_BUCKET_OVERLAP");
  });

  it("rejects duplicate candidates and bucket eligibility mismatch", () => {
    const duplicate = candidate("one", "FULLY_ELIGIBLE");
    const validation = validateCandidateEvaluationSet(set({ candidates: [duplicate, duplicate], fullyEligibleCandidateIds: ["one"], priceUnverifiedCandidateIds: [], ineligibleCandidateIds: [] }));
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.errors.map((error) => error.code)).toContain("CANDIDATE_SET_DUPLICATE_VARIANT");

    const mismatch = validateCandidateEvaluationSet(set({ fullyEligibleCandidateIds: ["two"], priceUnverifiedCandidateIds: ["one"] }));
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.errors.map((error) => error.code)).toContain("CANDIDATE_BUCKET_CONTENT_MISMATCH");
  });
});

describe("V2 mention and reveal authorization", () => {
  it("allows direct lookup mention without an offer", () => {
    expect(validateDecisionTurnResult(result())).toEqual({ ok: true });
  });

  it("does not treat mention permission as reveal permission", () => {
    const validation = validateDecisionTurnResult(result({
      realization: { ...result().realization, revealableCandidateIds: ["variant-1"] },
    }));
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.errors.map((error) => error.code)).toContain("REVEALABLE_CANDIDATE_OUTSIDE_OFFER");
  });

  it("rejects recommendation reveal without a governed offer", () => {
    const validation = validateDecisionTurnResult(result({ nextAction: { type: "REVEAL_AUTHORIZED_CARDS" } }));
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.errors.map((error) => error.code)).toContain("RECOMMENDATION_REVEAL_WITHOUT_OFFER");
  });

  it("rejects mention without catalog-backed lookup fact", () => {
    const validation = validateDecisionTurnResult(result({ explanationFacts: [] }));
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.errors.map((error) => error.code)).toContain("MENTIONABLE_CANDIDATE_NOT_SUPPORTED");
  });
});
