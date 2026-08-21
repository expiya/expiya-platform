import { describe, expect, it } from "vitest";

import type { AffordabilityCandidatePool, AffordabilityCandidateResult } from "../affordability/types";
import type { CandidateRanking, CandidateRankingResult } from "./types";
import { selectBudgetNearestShortlist, selectLeadingDecisionCohortIds } from "./finalCandidateSelection";

function ranked(id: string, family: string, ordinal: number, functional = 2, usage = 1): CandidateRankingResult {
  return { exactVariantId: id, modelFamilyId: family, affordabilityTier: "VERIFIED_WITHIN_BUDGET", rankVector: [{ tier: "CONFIRMED_FUNCTIONAL_FIT", score: functional, authority: "test", reasonCodes: [] }, { tier: "USAGE_SCENARIO_FIT", score: usage, authority: "test", reasonCodes: [] }], rankingReasonCodes: [], explanationFactInputs: [], personaTrace: { personaActivated: false, requestedPersonaTraits: [], matchedPersonaTraits: [], personaScore: 0, affectedRanking: false, sourceAuthority: "NONE", decisionUse: "NONE" }, dailyLifeTrace: { mappings: [], score: 0, affectedRanking: false }, finalOrdinal: ordinal };
}

function priced(id: string, amount?: number): AffordabilityCandidateResult {
  return { exactVariantId: id, technicalDisposition: "ELIGIBLE", priceAuthority: { state: amount === undefined ? "UNKNOWN" : "VERIFIED_CURRENT", decisionUse: amount === undefined ? "NO_AFFORDABILITY_USE" : "PUBLIC_EXACT_AFFORDABILITY", ...(amount === undefined ? {} : { publicExactAmountTry: amount }), reasonCodes: [], factReferences: [], realizationPermission: amount === undefined ? "NO_PRICE_LANGUAGE" : "EXACT_PUBLIC_PRICE_ALLOWED", hardBudgetEvaluationAllowed: amount !== undefined }, budgetDisposition: "NOT_APPLIED", finalDisposition: "ELIGIBLE_BUDGET_NOT_APPLIED", affordabilityTier: "BUDGET_NOT_APPLIED", selectable: true, affordabilityClaimAllowed: false, priceMentionAllowed: amount !== undefined, includedInMinimumBudgetIncrease: false, reasonCodes: [], factReferences: [], policyReferences: [], softSignals: [] };
}

