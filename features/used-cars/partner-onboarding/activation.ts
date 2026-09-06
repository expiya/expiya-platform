import { createHash, timingSafeEqual } from "node:crypto";

export interface PartnerActivationGrant {
  readonly grantId: string; readonly applicationId: string; readonly tenantId: string; readonly intendedEmailFingerprint: string;
  readonly tokenHash: string; readonly issuedAt: number; readonly expiresAt: number; readonly consumedAt: number | null; readonly revokedAt: number | null;
}
export type ActivationDecision = { readonly allowed: true; readonly createRole: "SELLER_FULL_ACCESS"; readonly requireMfaEnrollment: true; readonly rotateAllPriorGrants: true; readonly productionMutationAuthorized: false }
  | { readonly allowed: false; readonly reason: "TOKEN_INVALID" | "EXPIRED" | "ALREADY_USED" | "REVOKED" | "EMAIL_MISMATCH"; readonly productionMutationAuthorized: false };

export const hashActivationToken = (token: string) => `sha256:${createHash("sha256").update(token, "utf8").digest("hex")}`;
function safeHashMatch(left: string, right: string): boolean { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }

export function evaluateActivation(input: { readonly grant: PartnerActivationGrant; readonly presentedToken: string; readonly emailFingerprint: string; readonly now: number }): ActivationDecision {
  if (input.grant.revokedAt !== null) return { allowed: false, reason: "REVOKED", productionMutationAuthorized: false };
  if (input.grant.consumedAt !== null) return { allowed: false, reason: "ALREADY_USED", productionMutationAuthorized: false };
  if (input.now >= input.grant.expiresAt) return { allowed: false, reason: "EXPIRED", productionMutationAuthorized: false };
  if (input.emailFingerprint !== input.grant.intendedEmailFingerprint) return { allowed: false, reason: "EMAIL_MISMATCH", productionMutationAuthorized: false };
  if (!safeHashMatch(hashActivationToken(input.presentedToken), input.grant.tokenHash)) return { allowed: false, reason: "TOKEN_INVALID", productionMutationAuthorized: false };
  return { allowed: true, createRole: "SELLER_FULL_ACCESS", requireMfaEnrollment: true, rotateAllPriorGrants: true, productionMutationAuthorized: false };
}
