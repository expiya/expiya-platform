import { describe, expect, it } from "vitest";
import { buildCatalogSnapshot } from "../catalog/snapshot";
import { release, sourced, variant } from "../catalog/testFixtures.testSupport";
import type { BudgetState } from "../domain/budget";
import { evaluateTechnicalCandidatePool } from "../filter/pipeline";
import { V2_DECISION_FIELD_REGISTRY_V1 } from "../filter/registry";
import type { TechnicalCandidatePool } from "../filter/types";
import { USAGE_CARGO_POLICIES_V1 } from "../usage/policy";
import { evaluateAffordabilityCandidatePool } from "./evaluate";
import { AFFORDABILITY_POLICY_V1, PRICE_AUTHORITY_POLICY_V1 } from "./policy";
import { projectConsumerVisiblePriceFact } from "./realization";

const NOW = "2026-08-20T00:00:00.000Z";
const budget = (overrides: Partial<BudgetState> = {}): BudgetState => ({ financeFlexibility: "NONE", unresolvedFinancedCeiling: false, budgetImportance: "HARD", budgetUnknown: false, budgetExcluded: false, maximumHardCeiling: { amount: 2_000_000, currency: "TRY" }, ...overrides });
function price(id: string, amountTry: number, overrides: Readonly<Record<string, unknown>> = {}) { return { id: `price-${id}`, vehicleVariantId: id, market: "TR", condition: "NEW", amountTry, priceType: "LIST", consumerVisibility: "PUBLIC", validFrom: "2026-08-19T00:00:00.000Z", provenance: sourced("price").provenance, confidence: "HIGH", ...overrides }; }
async function inputs(prices: readonly (readonly [string, number, Readonly<Record<string, unknown>>?])[] = [["v1", 1_900_000], ["v2", 2_180_000]]) {
  const records = prices.map(([id, amount, overrides]) => ({ ...variant(id, "Generic", `Model ${id}`, "Base", { bodyStyle: sourced("SUV") }), activeNewPrice: price(id, amount, overrides) }));
  const data = release("1.0.0", records as unknown as ReturnType<typeof variant>[]); const loaded = await buildCatalogSnapshot({ pointer: data.pointer, manifest: data.manifest, catalog: data.catalog, decisionFacets: data.facets, now: new Date(NOW) }); if (loaded.status !== "READY") throw new Error(loaded.reason);
  const technicalPool = evaluateTechnicalCandidatePool({ snapshot: loaded.snapshot, decisionFingerprint: "decision", activeConstraints: { activeHardConstraints: [], activeNonHardConstraints: [], supersessionTrace: [], diagnostics: [] }, activeRejections: { rejections: [] }, usageNeed: { commercialScenario: "UNSPECIFIED", orientation: "UNKNOWN" }, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, usagePolicies: USAGE_CARGO_POLICIES_V1 });
  return { snapshot: loaded.snapshot, technicalPool };
}
async function evaluate(state = budget(), prices?: readonly (readonly [string, number, Readonly<Record<string, unknown>>?])[]) { const base = await inputs(prices); return evaluateAffordabilityCandidatePool({ ...base, budget: state, evaluationTime: NOW, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 }); }

