export interface PartnerPortalAccessGrant {
  readonly version: "used-partner-portal-grant/v1";
  readonly grantId: string;
  readonly leadId: string;
  readonly recipientTenantId: string;
  readonly recipientBranchId: string;
  readonly recipientActorId: string;
  readonly allowedAction: "LEAD_VIEW_ONCE";
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
  readonly revokedAt: string | null;
  readonly consentReceiptId: string;
  readonly executionAuthorized: false;
}

export type PortalGrantDecision =
  | "ALLOW_ONCE" | "TENANT_MISMATCH" | "BRANCH_MISMATCH" | "ACTOR_MISMATCH"
  | "MFA_REQUIRED" | "EXPIRED" | "NOT_YET_VALID" | "ALREADY_CONSUMED"
  | "REVOKED" | "CONSENT_WITHDRAWN";

export function evaluatePartnerPortalGrant(input: {
  readonly grant: PartnerPortalAccessGrant;
  readonly actor: { readonly actorId: string; readonly tenantId: string; readonly branchIds: readonly string[]; readonly mfaVerified: boolean };
  readonly now: string;
  readonly consentActive: boolean;
}): PortalGrantDecision {
  const { grant, actor } = input;
  if (grant.revokedAt) return "REVOKED";
  if (!input.consentActive) return "CONSENT_WITHDRAWN";
  if (grant.consumedAt) return "ALREADY_CONSUMED";
  if (!actor.mfaVerified) return "MFA_REQUIRED";
  if (actor.tenantId !== grant.recipientTenantId) return "TENANT_MISMATCH";
  if (!actor.branchIds.includes(grant.recipientBranchId)) return "BRANCH_MISMATCH";
  if (actor.actorId !== grant.recipientActorId) return "ACTOR_MISMATCH";
  if (input.now < grant.issuedAt) return "NOT_YET_VALID";
  if (input.now >= grant.expiresAt) return "EXPIRED";
  return "ALLOW_ONCE";
}
