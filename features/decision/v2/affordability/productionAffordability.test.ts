import { describe, expect, it } from "vitest";
import { loadProductionCatalogSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import { evaluateTechnicalCandidatePool } from "../filter/pipeline";
import { V2_DECISION_FIELD_REGISTRY_V1 } from "../filter/registry";
import { USAGE_CARGO_POLICIES_V1 } from "../usage/policy";
import { evaluateAffordabilityCandidatePool } from "./evaluate";
import { AFFORDABILITY_POLICY_V1, PRICE_AUTHORITY_POLICY_V1 } from "./policy";

describe("WP6 production affordability diagnostic", () => {
  it("evaluates every candidate in the active pinned snapshot with injected post-effective time", async () => {
    const loaded = await loadProductionCatalogSnapshotForTest(new Date("2026-08-19T00:00:00.000Z")); expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const technicalPool = evaluateTechnicalCandidatePool({ snapshot: loaded.snapshot, decisionFingerprint: "production-affordability", activeConstraints: { activeHardConstraints: [], activeNonHardConstraints: [], supersessionTrace: [], diagnostics: [] }, activeRejections: { rejections: [] }, usageNeed: { commercialScenario: "UNSPECIFIED", orientation: "UNKNOWN" }, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, usagePolicies: USAGE_CARGO_POLICIES_V1 });
    const input = { snapshot: loaded.snapshot, technicalPool, budget: { maximumHardCeiling: { amount: 2_000_000, currency: "TRY" as const }, financeFlexibility: "NONE" as const, unresolvedFinancedCeiling: false, budgetImportance: "HARD" as const, budgetUnknown: false, budgetExcluded: false }, evaluationTime: "2026-08-19T00:00:00.000Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 };
    const first = evaluateAffordabilityCandidatePool(input); const second = evaluateAffordabilityCandidatePool(input);
    expect(first).toEqual(second); expect(first.initialCandidateIds).toHaveLength(loaded.snapshot.variants.length);
    expect(first.initialCandidateIds.length).toBe(first.verifiedPriceEligibleCandidateIds.length + first.internalEstimateWithinCandidateIds.length + first.estimatedOverBudgetConditionalCandidateIds.length + first.budgetNotAppliedEligibleCandidateIds.length + first.priceUnresolvedCandidateIds.length + first.technicallyNotEvaluableCandidateIds.length + first.verifiedOverBudgetCandidateIds.length + first.eliminatedCandidateIds.length);
    expect(first.internalEstimateWithinCandidateIds.length + first.estimatedOverBudgetConditionalCandidateIds.length).toBeGreaterThan(0);
    expect(first.budgetIncreaseGuidance.map((guidance) => guidance.status)).toEqual(["VERIFIED_AVAILABLE", "ESTIMATED_AVAILABLE"]);
  });
});