describe("WP6 affordability candidate pool", () => {
  it("applies current LIST prices to a hard ceiling, including equality", async () => {
    const result = await evaluate(budget(), [["within", 1_900_000], ["equal", 2_000_000], ["over", 2_100_000]]);
    expect(result.verifiedPriceEligibleCandidateIds).toEqual(["equal", "within"]); expect(result.verifiedOverBudgetCandidateIds).toEqual(["over"]);
  });
  it.each([
    ["no ceiling", budget({ maximumHardCeiling: undefined, budgetImportance: "IMPORTANT" })],
    ["available cash", budget({ maximumHardCeiling: undefined, availableCash: { amount: 1_000_000, currency: "TRY" }, budgetImportance: "IMPORTANT" })],
    ["preferred budget", budget({ maximumHardCeiling: undefined, preferredBudget: { amount: 1_500_000, currency: "TRY" }, budgetImportance: "IMPORTANT" })],
    ["finance flexibility", budget({ maximumHardCeiling: undefined, financeFlexibility: "YES", budgetImportance: "IMPORTANT" })],
    ["excluded", budget({ budgetExcluded: true })],
  ])("does not invent a hard ceiling from %s", async (_label, state) => { expect((await evaluate(state)).budgetNotAppliedEligibleCandidateIds).toEqual(["v1", "v2"]); });
  it("preserves technical eliminated and not-evaluable dispositions", async () => {
    const base = await inputs(); const candidates = base.technicalPool.candidates.map((candidate, index) => ({ ...candidate, disposition: index ? "NOT_EVALUABLE" as const : "ELIMINATED" as const }));
    const technicalPool: TechnicalCandidatePool = { ...base.technicalPool, candidates, eligibleCandidateIds: [], notEvaluableCandidateIds: [candidates[1]!.exactVariantId], eliminatedCandidateIds: [candidates[0]!.exactVariantId], counts: { initial: 2, eligible: 0, notEvaluable: 1, eliminated: 1 } };
    const result = evaluateAffordabilityCandidatePool({ snapshot: base.snapshot, technicalPool, budget: budget(), evaluationTime: NOW, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 });
    expect(result.eliminatedCandidateIds).toHaveLength(1); expect(result.technicallyNotEvaluableCandidateIds).toHaveLength(1); expect(result.verifiedPriceEligibleCandidateIds).toEqual([]);
  });
  it.each([
    ["missing", undefined, "UNKNOWN"],
    ["stale", { validUntil: "2026-08-19T23:59:59.999Z" }, "VERIFIED_STALE"],
    ["future", { validFrom: "2026-08-21T00:00:00.000Z" }, "VERIFIED_NOT_YET_VALID"],
    ["campaign", { priceType: "CAMPAIGN" }, "VERIFIED_CURRENT"],
  ] as const)("keeps %s price outside confirmed budget eligibility", async (_label, overrides, authority) => {
    const prices = overrides === undefined ? [] : [["v1", 1_500_000, overrides] as [string, number, Record<string, unknown>]];
    const result = await evaluate(budget(), prices); expect(result.priceUnresolvedCandidateIds).toEqual(overrides === undefined ? [] : ["v1"]); if (overrides !== undefined) expect(result.candidates[0]?.priceAuthority.state).toBe(authority);
  });
  it("treats validFrom and validUntil as inclusive and one millisecond later as stale", async () => {
    const atFrom = await evaluate(budget(), [["v1", 1_500_000, { validFrom: NOW }]]); expect(atFrom.verifiedPriceEligibleCandidateIds).toEqual(["v1"]);
    const atUntil = await evaluate(budget(), [["v1", 1_500_000, { validUntil: NOW }]]); expect(atUntil.verifiedPriceEligibleCandidateIds).toEqual(["v1"]);
    const base = await inputs([["v1", 1_500_000, { validUntil: NOW }]]); const after = evaluateAffordabilityCandidatePool({ ...base, budget: budget(), evaluationTime: "2026-08-20T00:00:00.001Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 }); expect(after.candidates[0]?.priceAuthority.state).toBe("VERIFIED_STALE");
  });
  it("computes minimum verified increase with 5 percent upward rounding", async () => {
    const result = await evaluate(); expect(result.budgetIncreaseGuidance[0]).toMatchObject({ status: "VERIFIED_AVAILABLE", currentCeilingTry: 2_000_000, nearestEligiblePriceTry: 2_180_000, exactIncreaseTry: 180_000, exactIncreasePercent: 9, suggestedIncreasePercent: 10, suggestedCeilingTry: 2_200_000, candidateIds: ["v2"] });
  });
  it("keeps equal minimum-price candidates in deterministic order", async () => {
    const result = await evaluate(budget(), [["v-b", 2_180_000], ["v-a", 2_180_000]]);
    expect(result.budgetIncreaseGuidance[0]).toMatchObject({ status: "VERIFIED_AVAILABLE", candidateIds: ["v-a", "v-b"] });
  });
  it("excludes unknown, stale, campaign and internal observations from minimum increase", async () => {
    for (const overrides of [{ validUntil: "2026-08-19T00:00:00.000Z" }, { priceType: "CAMPAIGN" }]) { const result = await evaluate(budget(), [["v1", 2_100_000, overrides]]); expect(result.budgetIncreaseGuidance[0]?.status).toBe("INSUFFICIENT_PRICE_AUTHORITY"); }
  });
  it("fails closed on fingerprint and candidate scope mismatch", async () => {
    const base = await inputs(); const mismatch = evaluateAffordabilityCandidatePool({ snapshot: base.snapshot, technicalPool: { ...base.technicalPool, catalogFingerprint: "different", initialCandidateIds: ["v1"] }, budget: budget(), evaluationTime: NOW, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 });
    expect(mismatch.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(["CATALOG_FINGERPRINT_MISMATCH", "CANDIDATE_SCOPE_MISMATCH"])); expect(mismatch.verifiedPriceEligibleCandidateIds).toEqual([]);
  });
  it("keeps buckets disjoint, immutable and deterministic", async () => {
    const first = await evaluate(); const second = await evaluate(); expect(first).toEqual(second); expect(Object.isFrozen(first.candidates[0])).toBe(true);
    expect(new Set([...first.verifiedPriceEligibleCandidateIds, ...first.internalEstimateWithinCandidateIds, ...first.estimatedOverBudgetConditionalCandidateIds, ...first.budgetNotAppliedEligibleCandidateIds, ...first.priceUnresolvedCandidateIds, ...first.technicallyNotEvaluableCandidateIds, ...first.verifiedOverBudgetCandidateIds, ...first.eliminatedCandidateIds]).size).toBe(first.initialCandidateIds.length);
  });
  it("re-evaluates the full technical pool when the hard ceiling is corrected", async () => {
    expect((await evaluate(budget())).verifiedOverBudgetCandidateIds).toEqual(["v2"]); expect((await evaluate(budget({ maximumHardCeiling: { amount: 5_000_000, currency: "TRY" } }))).verifiedPriceEligibleCandidateIds).toEqual(["v1", "v2"]);
  });
  it("keeps a budget range as a hard maximum plus a separate ranking band", async () => {
    const result = await evaluate(budget({ minimumBudget: { amount: 1_950_000, currency: "TRY" } }), [["below", 1_900_000], ["within", 2_000_000], ["over", 2_100_000]]);
    expect(result.verifiedPriceEligibleCandidateIds).toEqual(["below", "within"]);
    expect(result.verifiedOverBudgetCandidateIds).toEqual(["over"]);
    expect(result.candidates.find((candidate) => candidate.exactVariantId === "below")?.softSignals).toContainEqual(expect.objectContaining({ kind: "BELOW_BUDGET_RANGE", rankingScore: 1 }));
    expect(result.candidates.find((candidate) => candidate.exactVariantId === "within")?.softSignals).toContainEqual(expect.objectContaining({ kind: "WITHIN_BUDGET_RANGE", rankingScore: 4 }));
  });
  it("allows an unknown-price technical candidate when budget is excluded without an affordability claim", async () => {
    const result = await evaluate(budget({ budgetExcluded: true }), []); expect(result.budgetNotAppliedEligibleCandidateIds).toEqual([]);
    const base = await inputs([["v1", 1_000_000]]); const noPriceSnapshot = { ...base.snapshot, variants: base.snapshot.variants.map((variant) => ({ ...variant, activeNewPrice: undefined })) };
    const evaluated = evaluateAffordabilityCandidatePool({ snapshot: noPriceSnapshot, technicalPool: base.technicalPool, budget: budget({ budgetExcluded: true }), evaluationTime: NOW, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 }); expect(evaluated.budgetNotAppliedEligibleCandidateIds).toEqual(["v1"]); expect(evaluated.candidates[0]?.affordabilityClaimAllowed).toBe(false);
  });
  it("keeps a hard-ceiling candidate with no observation in the price-unverified bucket", async () => {
    const base = await inputs([["v1", 1_000_000]]); const snapshotWithoutPrice = { ...base.snapshot, variants: base.snapshot.variants.map((variant) => ({ ...variant, activeNewPrice: undefined })) };
    const result = evaluateAffordabilityCandidatePool({ snapshot: snapshotWithoutPrice, technicalPool: base.technicalPool, budget: budget(), evaluationTime: NOW, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 });
    expect(result.priceUnresolvedCandidateIds).toEqual(["v1"]); expect(result.verifiedPriceEligibleCandidateIds).toEqual([]); expect(result.candidates[0]?.priceMentionAllowed).toBe(false);
  });
  it("treats a runtime authority contradiction as invalid and fail closed", async () => {
    const base = await inputs([["v1", 1_000_000]]); const invalidSnapshot = { ...base.snapshot, variants: base.snapshot.variants.map((variant) => ({ ...variant, activeNewPrice: variant.activeNewPrice && { ...variant.activeNewPrice, realizationSafe: false } })) };
    const result = evaluateAffordabilityCandidatePool({ snapshot: invalidSnapshot, technicalPool: base.technicalPool, budget: budget(), evaluationTime: NOW, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 });
    expect(result.candidates[0]?.priceAuthority.state).toBe("INVALID"); expect(result.priceUnresolvedCandidateIds).toEqual(["v1"]);
  });
  it("keeps internal estimate-within selectable without exposing an exact price", async () => {
    const hiddenAmount = 1_873_421;
    const result = await evaluate(budget(), [["v1", hiddenAmount, { priceType: "ESTIMATE", consumerVisibility: "INTERNAL_ONLY", estimationMethod: "bounded-model-v1" }]]);
    expect(result.internalEstimateWithinCandidateIds).toEqual(["v1"]); expect(result.selectableCandidateIds).toEqual(["v1"]);
    expect(result.candidates[0]).toMatchObject({ finalDisposition: "ELIGIBLE_INTERNAL_ESTIMATE_WITHIN_BUDGET", affordabilityTier: "ESTIMATED_WITHIN_BUDGET", priceMentionAllowed: false, priceAuthority: { decisionUse: "INTERNAL_APPROXIMATE_AFFORDABILITY", realizationPermission: "APPROXIMATE_BUDGET_LANGUAGE_ONLY", estimationMethodPresent: true } });
    expect(JSON.stringify(result.candidates[0])).not.toContain(String(hiddenAmount));
    expect(projectConsumerVisiblePriceFact(result.candidates[0]!)).toEqual({ permission: "APPROXIMATE_BUDGET_LANGUAGE_ONLY", requiredLanguage: ["TAHMINEN_OR_APPROXIMATELY", "NOT_A_VERIFIED_PRICE"], exactEstimateDisclosureAllowed: false });
  });
  it("creates an exact card-price fact only for a public current LIST observation", async () => {
    const result = await evaluate(budget(), [["v1", 1_900_000]]);
    expect(projectConsumerVisiblePriceFact(result.candidates[0]!)).toEqual({ permission: "EXACT_PUBLIC_PRICE_ALLOWED", amountTry: 1_900_000, claimType: "PUBLIC_CURRENT_LIST_PRICE" });
  });
  it("fails closed for commercial list prices until KDV treatment is explicit", async () => {
    const base = await inputs([["v1", 1_900_000]]);
    const commercialFact = { value: "LIGHT_COMMERCIAL" as const, confidence: "HIGH" as const, provenance: [],
      catalogFingerprint: base.snapshot.authority.catalogFingerprint, explanationAccess: "AUTHORITY_REQUIRED" as const };
    const commercialSnapshot = { ...base.snapshot, variants: base.snapshot.variants.map((variant) => ({ ...variant,
      decisionFacts: { ...variant.decisionFacts, vehicleUseClass: commercialFact } })) };
    const unknownTax = evaluateAffordabilityCandidatePool({ snapshot: commercialSnapshot, technicalPool: base.technicalPool,
      budget: budget(), evaluationTime: NOW, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 });
    expect(unknownTax.priceUnresolvedCandidateIds).toEqual(["v1"]);
    expect(unknownTax.candidates[0]?.priceAuthority).toMatchObject({ state: "INVALID", taxTreatment: "UNKNOWN", reasonCodes: ["COMMERCIAL_PRICE_TAX_TREATMENT_UNKNOWN"], realizationPermission: "NO_PRICE_LANGUAGE" });

    const includedTaxSnapshot = { ...commercialSnapshot, variants: commercialSnapshot.variants.map((variant) => ({ ...variant,
      activeNewPrice: variant.activeNewPrice && { ...variant.activeNewPrice, taxTreatment: "INCLUDED" as const } })) };
    const includedTax = evaluateAffordabilityCandidatePool({ snapshot: includedTaxSnapshot, technicalPool: base.technicalPool,
      budget: budget(), evaluationTime: NOW, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 });
    expect(includedTax.verifiedPriceEligibleCandidateIds).toEqual(["v1"]);
    expect(includedTax.candidates[0]?.priceAuthority).toMatchObject({ taxTreatment: "INCLUDED", validFrom: "2026-08-19T00:00:00.000Z" });
  });
  it("keeps estimate-over conditional/selectable and emits only approximate bands", async () => {
    const hiddenAmount = 2_168_000;
    const result = await evaluate(budget(), [["v1", hiddenAmount, { priceType: "ESTIMATE", consumerVisibility: "INTERNAL_ONLY", estimationMethod: "bounded-model-v1" }]]);
    expect(result.estimatedOverBudgetConditionalCandidateIds).toEqual(["v1"]); expect(result.verifiedOverBudgetCandidateIds).toEqual([]); expect(result.eliminatedCandidateIds).toEqual([]); expect(result.selectableCandidateIds).toEqual(["v1"]);
    expect(result.budgetIncreaseGuidance[0]).toEqual({ status: "ESTIMATED_AVAILABLE", authority: "APPROXIMATE_INTERNAL_ESTIMATE", currentCeilingTry: 2_000_000, approximateIncreasePercentBand: { minimum: 5, maximum: 10 }, approximateSuggestedBudgetBandTry: { minimum: 2_100_000, maximum: 2_200_000 }, candidateIds: ["v1"], requiredLanguage: ["TAHMINEN_OR_APPROXIMATELY", "NOT_A_VERIFIED_PRICE"], exactEstimateDisclosureAllowed: false });
    expect(JSON.stringify(result)).not.toContain(String(hiddenAmount));
  });
  it("keeps verified and estimated increase guidance as separate authorities", async () => {
    const result = await evaluate(budget(), [["public", 2_100_000], ["estimate", 2_260_000, { priceType: "ESTIMATE", consumerVisibility: "INTERNAL_ONLY", estimationMethod: "bounded-model-v1" }]]);
    expect(result.budgetIncreaseGuidance.map((item) => item.authority)).toEqual(["VERIFIED", "APPROXIMATE_INTERNAL_ESTIMATE"]);
  });
  it("moves a conditional estimate candidate to estimated-within after budget correction", async () => {
    const prices = [["v1", 3_000_000, { priceType: "ESTIMATE", consumerVisibility: "INTERNAL_ONLY", estimationMethod: "bounded-model-v1" }]] as const;
    expect((await evaluate(budget(), prices)).estimatedOverBudgetConditionalCandidateIds).toEqual(["v1"]);
    expect((await evaluate(budget({ maximumHardCeiling: { amount: 5_000_000, currency: "TRY" } }), prices)).internalEstimateWithinCandidateIds).toEqual(["v1"]);
  });
  it("does not let budget exclusion or available cash remove an estimate candidate", async () => {
    const prices = [["v1", 3_000_000, { priceType: "ESTIMATE", consumerVisibility: "INTERNAL_ONLY", estimationMethod: "bounded-model-v1" }]] as const;
    expect((await evaluate(budget({ budgetExcluded: true }), prices)).budgetNotAppliedEligibleCandidateIds).toEqual(["v1"]);
    expect((await evaluate(budget({ maximumHardCeiling: undefined, availableCash: { amount: 1_000_000, currency: "TRY" }, budgetImportance: "IMPORTANT" }), prices)).budgetNotAppliedEligibleCandidateIds).toEqual(["v1"]);
  });
});
