import { describe, expect, it } from "vitest";
import { buildSmartphonePMaterialityShadow } from "./smartphonePMaterialityShadow";

/* eslint-disable @typescript-eslint/no-explicit-any -- JSON artifact contract probes intentionally narrow at runtime. */

describe("Smartphone P materiality shadow", () => {
  const result = buildSmartphonePMaterialityShadow();
  const projection: any = result.artifacts["shadow-projection.json"];
  const matrix: any = result.artifacts["coverage-matrix.json"];

  it("covers the exact 34 products on all four axes with terminal states", () => {
    expect(matrix.rows).toHaveLength(34);
    expect(matrix.rows.every((row: any) => row.axes.length === 4)).toBe(true);
    expect(matrix.rows.flatMap((row: any) => row.axes).every((axis: any) => ["KNOWN", "UNKNOWN", "CONFLICTED", "NOT_APPLICABLE"].includes(axis.terminal))).toBe(true);
  });

  it("asks only material questions with two known partitions and neutral UNKNOWN", () => {
    const asked = projection.proposals.filter((p: any) => p.status === "ASK");
    expect(asked.length).toBeGreaterThan(0);
    for (const question of asked) {
      expect(Object.keys(question.knownPartitionCounts).length).toBeGreaterThanOrEqual(2);
      expect(question.candidateEffectByAnswer.YES.some((x: any) => x.effect === "KNOWN_EXCLUDE")).toBe(true);
      expect(question.candidateEffectByAnswer.YES.some((x: any) => x.effect === "KNOWN_RETAIN")).toBe(true);
      expect(question.candidateEffectByAnswer.UNKNOWN.every((x: any) => ["SOFT_ONLY_NONE", "UNKNOWN_RETAIN"].includes(x.effect))).toBe(true);
      expect(question.textTr).not.toMatch(/ne kadar önemli/i);
    }
  });

  it("suppresses predominantly unknown support and encodes correction semantics", () => {
    expect(projection.proposals.find((p: any) => p.axis === "SUPPORT_LONGEVITY").suppressReasons).toContain("PREDOMINANTLY_UNKNOWN");
    const comparison: any = result.artifacts["current-vs-shadow-transcript.json"];
    expect(comparison.fixtures).toMatchObject({ correction: ["YES", "CORRECTED:NO"], clear: ["YES", "CLEARED"] });
  });

  it("is byte deterministic and proves production no-effect", () => {
    expect(buildSmartphonePMaterialityShadow().serialized).toEqual(result.serialized);
    const proof: any = result.artifacts["no-effect-proof.json"];
    expect(proof.current.totalProducts).toBe(121);
    expect(proof.current.smartphoneProducts).toBe(34);
    expect(proof.current.categoryCounts.HEADPHONES).toBe(18);
    expect(proof.assertions.productionFilesWritten).toBe(false);
    expect(Object.entries(proof.assertions).filter(([key]) => key !== "productionFilesWritten").every(([, value]) => value === true)).toBe(true);
  });
});
