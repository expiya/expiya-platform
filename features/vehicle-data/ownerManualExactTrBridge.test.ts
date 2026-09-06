import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = <T>(name: string): T => JSON.parse(readFileSync(`data/research/owner-manual-evidence-v4/${name}`, "utf8")) as T;
const checksum = (name: string) => createHash("sha256").update(readFileSync(`data/research/owner-manual-evidence-v4/${name}`)).digest("hex");

describe("Owner Manual Evidence V4 exact Turkey bridge", () => {
  it("covers all exact variants and fails closed outside verified TR evidence", () => {
    const output = read<{ catalogFingerprint: string; variants: Array<{ exactVariantId: string; decisions: Array<{ decision: string; polarity: string; source: null | { artifactSha256: string; locator: { value: string } }; familyInheritance: boolean; conditionalPromotedToStandard: boolean; missingMentionTreatedAsNegative: boolean }> }> }>("exact-tr-bridge-decisions.json");
    expect(output.catalogFingerprint).toBe("sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9");
    expect(output.variants).toHaveLength(549);
    expect(new Set(output.variants.map((variant) => variant.exactVariantId)).size).toBe(549);
    const decisions = output.variants.flatMap((variant) => variant.decisions);
    expect(decisions.every((decision) => !decision.familyInheritance && !decision.conditionalPromotedToStandard && !decision.missingMentionTreatedAsNegative)).toBe(true);
    expect(decisions.filter((decision) => decision.decision === "EXACT_VARIANT_VERIFIED").every((decision) => decision.source !== null && /^sha256:[a-f0-9]{64}$/u.test(decision.source.artifactSha256) && decision.source.locator.value.length > 0)).toBe(true);
    expect(decisions.filter((decision) => decision.decision === "RESEARCHED_INCONCLUSIVE").every((decision) => decision.polarity === "UNRESOLVED" && decision.source === null)).toBe(true);
  });

  it("keeps model-year/trim and conflict counts fail-closed", () => {
    const report = read<{ counts: { modelYearTrimApplicabilityDecisions: number; conflicts: number } }>("exact-tr-bridge-report.json");
    expect(report.counts.modelYearTrimApplicabilityDecisions).toBe(0);
    expect(report.counts.conflicts).toBe(0);
  });

  it("regenerates byte-identically", () => {
    const files = ["exact-tr-bridge-decisions.json", "exact-tr-bridge-report.json", "exact-tr-bridge-manifest.json"];
    const before = files.map(checksum);
    execFileSync(process.execPath, ["--import", "tsx", "scripts/generate-owner-manual-exact-tr-bridge-v4.ts"], { cwd: process.cwd() });
    expect(files.map(checksum)).toEqual(before);
  });
});
