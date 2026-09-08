import { describe, expect, it } from "vitest";
import { StaticLocalTestKeyProvider } from "@/lib/security/versionedKeyring.server";
import { ELECTRONICS_CATEGORY_IDS } from "../architectureBaseline";
import { ELECTRONICS_STAGE_TWO_AUTHORITY_CANDIDATE, ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS, ELECTRONICS_STAGE_TWO_CONSENT_VERSION, type ElectronicsStageTwoCurrentAuthority } from "./handoffAuthorityCandidate";
import { createElectronicsStageTwoHandoffCandidate, createLocalElectronicsStageTwoHandoffCandidate } from "./handoffAuthorityCandidate.server";

const secretA = "test-only-a".repeat(4), secretB = "test-only-b".repeat(4), baseTime = new Date("2026-09-08T08:00:00.000Z");
const trace={bridgeVersion:"electronics-stage2-decision-fingerprint-bridge/v1" as const,sourceFormat:"LEGACY_CANONICAL_HEX" as const,sourceFingerprintDigest:"sha256:"+"a".repeat(64) as `sha256:${string}`};
const decisionFingerprint=`sha256:${"c".repeat(64)}`;
const current = (overrides: Partial<ElectronicsStageTwoCurrentAuthority> = {}): ElectronicsStageTwoCurrentAuthority => ({ conversationId: "11111111-1111-4111-8111-111111111111", categoryId: "SMARTPHONE", decisionRevision: 7, decisionFingerprint, decisionFingerprintTrace:trace, exactProductId: "electronics:smartphone:exact-1", configurationIdentity: "maker|model|128gb|TR", catalogRelease: "ELECTRONICS-ALL-CATEGORY-TR-v1.0", catalogDigest: "sha256:catalog", policyVersion: "ELECTRONICS-CATEGORY-POLICY-TR-v1.0", policyDigest: "sha256:policy", consent: { schemaVersion: ELECTRONICS_STAGE_TWO_CONSENT_VERSION, eventId: "22222222-2222-4222-8222-222222222222", status: "CONSENTED", purpose: "OPEN_STAGE_TWO_EXACT_PRODUCT_EVALUATION", conversationId: "11111111-1111-4111-8111-111111111111", categoryId: "SMARTPHONE", decisionRevision: 7, decisionFingerprint, decisionFingerprintTrace:trace, exactProductId: "electronics:smartphone:exact-1", configurationIdentity: "maker|model|128gb|TR", occurredAt: "2026-09-08T07:59:30.000Z" }, ...overrides });

describe("Electronics signed Stage 2 handoff authority candidate", () => {
  it("covers all 24 categories with category-owned candidate schema digests and no activation", () => {
    expect(ELECTRONICS_STAGE_TWO_AUTHORITY_CANDIDATE.categories).toEqual(ELECTRONICS_CATEGORY_IDS);
    expect(Object.keys(ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS)).toHaveLength(24);
    for (const categoryId of ELECTRONICS_CATEGORY_IDS) expect(ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS[categoryId]).toMatchObject({ categoryId, lifecycle: "PENDING_OWNER_APPROVAL", digest: expect.stringMatching(/^sha256:/u) });
    expect(ELECTRONICS_STAGE_TWO_AUTHORITY_CANDIDATE.activation).toBe("OWNER_APPROVAL_AND_PERSISTENCE_REQUIRED");
  });

  it("binds explicit consent, exact identity, decision, evidence, category schema, time, nonce and key id", () => {
    const service = createElectronicsStageTwoHandoffCandidate({ provider: new StaticLocalTestKeyProvider([{ id: "key-a", secret: secretA, state: "ACTIVE" }]), now: () => baseTime, nonce: () => "fixed-nonce-123456789" });
    const token = service.issue(current()), verified = service.verify(token, current());
    expect(verified).toMatchObject({ status: "VALID", claims: { kid: "key-a", categoryId: "SMARTPHONE", decisionRevision: 7, exactProductId: "electronics:smartphone:exact-1", consentEventId: "22222222-2222-4222-8222-222222222222", nonce: "fixed-nonce-123456789", replayPolicy: "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY" } });
    expect(token).not.toContain(secretA);
  });

  it("rejects tamper, expiry, future consent and every current-authority mismatch", () => {
    const service = createLocalElectronicsStageTwoHandoffCandidate(secretA, "key-a", () => baseTime), token = service.issue(current());
    const tampered = `${token.slice(0, -1)}${token.endsWith("x") ? "y" : "x"}`;
    expect(service.verify(tampered, current())).toMatchObject({ status: "INVALID", reason: "BAD_SIGNATURE" });
    for (const changed of [current({ decisionRevision: 8 }), current({ exactProductId: "other" }), current({ catalogDigest: "sha256:other" }), current({ categoryId: "LAPTOP" }), current({ consent: { ...current().consent, eventId: "33333333-3333-4333-8333-333333333333" } })]) expect(service.verify(token, changed)).toMatchObject({ status: "INVALID", reason: "AUTHORITY_MISMATCH" });
    expect(createLocalElectronicsStageTwoHandoffCandidate(secretA, "key-a", () => new Date("2026-09-08T08:16:00Z")).verify(token, current())).toMatchObject({ status: "INVALID", reason: "AUTHORITY_MISMATCH" });
    expect(() => service.issue(current({ consent: { ...current().consent, occurredAt: "2026-09-08T08:01:00.000Z" } }))).toThrow("ELECTRONICS_STAGE_TWO_ISSUANCE_NOT_AUTHORIZED");
  });

  it("supports verify-only rotation and rejects a revoked prior key", () => {
    const old = createElectronicsStageTwoHandoffCandidate({ provider: new StaticLocalTestKeyProvider([{ id: "old", secret: secretA, state: "ACTIVE" }]), now: () => baseTime }), token = old.issue(current());
    const rotated = createElectronicsStageTwoHandoffCandidate({ provider: new StaticLocalTestKeyProvider([{ id: "new", secret: secretB, state: "ACTIVE" }, { id: "old", secret: secretA, state: "VERIFY_ONLY" }]), now: () => baseTime });
    expect(rotated.verify(token, current()).status).toBe("VALID");
    const revoked = createElectronicsStageTwoHandoffCandidate({ provider: new StaticLocalTestKeyProvider([{ id: "new", secret: secretB, state: "ACTIVE" }, { id: "old", secret: secretA, state: "REVOKED" }]), now: () => baseTime });
    expect(revoked.verify(token, current())).toMatchObject({ status: "INVALID", reason: "REVOKED_KEY" });
  });
});
