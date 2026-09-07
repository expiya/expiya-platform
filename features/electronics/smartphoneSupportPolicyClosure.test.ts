import { describe, expect, it } from "vitest";
import { buildSmartphoneSupportPolicyClosure } from "./smartphoneSupportPolicyClosure";

/* eslint-disable @typescript-eslint/no-explicit-any -- generated JSON contract probes */
describe("Smartphone support public-authority closure", () => {
  const result = buildSmartphoneSupportPolicyClosure();
  it("closes exactly six identities as terminal UNKNOWN", () => {
    const ledger: any = result.artifacts["exact-six-terminal-ledger.json"];
    expect(ledger.rows).toHaveLength(6);
    expect(ledger.rows.every((r: any) => r.terminalReason === "NO_PUBLIC_MODEL_CODED_LIFECYCLE_AUTHORITY_FOUND" && r.unknownEffect === "UNKNOWN_RETAIN")).toBe(true);
  });
  it("does not reinterpret cadence or an end date as duration", () => {
    const preview: any = result.artifacts["duration-materiality-preview.json"];
    expect(preview.partitionableKnown).toBe(16);
    expect(preview.durationUnknown).toBe(18);
    expect(preview.outcome).toBe("SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN");
    expect(preview.candidateEffectByAnswer.UNKNOWN.every((x: any) => ["UNKNOWN_RETAIN", "SOFT_ONLY_NONE"].includes(x.effect))).toBe(true);
  });
  it("preserves final 28/6/0 coverage and runtime no-effect", () => {
    const coverage: any = result.artifacts["final-coverage.json"];
    expect(coverage.counts).toEqual({ KNOWN: 28, UNKNOWN: 6, CONFLICTED: 0, NOT_APPLICABLE: 0 });
    const proof: any = result.artifacts["no-effect-proof.json"];
    expect(proof.runtimeMembershipOrderFingerprintMutation).toBe(false);
    expect(proof.pointerAuthorizationUiDbMutation).toBe(false);
  });
  it("generates byte-identically", () => expect(buildSmartphoneSupportPolicyClosure().serialized).toEqual(result.serialized));
});
