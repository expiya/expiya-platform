export type ModerationGrantPurpose = "SUBJECT_REVIEW" | "DOCUMENT_REVIEW" | "SECOND_REVIEW";

export interface ModerationAccessGrant {
  readonly version: "used-cars-moderation-grant/v1";
  readonly grantId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly subjectId: string;
  readonly subjectRevisionId: string;
  readonly documentId: string | null;
  readonly actorId: string;
  readonly purpose: ModerationGrantPurpose;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly firstDecisionActorId: string | null;
  readonly rawLeadAccessAllowed: false;
  readonly tenantImpersonationAllowed: false;
}

export interface ModerationAccessRequest {
  readonly taskId: string;
  readonly subjectId: string;
  readonly subjectRevisionId: string;
  readonly documentId?: string;
  readonly actorId: string;
  readonly purpose: ModerationGrantPurpose;
  readonly now: string;
}

export type ModerationGrantDecision =
  | { readonly allowed: true; readonly auditRequired: true }
  | { readonly allowed: false; readonly reason: "REVOKED" | "NOT_YET_VALID" | "EXPIRED" | "TASK_MISMATCH" | "SUBJECT_MISMATCH" | "REVISION_MISMATCH" | "DOCUMENT_MISMATCH" | "ACTOR_MISMATCH" | "PURPOSE_MISMATCH" | "SAME_ACTOR_SECOND_REVIEW" };

export function evaluateModerationAccess(grant: ModerationAccessGrant, request: ModerationAccessRequest): ModerationGrantDecision {
  if (grant.revokedAt) return { allowed: false, reason: "REVOKED" };
  if (request.now < grant.issuedAt) return { allowed: false, reason: "NOT_YET_VALID" };
  if (request.now >= grant.expiresAt) return { allowed: false, reason: "EXPIRED" };
  if (request.taskId !== grant.taskId) return { allowed: false, reason: "TASK_MISMATCH" };
  if (request.subjectId !== grant.subjectId) return { allowed: false, reason: "SUBJECT_MISMATCH" };
  if (request.subjectRevisionId !== grant.subjectRevisionId) return { allowed: false, reason: "REVISION_MISMATCH" };
  if ((request.documentId ?? null) !== grant.documentId) return { allowed: false, reason: "DOCUMENT_MISMATCH" };
  if (request.actorId !== grant.actorId) return { allowed: false, reason: "ACTOR_MISMATCH" };
  if (request.purpose !== grant.purpose) return { allowed: false, reason: "PURPOSE_MISMATCH" };
  if (request.purpose === "SECOND_REVIEW" && grant.firstDecisionActorId === request.actorId) return { allowed: false, reason: "SAME_ACTOR_SECOND_REVIEW" };
  return { allowed: true, auditRequired: true };
}

export function grantContainsForbiddenCapabilities(grant: ModerationAccessGrant): boolean {
  return grant.rawLeadAccessAllowed !== false || grant.tenantImpersonationAllowed !== false;
}