describe("final candidate selection", () => {
  it("defines the active cohort from functional coverage without treating usage rank as elimination", () => {
    const candidates = [ranked("best-a", "a", 1), ranked("best-b", "b", 2), ranked("weaker", "c", 3, 1), ranked("usage-weaker", "d", 4, 2, 0)];
    const ranking = { catalogFingerprint: "catalog", decisionFingerprint: "decision", rankedCandidateIds: candidates.map((candidate) => candidate.exactVariantId), priceUnresolvedCandidateIds: [], candidates, diagnostics: [] } satisfies CandidateRanking;
    expect(selectLeadingDecisionCohortIds(ranking)).toEqual(["best-a", "best-b", "usage-weaker"]);
  });

  it("uses budget as the final discriminator without silently re-filtering by generic usage score", () => {
    const candidates = [ranked("usage-high", "a", 1, 2, 2), ranked("closer", "b", 2, 2, 0)];
    const ranking = { catalogFingerprint: "catalog", decisionFingerprint: "decision", rankedCandidateIds: ["usage-high", "closer"], priceUnresolvedCandidateIds: [], candidates, diagnostics: [] } satisfies CandidateRanking;
    const prices = [priced("usage-high", 1_500_000), priced("closer", 2_900_000)];
    const affordability = { catalogFingerprint: "catalog", decisionFingerprint: "decision", evaluationTime: "2026-08-21T00:00:00.000Z", initialCandidateIds: prices.map((item) => item.exactVariantId), verifiedPriceEligibleCandidateIds: [], internalEstimateWithinCandidateIds: [], estimatedOverBudgetConditionalCandidateIds: [], budgetNotAppliedEligibleCandidateIds: prices.map((item) => item.exactVariantId), priceUnresolvedCandidateIds: [], technicallyNotEvaluableCandidateIds: [], verifiedOverBudgetCandidateIds: [], eliminatedCandidateIds: [], selectableCandidateIds: prices.map((item) => item.exactVariantId), candidates: prices, budgetIncreaseGuidance: [], trace: [], diagnostics: [] } satisfies AffordabilityCandidatePool;
    expect(selectBudgetNearestShortlist({ ranking, affordability, targetAmountTry: 3_000_000 }).candidateIds).toEqual(["closer", "usage-high"]);
  });

  it("selects at most three verified prices nearest to but not over the budget", () => {
    const candidates = [ranked("near", "a", 1), ranked("same-family", "a", 2), ranked("second", "b", 3), ranked("third", "c", 4), ranked("cheap", "d", 5), ranked("over", "e", 6), ranked("unknown", "f", 7)];
    const ranking = { catalogFingerprint: "catalog", decisionFingerprint: "decision", rankedCandidateIds: candidates.map((candidate) => candidate.exactVariantId), priceUnresolvedCandidateIds: ["unknown"], candidates, diagnostics: [] } satisfies CandidateRanking;
    const prices = [priced("near", 2_950_000), priced("same-family", 2_990_000), priced("second", 2_800_000), priced("third", 2_500_000), priced("cheap", 1_000_000), priced("over", 3_100_000), priced("unknown")];
    const affordability = { catalogFingerprint: "catalog", decisionFingerprint: "decision", evaluationTime: "2026-08-21T00:00:00.000Z", initialCandidateIds: prices.map((item) => item.exactVariantId), verifiedPriceEligibleCandidateIds: [], internalEstimateWithinCandidateIds: [], estimatedOverBudgetConditionalCandidateIds: [], budgetNotAppliedEligibleCandidateIds: prices.map((item) => item.exactVariantId), priceUnresolvedCandidateIds: ["unknown"], technicallyNotEvaluableCandidateIds: [], verifiedOverBudgetCandidateIds: [], eliminatedCandidateIds: [], selectableCandidateIds: prices.map((item) => item.exactVariantId), candidates: prices, budgetIncreaseGuidance: [], trace: [], diagnostics: [] } satisfies AffordabilityCandidatePool;
    expect(selectBudgetNearestShortlist({ ranking, affordability, targetAmountTry: 3_000_000 }).candidateIds).toEqual(["same-family", "second", "third"]);
  });

  it("uses internal estimates for selection without adding them to the affordability public contract", () => {
    const candidates = [ranked("estimated", "a", 1), ranked("verified", "b", 2)];
    const ranking = { catalogFingerprint: "catalog", decisionFingerprint: "decision", rankedCandidateIds: ["estimated", "verified"], priceUnresolvedCandidateIds: [], candidates, diagnostics: [] } satisfies CandidateRanking;
    const estimated = { ...priced("estimated"), priceAuthority: { ...priced("estimated").priceAuthority, state: "INTERNAL_ESTIMATE" as const, decisionUse: "INTERNAL_APPROXIMATE_AFFORDABILITY" as const, realizationPermission: "APPROXIMATE_BUDGET_LANGUAGE_ONLY" as const } };
    const prices = [estimated, priced("verified", 2_500_000)];
    const affordability = { catalogFingerprint: "catalog", decisionFingerprint: "decision", evaluationTime: "2026-08-21T00:00:00.000Z", initialCandidateIds: ["estimated", "verified"], verifiedPriceEligibleCandidateIds: ["verified"], internalEstimateWithinCandidateIds: ["estimated"], estimatedOverBudgetConditionalCandidateIds: [], budgetNotAppliedEligibleCandidateIds: [], priceUnresolvedCandidateIds: [], technicallyNotEvaluableCandidateIds: [], verifiedOverBudgetCandidateIds: [], eliminatedCandidateIds: [], selectableCandidateIds: ["estimated", "verified"], candidates: prices, budgetIncreaseGuidance: [], trace: [], diagnostics: [] } satisfies AffordabilityCandidatePool;
    const snapshot = { variantById: { get: (id: string) => id === "estimated" ? { activeNewPrice: { amountTry: 2_900_000 } } : undefined } } as never;
    expect(selectBudgetNearestShortlist({ ranking, affordability, snapshot, targetAmountTry: 3_000_000 }).candidateIds).toEqual(["estimated", "verified"]);
    expect(JSON.stringify(affordability)).not.toContain("2900000");
  });
});
