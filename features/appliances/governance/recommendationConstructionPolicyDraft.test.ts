import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority } from "../authority/loader.server";
import { validateWashingMachineRecommendationConstructionPolicyDraft, washingMachineRecommendationConstructionPolicyDraftSchema } from "./recommendationConstructionPolicyDraft";

const draftFile = new URL("../../../data/governance/appliances/recommendation-construction-policy/drafts/WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY-v0.1.json", import.meta.url);
const draft = JSON.parse(readFileSync(draftFile, "utf8")) as unknown;
type Json = Record<string, unknown>;

async function authoritySets() {
  const loaded = await loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(process.cwd()) });
  if (loaded.status !== "READY") throw new Error(loaded.reason);
  const catalog = loaded.snapshot.catalog as Json;
  const semanticRefs = new Set<string>();
  const collect = (value: unknown): void => {
    if (typeof value === "string" && value.startsWith("semantic:")) semanticRefs.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value as Json).forEach(collect);
  };
  collect(loaded.snapshot.semanticRegistry);
  collect(catalog);
  return {
    productIds: loaded.snapshot.productIds,
    factIds: new Set((catalog.technicalFacts as Json[]).map((item) => String(item.factId))),
    capabilityFactIds: new Set((catalog.capabilityFacts as Json[]).map((item) => String(item.capabilityFactId))),
    rationaleIds: new Set((catalog.rationaleBindings as Json[]).map((item) => String(item.rationaleId))),
    disclosureIds: new Set((catalog.disclosures as Json[]).map((item) => String(item.disclosureId))),
    semanticRefs,
  };
}

describe("Washing Machine Recommendation Construction Policy governance draft", () => {
  it("is review-ready, non-active, and cannot authorize downstream decisions", () => {
    const parsed = washingMachineRecommendationConstructionPolicyDraftSchema.parse(draft);
    expect(parsed).toMatchObject({ governanceStatus: "READY_FOR_APPROVAL", lifecycle: "DRAFT", runtimeActive: false });
    expect(parsed.scope).toEqual({ recommendationRuntime: "OUT_OF_SCOPE", activePointer: "ABSENT", frozenRelease: "ABSENT", decisionAuthorization: "OUT_OF_SCOPE", decisionCard: "OUT_OF_SCOPE", advisor: "OUT_OF_SCOPE", commerce: "OUT_OF_SCOPE" });
    expect(parsed.decisionAuthorizationBoundary).toMatchObject({ authorizesDecisionReady: false, authorizesDecisionAuthorization: false, authorizesDecisionCard: false, authorizationSufficiencyDefinedHere: false });
  });

  it("validates against the active catalog and semantic authority", async () => {
    expect(validateWashingMachineRecommendationConstructionPolicyDraft(draft, await authoritySets())).toEqual({ status: "VALID_DRAFT" });
  });

  it("handles all five selector outcomes without collapsing sets to a winner", () => {
    const parsed = washingMachineRecommendationConstructionPolicyDraftSchema.parse(draft);
    expect(parsed.outcomePolicy.map((item) => item.selectionOutcome)).toEqual(["SELECTED_SINGLE", "TIED_TOP_SET", "NON_DOMINATED_SET", "NO_GOVERNED_SELECTION", "FAILED_CLOSED"]);
    expect(parsed.outcomePolicy.filter((item) => item.singleProductAllowed).map((item) => item.selectionOutcome)).toEqual(["SELECTED_SINGLE"]);
    expect(parsed.scenarios).toHaveLength(17);
  });

  it("separates technical evidence, capability, interpretation, relevance, and limitation", () => {
    const parsed = washingMachineRecommendationConstructionPolicyDraftSchema.parse(draft);
    expect(parsed.rationaleContract.technicalInterpretationSeparation.fields).toEqual(["technicalEvidenceStatement", "capabilityStatement", "authorizedDailyLifeInterpretation", "userContextRelevance", "limitationOrDisclosure"]);
    expect(parsed.rationaleContract).toMatchObject({ rationaleEligibilityEffect: "NONE", mismatchEffect: "FAILED_CLOSED" });
  });

  it("governs disclosures, volatile prices, persona, affiliate data, and model realization", () => {
    const parsed = washingMachineRecommendationConstructionPolicyDraftSchema.parse(draft);
    expect(parsed.disclosurePolicy.categories).toEqual(expect.arrayContaining(["PRICE_COVERAGE_LIMITED", "EVIDENCE_UNKNOWN", "EVIDENCE_CONFLICTED", "EVIDENCE_NON_COMPARABLE", "TIED_SELECTION", "NON_DOMINATED_TRADE_OFF", "NO_GOVERNED_SELECTION"]));
    expect(parsed.pricePolicy).toMatchObject({ permanentTruth: false, technicalFact: false, sellerEffect: "NONE", affiliateEffect: "NONE" });
    expect(parsed.persona).toEqual({ rationaleAuthority: "NONE", contentEffect: "NONE", orderingEffect: "NONE" });
    expect(parsed.realizationPolicy).toMatchObject({ authoritativeLayer: "STRUCTURED_ARTIFACT", fallback: "DETERMINISTIC_TEMPLATES_OR_NO_PROSE", violationEffect: "NO_PLAUSIBLE_RECOMMENDATION_PROSE" });
  });

  it("rejects duplicate IDs, incomplete outcomes, unauthorized single entry, and unresolved decisions", async () => {
    const parsed = washingMachineRecommendationConstructionPolicyDraftSchema.parse(draft);
    const invalid = {
      ...parsed,
      outcomePolicy: parsed.outcomePolicy.map((item, index) => index === 1 ? { ...item, selectionOutcome: "SELECTED_SINGLE" as const, singleProductAllowed: true } : item),
      traceabilityMatrix: parsed.traceabilityMatrix.map((item, index) => index === 1 ? { ...item, ruleId: parsed.traceabilityMatrix[0]!.ruleId } : item),
      productDecisionRegister: parsed.productDecisionRegister.map((item, index) => index === 0 ? { ...item, governanceClassification: "UNRESOLVED_PRODUCT_DECISION" as const } : item),
    };
    const result = validateWashingMachineRecommendationConstructionPolicyDraft(invalid, await authoritySets());
    expect(result.status).toBe("INVALID_DRAFT");
    if (result.status === "INVALID_DRAFT") expect(result.reasons).toEqual(expect.arrayContaining(["DUPLICATE_RULE_ID", "INCOMPLETE_OUTCOME_HANDLING", "MATERIAL_DECISION_UNRESOLVED"]));
  });

  it("rejects any Decision Authorization leakage at schema boundary", async () => {
    const parsed = washingMachineRecommendationConstructionPolicyDraftSchema.parse(draft);
    const result = validateWashingMachineRecommendationConstructionPolicyDraft({ ...parsed, decisionAuthorizationBoundary: { ...parsed.decisionAuthorizationBoundary, authorizesDecisionAuthorization: true } }, await authoritySets());
    expect(result).toMatchObject({ status: "INVALID_DRAFT" });
    if (result.status === "INVALID_DRAFT") expect(result.reasons).toContain("SCHEMA:decisionAuthorizationBoundary.authorizesDecisionAuthorization");
  });
});
