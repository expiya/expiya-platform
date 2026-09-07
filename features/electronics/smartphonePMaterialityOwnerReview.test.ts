import { describe, expect, it } from "vitest";
import { buildSmartphonePMaterialityOwnerReview } from "./smartphonePMaterialityOwnerReview";

/* eslint-disable @typescript-eslint/no-explicit-any -- generated JSON contract probes */
describe("Smartphone P materiality owner review", () => {
  const result = buildSmartphonePMaterialityOwnerReview();
  const candidate: any = result.artifacts["owner-review-candidate.json"];
  it("contains only the three proven material axes", () => {
    expect(candidate.questions.map((q: any) => q.axis)).toEqual(["TURKIYE_NETWORK_APPLICABILITY", "CAMERA_USE_CASE", "BATTERY_CHARGING_ROUTINE"]);
    expect(candidate.questions.every((q: any) => !/ne kadar önemli/i.test(q.textTr))).toBe(true);
  });
  it("excludes support and keeps UNKNOWN neutral per answer", () => {
    expect(candidate.excluded.supportLongevity).toEqual({ status: "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN", durationKnown: 16, durationUnknown: 18 });
    for (const question of candidate.questions) expect(question.candidateEffectByAnswer.UNKNOWN.every((x: any) => ["UNKNOWN_RETAIN", "SOFT_ONLY_NONE"].includes(x.effect))).toBe(true);
  });
  it("is owner-review eligible but not Y-ready or active", () => {
    const readiness: any = result.artifacts["readiness-report.json"];
    expect(readiness).toMatchObject({ INFORMATION_READY: true, P_READY: true, Y_READY: false, ownerReviewEligibility: "PASS" });
    expect(candidate.runtimeActive).toBe(false);
    expect(candidate.defaultEnabled).toBe(false);
  });
  it("is deterministic and proves no production effect", () => {
    expect(buildSmartphonePMaterialityOwnerReview().serialized).toEqual(result.serialized);
    const proof: any = result.artifacts["no-effect-proof.json"];
    expect(proof.activePointerMutation).toBe(false);
    expect(proof.runtimeMutation).toBe(false);
  });
});
