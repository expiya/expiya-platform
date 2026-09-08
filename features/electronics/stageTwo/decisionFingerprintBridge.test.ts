import { describe, expect, it } from "vitest";
import { electronicsDecisionFingerprint } from "../decision";
import type { ElectronicsConversationState, ElectronicsDecisionCard } from "../runtimeContracts";
import { resolveElectronicsStageTwoDecisionFingerprint } from "./decisionFingerprintBridge";

const sha = (letter: string) => `sha256:${letter.repeat(64)}`;
function state(overrides: Partial<ElectronicsConversationState> = {}, cardOverrides: Partial<ElectronicsDecisionCard> = {}): ElectronicsConversationState {
  const core = {
    exactProductId: "reader-1", categoryId: "E_READER" as const, manufacturer: "Maker", modelCode: "R1",
    configurationIdentity: "Maker|R1|TR", rationale: [], technicalEvidence: [{ label: "DISPLAY", value: "7in" }],
    dailyLifeInterpretation: [], authority: { policyDigest: sha("b"), catalogReleaseDigest: sha("a"), contextRevision: 3 },
  };
  const card = { ...core, authorizationFingerprint: electronicsDecisionFingerprint(core), ...cardOverrides };
  return { conversationId: "11111111-1111-4111-8111-111111111111", schemaVersion: "electronics-conversation/v1", revision: 3,
    departmentId: "ELECTRONICS", categoryId: "E_READER", pinnedCatalogRelease: "release", pinnedCatalogDigest: sha("a"),
    pinnedPolicyVersion: "policy", pinnedPolicyDigest: sha("b"), ledger: [], askedQuestionKeys: [], personaSignals: [],
    decisionRecord: card, ended: false, createdAt: "2026-09-08T00:00:00.000Z", updatedAt: "2026-09-08T00:00:00.000Z", ...overrides };
}

describe("Electronics legacy decision fingerprint bridge", () => {
  it("derives a domain-separated Stage Two fingerprint from a canonically verified legacy card", () => {
    const source = state(), result = resolveElectronicsStageTwoDecisionFingerprint(source, source.decisionRecord!.authorizationFingerprint)!;
    expect(result.fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(result.fingerprint).not.toBe(`sha256:${source.decisionRecord!.authorizationFingerprint}`);
    expect(result.trace).toMatchObject({ sourceFormat: "LEGACY_CANONICAL_HEX", bridgeVersion: "electronics-stage2-decision-fingerprint-bridge/v1" });
    expect(resolveElectronicsStageTwoDecisionFingerprint(source, result.fingerprint)).toEqual(result);
  });

  it("preserves a canonically verified native prefixed fingerprint", () => {
    const legacy = state(), prefixed = `sha256:${legacy.decisionRecord!.authorizationFingerprint}`;
    const source = state({}, { authorizationFingerprint: prefixed });
    expect(resolveElectronicsStageTwoDecisionFingerprint(source, prefixed)).toMatchObject({ fingerprint: prefixed, trace: { sourceFormat: "NATIVE_SHA256_PREFIXED" } });
  });

  it("rejects arbitrary, tampered, and authority-mismatched legacy values", () => {
    const valid = state(), raw = valid.decisionRecord!.authorizationFingerprint;
    expect(resolveElectronicsStageTwoDecisionFingerprint(valid, "f".repeat(64))).toBeNull();
    expect(resolveElectronicsStageTwoDecisionFingerprint(state({}, { modelCode: "tampered" }), raw)).toBeNull();
    expect(resolveElectronicsStageTwoDecisionFingerprint(state({ conversationId: "22222222-2222-4222-8222-222222222222" }), raw)!.fingerprint)
      .not.toBe(resolveElectronicsStageTwoDecisionFingerprint(valid, raw)!.fingerprint);
    expect(resolveElectronicsStageTwoDecisionFingerprint(state({ categoryId: "LAPTOP" }), raw)).toBeNull();
    expect(resolveElectronicsStageTwoDecisionFingerprint(state({ revision: 4 }), raw)).toBeNull();
    expect(resolveElectronicsStageTwoDecisionFingerprint(state({ pinnedPolicyDigest: sha("c") }), raw)).toBeNull();
  });
});
