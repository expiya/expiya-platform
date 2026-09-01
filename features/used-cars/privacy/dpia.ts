import type { ProcessingActivity } from "./processingInventory";
export type DpiaRiskReason = "AUTOMATED_DECISIONING" | "HIGH_RISK_IDENTIFIER" | "FRAUD_PROFILING" | "LIVE_VIDEO" | "AI_CONVERSATION" | "INTERNATIONAL_TRANSFER";
export function screenDpia(activity: ProcessingActivity) {
  const reasons: DpiaRiskReason[] = [];
  if (activity.automatedDecisioning) reasons.push("AUTOMATED_DECISIONING");
  if (activity.dataCategories.some((category) => ["vin", "plate", "identifier-fingerprint"].includes(category))) reasons.push("HIGH_RISK_IDENTIFIER");
  if (activity.purpose === "FRAUD_PREVENTION") reasons.push("FRAUD_PROFILING");
  if (activity.purpose === "LIVE_COMMUNICATION") reasons.push("LIVE_VIDEO");
  if (activity.purpose === "AI_ASSISTANCE") reasons.push("AI_CONVERSATION");
  if (activity.internationalTransferPossible) reasons.push("INTERNATIONAL_TRANSFER");
  return Object.freeze({ dpiaRequired: reasons.length > 0, reasons: Object.freeze([...new Set(reasons)]), processingActivationAuthorized: false as const });
}

export interface DpiaReview {
  readonly activityId: string; readonly riskReasons: readonly DpiaRiskReason[]; readonly necessityAndProportionalityApproved: boolean; readonly controlsTested: boolean; readonly residualRisk: "LOW" | "MEDIUM" | "HIGH"; readonly privacyReviewerId: string | null; readonly securityReviewerId: string | null; readonly legalApproverId: string | null; readonly reviewedAt: string; readonly expiresAt: string | null;
}
export function validateDpiaReview(review: DpiaReview, now: string) {
  const codes: string[] = [];
  if (review.riskReasons.length === 0) codes.push("RISK_REASON_REQUIRED");
  if (!review.necessityAndProportionalityApproved) codes.push("NECESSITY_PROPORTIONALITY_REQUIRED");
  if (!review.controlsTested) codes.push("CONTROL_TEST_REQUIRED");
  if (!review.privacyReviewerId || !review.securityReviewerId || !review.legalApproverId) codes.push("THREE_PART_REVIEW_REQUIRED");
  if (new Set([review.privacyReviewerId, review.securityReviewerId, review.legalApproverId].filter(Boolean)).size < 3) codes.push("REVIEWER_SEPARATION_REQUIRED");
  if (review.residualRisk === "HIGH") codes.push("HIGH_RESIDUAL_RISK_BLOCKS_PROCESSING");
  if (review.expiresAt && now >= review.expiresAt) codes.push("DPIA_EXPIRED");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), processingActivationAuthorized: false as const });
}
