export type QualityCaseSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type QualityCaseState = "OPEN" | "QUARANTINED" | "DEALER_ACTION_REQUIRED" | "UNDER_REVIEW" | "CORRECTED" | "REJECTED" | "CLOSED";
export interface QualityCorrectionCase { readonly caseId: string; readonly tenantId: string; readonly listingId: string; readonly severity: QualityCaseSeverity; readonly state: QualityCaseState; readonly openedAt: string; readonly dueAt: string; readonly sourceRevisionId: string; readonly correctedRevisionId: string | null; readonly firstReviewerId: string | null; readonly secondReviewerId: string | null; readonly publicationSuspended: boolean }
const transitions: Readonly<Record<QualityCaseState, readonly QualityCaseState[]>> = Object.freeze({ OPEN: ["QUARANTINED", "DEALER_ACTION_REQUIRED"], QUARANTINED: ["DEALER_ACTION_REQUIRED", "UNDER_REVIEW", "REJECTED"], DEALER_ACTION_REQUIRED: ["UNDER_REVIEW", "REJECTED"], UNDER_REVIEW: ["CORRECTED", "REJECTED"], CORRECTED: ["CLOSED"], REJECTED: ["CLOSED"], CLOSED: [] });
export function canTransitionQualityCase(from: QualityCaseState, to: QualityCaseState) { return transitions[from].includes(to); }
export function evaluateQualityCorrection(caseRecord: QualityCorrectionCase, now: string) {
  const codes: string[] = [];
  if (now >= caseRecord.dueAt && !["CORRECTED", "REJECTED", "CLOSED"].includes(caseRecord.state)) codes.push("CORRECTION_SLA_BREACHED");
  if (["CRITICAL", "HIGH"].includes(caseRecord.severity) && !caseRecord.publicationSuspended) codes.push("PUBLICATION_SUSPENSION_REQUIRED");
  if (caseRecord.state === "CORRECTED" && (!caseRecord.correctedRevisionId || caseRecord.correctedRevisionId === caseRecord.sourceRevisionId)) codes.push("NEW_CORRECTED_REVISION_REQUIRED");
  if (caseRecord.state === "CORRECTED" && (!caseRecord.firstReviewerId || !caseRecord.secondReviewerId || caseRecord.firstReviewerId === caseRecord.secondReviewerId)) codes.push("TWO_PERSON_REVIEW_REQUIRED");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), automaticRepublishAuthorized: false as const });
}
