import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority } from "../authority/loader.server";
import { validateWashingMachineCandidateSelectionPolicyDraft, washingMachineCandidateSelectionPolicyDraftSchema } from "./candidateSelectionPolicyDraft";

const file = new URL("../../../data/governance/appliances/candidate-selection-policy/drafts/WASHING_MACHINE_CANDIDATE_SELECTION_POLICY-v0.1.json", import.meta.url);
const draft = JSON.parse(readFileSync(file, "utf8")) as unknown;
async function authoritySets() {
  const loaded = await loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(process.cwd()) });
  if (loaded.status !== "READY") throw new Error(loaded.reason);
  const catalog = loaded.snapshot.catalog;
  return { concepts: loaded.snapshot.conceptIds, facts: new Set(catalog.factKeyRegistry as string[]), capabilities: new Set(catalog.capabilityRegistry as string[]) };
}

describe("Washing Machine Candidate Selection Policy governance draft", () => {
  it("is review-ready but non-active and contains no runtime authorization", () => {
    const parsed = washingMachineCandidateSelectionPolicyDraftSchema.parse(draft);
    expect(parsed).toMatchObject({ governanceStatus: "READY_FOR_APPROVAL", lifecycle: "DRAFT", runtimeActive: false });
    expect(parsed.scope).toEqual({ runtimeRanker: "OUT_OF_SCOPE", recommendationConstruction: "OUT_OF_SCOPE", decisionAuthorization: "OUT_OF_SCOPE", activePointer: "ABSENT", frozenRelease: "ABSENT" });
    expect(parsed.outputContract).toMatchObject({ authorizesDecisionReady: false, authorizesDecisionAuthorization: false, authorizesDecisionCard: false, authorizesCommerce: false });
  });

  it("validates governed concepts, evidence identifiers, bindings, rules and scenarios", async () => {
    const sets = await authoritySets();
    expect(validateWashingMachineCandidateSelectionPolicyDraft(draft, sets.concepts, sets.facts, sets.capabilities)).toEqual({ status: "VALID_DRAFT" });
  });

  it("uses unweighted Pareto dominance and preserves honest ambiguity", () => {
    const parsed = washingMachineCandidateSelectionPolicyDraftSchema.parse(draft);
    expect(parsed.model).toMatchObject({ kind: "RULE_BASED_PARETO_DOMINANCE", globalWeights: "NONE", contextualWeights: "NONE", totalOrderGuaranteed: false });
    expect(parsed.outcomes.map((outcome) => outcome.kind)).toEqual(["SELECTED_SINGLE", "TIED_TOP_SET", "NON_DOMINATED_SET", "NO_GOVERNED_SELECTION", "FAILED_CLOSED"]);
    expect(parsed.ties.singleWinnerRequired).toBe(false);
    expect(parsed.inputPolicy.canonicalOrderEffect).toBe("NONE");
  });

  it("limits active semantics to wanted remote control, wanted auto dosing and important low noise", () => {
    const parsed = washingMachineCandidateSelectionPolicyDraftSchema.parse(draft);
    expect(parsed.rules.filter((rule) => rule.selectionRole === "ACTIVE").map((rule) => [rule.conceptId, rule.activeValue])).toEqual([
      ["REMOTE_CONTROL", "WANTED"], ["DETERGENT_CONVENIENCE", "WANTED"], ["LOW_NOISE_PRIORITY", "IMPORTANT"],
    ]);
    expect(parsed.rules.filter((rule) => rule.activeValue === "NOT_IMPORTANT").every((rule) => rule.comparison.includes("no reverse preference"))).toBe(true);
  });

  it("keeps price, rationale, persona, affiliate and arbitrary order out of selection", () => {
    const parsed = washingMachineCandidateSelectionPolicyDraftSchema.parse(draft);
    expect(parsed.pricePolicy).toMatchObject({ postEligibilityRole: "DISCLOSURE_ONLY", lowerPricePreference: "NOT_AUTHORIZED", affiliateEffect: "NONE" });
    expect(parsed.rationaleBoundary).toMatchObject({ effect: "EXPLANATION_ONLY", countEffect: "NONE" });
    expect(parsed.persona).toMatchObject({ decisionUse: "NONE", selectionEffect: "NONE", rankingEffect: "NONE" });
    expect(parsed.ties.forbiddenTieBreaks).toEqual(expect.arrayContaining(["catalog order", "product ID order", "alphabetical brand", "lowest price", "most evidence", "most rationale records", "affiliate payout"]));
  });

  it("covers all sixteen required governance scenarios", () => {
    const parsed = washingMachineCandidateSelectionPolicyDraftSchema.parse(draft);
    expect(parsed.scenarios.map((scenario) => scenario.scenarioId)).toEqual(Array.from({ length: 16 }, (_, index) => `S-${String(index + 1).padStart(2, "0")}`));
  });

  it("fails duplicate rules, unknown evidence, unauthorized weights, persona influence and unresolved decisions", async () => {
    const sets = await authoritySets();
    const parsed = washingMachineCandidateSelectionPolicyDraftSchema.parse(draft);
    const rules = parsed.rules.map((rule, index) => index === 1 ? { ...rule, ruleId: parsed.rules[0].ruleId, evidence: ["FACT:NOT_A_FACT"] } : rule);
    const result = validateWashingMachineCandidateSelectionPolicyDraft({ ...parsed, rules, model: { ...parsed.model, globalWeights: "FIXED" }, persona: { ...parsed.persona, selectionEffect: "SOME" }, productDecisionRegister: parsed.productDecisionRegister.map((decision, index) => index === 0 ? { ...decision, governanceClassification: "UNRESOLVED_PRODUCT_DECISION" } : decision) }, sets.concepts, sets.facts, sets.capabilities);
    expect(result.status).toBe("INVALID_DRAFT");
    if (result.status === "INVALID_DRAFT") expect(result.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/^SCHEMA:/u)]));
  });
});
