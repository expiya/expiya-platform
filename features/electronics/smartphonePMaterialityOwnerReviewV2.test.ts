import { describe, expect, it } from "vitest";
import { buildSmartphonePMaterialityOwnerReviewV2 } from "./smartphonePMaterialityOwnerReviewV2";

/* eslint-disable @typescript-eslint/no-explicit-any -- generated contract probes */
describe("Smartphone owner review Semantic Decision Projection v2", () => {
  const result = buildSmartphonePMaterialityOwnerReviewV2();
  it("materializes only three exact projections", () => {
    const artifact: any = result.artifacts["semantic-projections-v2.json"];
    expect(artifact.projections).toHaveLength(3);
    expect(artifact.projections.every((p: any) => p.schemaVersion === "SemanticDecisionProjection/v2" && p.offerings.length === 34)).toBe(true);
  });
  it("keeps UNKNOWN neutral and every asked question non-zero", () => {
    const artifact: any = result.artifacts["semantic-projections-v2.json"];
    for (const projection of artifact.projections) {
      expect(projection.materialQuestion.candidateEffectByAnswer.UNKNOWN.every((x: any) => ["unknownRetain", "none"].includes(x.effect))).toBe(true);
      expect(projection.materialQuestion.candidateEffectByAnswer.YES.some((x: any) => x.effect === "knownExclude")).toBe(true);
    }
  });
  it("is information/P ready but never Y ready", () => {
    const readiness: any = result.artifacts["catalog-factory-readiness-v2.json"];
    expect(readiness.levels.INFORMATION_READY.ready).toBe(true);
    expect(readiness.levels.P_READY.ready).toBe(true);
    expect(readiness.levels.Y_READY.ready).toBe(false);
    expect(readiness.levels.Y_READY.blockingGateIds).toContain("pointer-manifest-approval-consistency");
  });
  it("pins support suppression and is byte deterministic", () => {
    expect(result.artifacts["support-duration-suppression.json"]).toEqual({ status: "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN", known: 16, unknown: 18, candidateEffect: "NONE", runtimeEffect: "NONE" });
    expect(buildSmartphonePMaterialityOwnerReviewV2().serialized).toEqual(result.serialized);
  });
});
