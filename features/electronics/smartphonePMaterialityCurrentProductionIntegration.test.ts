import { describe, expect, it } from "vitest";
import { buildSmartphonePMaterialityCurrentProductionIntegration } from "./smartphonePMaterialityCurrentProductionIntegration";

/* eslint-disable @typescript-eslint/no-explicit-any -- immutable artifact contract probes */
describe("Smartphone P current production integration candidate", () => {
  const result = buildSmartphonePMaterialityCurrentProductionIntegration();
  it("binds current production counts and preserves root lineages", () => {
    const candidate: any = result.artifacts["integration-candidate.json"];
    expect(candidate.counts).toEqual({ electronics: 121, smartphone: 34, catalogFactory: 105, secretaryPrompts: 162 });
    const lineage: any = result.artifacts["lineage-preservation.json"];
    expect(Object.values(lineage.lineages).every((value) => value === "PRESERVED" || value === true)).toBe(true);
  });
  it("executes all three questions with real candidate effect and neutral UNKNOWN", () => {
    const acceptance: any = result.artifacts["flag-on-shadow-acceptance.json"];
    expect(acceptance.previews).toHaveLength(3);
    expect(acceptance.previews.every((preview: any) => preview.outcome === "ASK_ONE_QUESTION")).toBe(true);
    expect(acceptance.answerAcceptance.filter((entry: any) => entry.answerId === "YES").every((entry: any) => entry.excludedCandidateIds.length > 0)).toBe(true);
    expect(acceptance.assertions).toMatchObject({ everyQuestionMaterial: true, candidatePoolUnchanged: true, unknownNeutral: true, noFalseWinner: true, productionMutation: false });
  });
  it("separates P and Y readiness and remains default-off", () => {
    const readiness: any = result.artifacts["readiness.json"];
    expect(readiness).toMatchObject({ INFORMATION_READY: true, P_READY: true, Y_READY: false, activationAuthorized: false, deploymentAuthorized: false });
    expect((result.artifacts["integration-candidate.json"] as any).featureFlag.defaultEnabled).toBe(false);
  });
  it("is byte deterministic and mutation-free", () => {
    expect(buildSmartphonePMaterialityCurrentProductionIntegration().serialized).toEqual(result.serialized);
    const proof: any = result.artifacts["no-effect-proof.json"];
    expect(Object.values(proof.mutations).every((value) => value === false)).toBe(true);
  });
});
