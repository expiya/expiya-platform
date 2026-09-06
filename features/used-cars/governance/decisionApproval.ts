import type { ProductDecision } from "./productDecisions";

export type DecisionApproverRole = ProductDecision["ownerRole"];
export interface ProductDecisionApproval {
  readonly approvalId: string;
  readonly decisionId: string;
  readonly decisionSnapshotChecksum: string;
  readonly approvedValue: string;
  readonly approverId: string;
  readonly approverRole: DecisionApproverRole;
  readonly independentReviewerId: string | null;
  readonly independentReviewerRole: DecisionApproverRole | null;
  readonly issuedAt: string;
  readonly expiresAt: string | null;
  readonly supersededAt: string | null;
}

const checksumPattern = /^sha256:[a-f0-9]{64}$/u;
export function validateProductDecisionApproval(input: { readonly decision: ProductDecision; readonly approval: ProductDecisionApproval; readonly now: string }) {
  const { decision, approval } = input;
  const codes: string[] = [];
  if (approval.decisionId !== decision.decisionId) codes.push("DECISION_ID_MISMATCH");
  if (!checksumPattern.test(approval.decisionSnapshotChecksum)) codes.push("INVALID_DECISION_CHECKSUM");
  if (!approval.approvedValue.trim()) codes.push("APPROVED_VALUE_REQUIRED");
  if (approval.approverRole !== decision.ownerRole) codes.push("OWNER_ROLE_REQUIRED");
  if (!approval.approverId) codes.push("APPROVER_REQUIRED");
  if (approval.expiresAt && input.now >= approval.expiresAt) codes.push("APPROVAL_EXPIRED");
  if (approval.supersededAt) codes.push("APPROVAL_SUPERSEDED");
  if (decision.ownerRole === "LEGAL" || decision.ownerRole === "SECURITY") {
    if (!approval.independentReviewerId || !approval.independentReviewerRole) codes.push("INDEPENDENT_REVIEW_REQUIRED");
    if (approval.independentReviewerId === approval.approverId) codes.push("SELF_REVIEW_FORBIDDEN");
  }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), productionEffectAuthorized: false as const });
}

export function assessDecisionApprovalCoverage(input: { readonly decisions: readonly ProductDecision[]; readonly approvals: readonly ProductDecisionApproval[]; readonly now: string }) {
  const missing = input.decisions.filter((decision) => !input.approvals.some((approval) => validateProductDecisionApproval({ decision, approval, now: input.now }).valid)).map((decision) => decision.decisionId);
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), explicitScopePromotionStillRequired: true as const, productionEffectAuthorized: false as const });
}
