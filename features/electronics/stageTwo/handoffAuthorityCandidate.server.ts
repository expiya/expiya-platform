import "server-only";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { StaticLocalTestKeyProvider, VersionedHmacKeyring, type KeyAuditSink, type SigningKeyProvider } from "@/lib/security/versionedKeyring.server";
import { ELECTRONICS_CATEGORY_IDS } from "../architectureBaseline";
import { ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS, ELECTRONICS_STAGE_TWO_HANDOFF_VERSION, ELECTRONICS_STAGE_TWO_REPLAY_POLICY, type ElectronicsStageTwoCurrentAuthority, type ElectronicsStageTwoHandoffClaims, validateElectronicsStageTwoBinding } from "./handoffAuthorityCandidate";

const claimsSchema = z.strictObject({ version: z.literal(ELECTRONICS_STAGE_TWO_HANDOFF_VERSION), kid: z.string().min(1).max(80), purpose: z.literal("ASAMA2_VIEW"), departmentId: z.literal("ELECTRONICS"), categoryId: z.enum(ELECTRONICS_CATEGORY_IDS), conversationId: z.string().uuid(), decisionRevision: z.number().int().positive(), decisionFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/u), decisionFingerprintTrace:z.strictObject({bridgeVersion:z.literal("electronics-stage2-decision-fingerprint-bridge/v1"),sourceFormat:z.enum(["NATIVE_SHA256_PREFIXED","LEGACY_CANONICAL_HEX"]),sourceFingerprintDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/u)}), exactProductId: z.string().min(1).max(400), configurationIdentity: z.string().min(1).max(700), catalogRelease: z.string().min(1).max(200), catalogDigest: z.string().min(1).max(200), policyVersion: z.string().min(1).max(200), policyDigest: z.string().min(1).max(200), consentEventId: z.string().uuid(), consentOccurredAt: z.string().datetime(), comparisonSchemaVersion: z.literal("electronics-stage2-comparison-schema/v1-candidate"), comparisonSchemaDigest: z.string().min(1).max(200), issuedAt: z.number().int().nonnegative(), expiresAt: z.number().int().positive(), nonce: z.string().min(16).max(100), replayPolicy: z.literal(ELECTRONICS_STAGE_TWO_REPLAY_POLICY) });

export type ElectronicsStageTwoVerification = { readonly status: "VALID"; readonly claims: ElectronicsStageTwoHandoffClaims } | { readonly status: "INVALID"; readonly reason: "MALFORMED" | "UNKNOWN_KEY" | "REVOKED_KEY" | "BAD_SIGNATURE" | "AUTHORITY_MISMATCH" };

export function createElectronicsStageTwoHandoffCandidate(input: { readonly provider: SigningKeyProvider; readonly ttlSeconds?: number; readonly now?: () => Date; readonly nonce?: () => string; readonly audit?: KeyAuditSink }) {
  const ttlSeconds = input.ttlSeconds ?? 15 * 60, now = input.now ?? (() => new Date()), keyring = new VersionedHmacKeyring(input.provider, input.audit);
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) throw new TypeError("ELECTRONICS_STAGE_TWO_TTL_INVALID");
  const readiness = keyring.readiness(); if (!readiness.ready) throw new TypeError(readiness.reason);
  const encode = (value: string) => Buffer.from(value).toString("base64url");
  return {
    issue(current: ElectronicsStageTwoCurrentAuthority): string {
      const issuedAt = Math.floor(now().getTime() / 1000), schema = ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS[current.categoryId];
      const unsigned = { version: ELECTRONICS_STAGE_TWO_HANDOFF_VERSION, kid: readiness.activeKeyId, purpose: "ASAMA2_VIEW" as const, departmentId: "ELECTRONICS" as const, categoryId: current.categoryId, conversationId: current.conversationId, decisionRevision: current.decisionRevision, decisionFingerprint: current.decisionFingerprint, decisionFingerprintTrace: current.decisionFingerprintTrace, exactProductId: current.exactProductId, configurationIdentity: current.configurationIdentity, catalogRelease: current.catalogRelease, catalogDigest: current.catalogDigest, policyVersion: current.policyVersion, policyDigest: current.policyDigest, consentEventId: current.consent.eventId, consentOccurredAt: current.consent.occurredAt, comparisonSchemaVersion: schema.schemaVersion, comparisonSchemaDigest: schema.digest, issuedAt, expiresAt: issuedAt + ttlSeconds, nonce: input.nonce?.() ?? randomBytes(18).toString("base64url"), replayPolicy: ELECTRONICS_STAGE_TWO_REPLAY_POLICY } satisfies ElectronicsStageTwoHandoffClaims;
      if (validateElectronicsStageTwoBinding(unsigned, current, now()).length) throw new TypeError("ELECTRONICS_STAGE_TWO_ISSUANCE_NOT_AUTHORIZED");
      const body = encode(JSON.stringify(unsigned)); return `${body}.${keyring.sign(body, now()).signature}`;
    },
    verify(token: string, current: ElectronicsStageTwoCurrentAuthority): ElectronicsStageTwoVerification {
      const pieces = token.split("."); if (pieces.length !== 2 || !pieces[0] || !pieces[1]) return { status: "INVALID", reason: "MALFORMED" };
      let raw: unknown; try { raw = JSON.parse(Buffer.from(pieces[0], "base64url").toString("utf8")); } catch { return { status: "INVALID", reason: "MALFORMED" }; }
      const parsed = claimsSchema.safeParse(raw); if (!parsed.success) return { status: "INVALID", reason: "MALFORMED" };
      const claims=parsed.data as ElectronicsStageTwoHandoffClaims,signature = keyring.verify(claims.kid, pieces[0], pieces[1], now()); if (signature !== "VALID") return { status: "INVALID", reason: signature };
      if (validateElectronicsStageTwoBinding(claims, current, now()).length) return { status: "INVALID", reason: "AUTHORITY_MISMATCH" };
      return { status: "VALID", claims };
    },
  };
}

/** Test helper only; production secrets must come from a separately approved environment key provider. */
export function createLocalElectronicsStageTwoHandoffCandidate(secret: string, keyId = "local-test", now?: () => Date) {
  return createElectronicsStageTwoHandoffCandidate({ provider: new StaticLocalTestKeyProvider([{ id: keyId, secret, state: "ACTIVE" }]), now });
}
