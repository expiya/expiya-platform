export type ComplaintCaseStatus = "RECEIVED" | "ACKNOWLEDGED" | "TRIAGED" | "TEMPORARILY_HIDDEN" | "EVIDENCE_REQUESTED" | "RESOLVED" | "REJECTED_WITH_REASON" | "CLOSED";
export type ComplaintApplicantType = "LISTING_PUBLISHER" | "VEHICLE_OWNER" | "RIGHTS_HOLDER" | "CONSUMER" | "PUBLIC_AUTHORITY";
export type ComplaintReason = "FAKE_LISTING" | "UNAUTHORIZED_LISTING" | "MISLEADING_INFORMATION" | "RIGHTS_INFRINGEMENT" | "OTHER";

const transitions: Readonly<Record<ComplaintCaseStatus, readonly ComplaintCaseStatus[]>> = Object.freeze({
  RECEIVED: ["ACKNOWLEDGED", "TEMPORARILY_HIDDEN"], ACKNOWLEDGED: ["TRIAGED", "TEMPORARILY_HIDDEN"],
  TRIAGED: ["TEMPORARILY_HIDDEN", "EVIDENCE_REQUESTED", "RESOLVED", "REJECTED_WITH_REASON"],
  TEMPORARILY_HIDDEN: ["EVIDENCE_REQUESTED", "RESOLVED", "REJECTED_WITH_REASON"], EVIDENCE_REQUESTED: ["TEMPORARILY_HIDDEN", "RESOLVED", "REJECTED_WITH_REASON"],
  RESOLVED: ["CLOSED"], REJECTED_WITH_REASON: ["CLOSED"], CLOSED: [],
});

export interface ComplaintTakedownCase {
  readonly caseId: string; readonly listingId: string; readonly tenantId: string; readonly applicantType: ComplaintApplicantType;
  readonly reason: ComplaintReason; readonly status: ComplaintCaseStatus; readonly receivedAt: string; readonly slaDueAt: string;
  readonly reasonCode: string | null; readonly firstReviewerId: string | null; readonly secondReviewerId: string | null;
  readonly appealAvailable: boolean; readonly resultNotificationPending: boolean; readonly legalHold: boolean;
  readonly immutableAuditHeadChecksum: string;
}

export function canTransitionComplaintCase(from: ComplaintCaseStatus, to: ComplaintCaseStatus): boolean { return transitions[from].includes(to); }

export function evaluateComplaintAction(input: { readonly complaint: ComplaintTakedownCase; readonly nextStatus: ComplaintCaseStatus; readonly now: string; readonly eidsValid: boolean; readonly iettsValid: boolean }) {
  const codes: string[] = [], critical = ["FAKE_LISTING", "UNAUTHORIZED_LISTING", "MISLEADING_INFORMATION"].includes(input.complaint.reason);
  if (!canTransitionComplaintCase(input.complaint.status, input.nextStatus)) codes.push("INVALID_CASE_TRANSITION");
  if (!/^sha256:[a-f0-9]{64}$/u.test(input.complaint.immutableAuditHeadChecksum)) codes.push("IMMUTABLE_AUDIT_REQUIRED");
  if (input.now > input.complaint.slaDueAt) codes.push("SLA_BREACHED");
  if (["RESOLVED", "REJECTED_WITH_REASON", "CLOSED"].includes(input.nextStatus) && !input.complaint.reasonCode) codes.push("REASON_CODE_REQUIRED");
  if (["RESOLVED", "REJECTED_WITH_REASON"].includes(input.nextStatus) && (!input.complaint.firstReviewerId || !input.complaint.secondReviewerId || input.complaint.firstReviewerId === input.complaint.secondReviewerId)) codes.push("TWO_PERSON_REVIEW_REQUIRED");
  const automaticRemovalRequired = !input.eidsValid || !input.iettsValid;
  const immediateTemporaryHideRequired = critical || automaticRemovalRequired;
  if (immediateTemporaryHideRequired && input.nextStatus !== "TEMPORARILY_HIDDEN") codes.push("IMMEDIATE_TEMPORARY_HIDE_REQUIRED");
  return Object.freeze({ allowed: codes.length === 0, codes: Object.freeze(codes), immediateTemporaryHideRequired, automaticRemovalRequired, preserveForLegalHold: input.complaint.legalHold, applicantResultNotificationRequired: ["RESOLVED", "REJECTED_WITH_REASON"].includes(input.nextStatus), realNotificationAuthorized: false as const, productionMutationAuthorized: false as const });
}
