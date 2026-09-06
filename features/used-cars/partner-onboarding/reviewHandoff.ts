import type { PartnerApplicationStatus } from "./applicationStateMachine";

export interface PartnerReviewHandoff {
  readonly version: "partner-review-handoff/v1"; readonly applicationId: string; readonly applicationRevision: number;
  readonly currentStatus: PartnerApplicationStatus; readonly registryVersion: string; readonly applicantEmailVerified: boolean;
  readonly completenessChecksum: string; readonly documentIds: readonly string[]; readonly consentReceiptIds: readonly string[];
  readonly requestedReview: "IDENTITY" | "DOCUMENT" | "IETTS" | "CONTRACT"; readonly submittedAt: string;
  readonly tenantId: null; readonly realNotificationAuthorized: false; readonly productionMutationAuthorized: false;
}

export function validateReviewHandoff(handoff: PartnerReviewHandoff) {
  const codes: string[] = [];
  if (!handoff.applicationId.trim()) codes.push("APPLICATION_ID_REQUIRED");
  if (!Number.isInteger(handoff.applicationRevision) || handoff.applicationRevision < 1) codes.push("REVISION_REQUIRED");
  if (!handoff.applicantEmailVerified) codes.push("EMAIL_VERIFICATION_REQUIRED");
  if (!/^sha256:[a-f0-9]{64}$/u.test(handoff.completenessChecksum)) codes.push("CHECKSUM_INVALID");
  if (handoff.consentReceiptIds.length === 0) codes.push("CONSENT_RECEIPT_REQUIRED");
  if (handoff.tenantId !== null) codes.push("TENANT_MUST_NOT_EXIST_BEFORE_APPROVAL");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), enqueueAuthorized: false as const });
}
