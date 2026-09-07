import { describe, expect, it } from "vitest";
import { buildSmartphoneSupportPolicyBackfill } from "./smartphoneSupportPolicyBackfill";

/* eslint-disable @typescript-eslint/no-explicit-any -- generated JSON contract probes */
describe("Smartphone support policy evidence backfill", () => {
  const result = buildSmartphoneSupportPolicyBackfill();
  const matrix: any = result.artifacts["support-coverage-matrix.json"];
  it("terminates all 34 exact products without silent drops", () => {
    expect(matrix.rows).toHaveLength(34);
    expect(matrix.noSilentDrop).toBe(true);
    expect(matrix.rows.every((r: any) => ["KNOWN", "UNKNOWN", "CONFLICTED", "NOT_APPLICABLE"].includes(r.terminal))).toBe(true);
  });
  it("keeps unsupported global marketing claims unknown", () => {
    expect(matrix.rows.filter((r: any) => r.exactProductId.includes(":tecno:")).every((r: any) => r.terminal === "UNKNOWN" && r.candidateFacts.length === 0)).toBe(true);
  });
  it("keeps distinct support fact types without conversions", () => {
    const report: any = result.artifacts["before-after-report.json"];
    expect(report.before).toEqual({ KNOWN: 10, UNKNOWN: 24, CONFLICTED: 0, NOT_APPLICABLE: 0 });
    expect(report.after).toEqual({ KNOWN: 28, UNKNOWN: 6, CONFLICTED: 0, NOT_APPLICABLE: 0 });
    expect(report.typedFactDiscipline).toHaveLength(4);
  });
  it("is deterministic and runtime-neutral", () => {
    expect(buildSmartphoneSupportPolicyBackfill().serialized).toEqual(result.serialized);
    const proof: any = result.artifacts["no-effect-proof.json"];
    expect(proof.runtimeMutation).toBe(false);
    expect(proof.rankingMembershipOrderCardAuthorizationUiDbEffect).toBe("NONE");
  });
});
