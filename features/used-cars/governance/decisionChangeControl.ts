export type DecisionImpact = "B2C" | "PARTNER" | "OPS" | "DATA" | "SECURITY" | "LEGAL" | "COMMERCIAL";
export interface ProductDecisionChangeProposal {
  readonly proposalId: string;
  readonly decisionId: string;
  readonly currentApprovalId: string;
  readonly currentSnapshotChecksum: string;
  readonly proposedValue: string;
  readonly rationale: string;
  readonly impacts: readonly DecisionImpact[];
  readonly rollbackPlanChecksum: string | null;
  readonly requestedBy: string;
  readonly requestedAt: string;
}

const checksumPattern = /^sha256:[a-f0-9]{64}$/u;
export function validateDecisionChangeProposal(proposal: ProductDecisionChangeProposal) {
  const codes: string[] = [];
  if (!proposal.currentApprovalId) codes.push("CURRENT_APPROVAL_REQUIRED");
  if (!checksumPattern.test(proposal.currentSnapshotChecksum)) codes.push("INVALID_CURRENT_CHECKSUM");
  if (!proposal.proposedValue.trim()) codes.push("PROPOSED_VALUE_REQUIRED");
  if (!proposal.rationale.trim()) codes.push("RATIONALE_REQUIRED");
  if (proposal.impacts.length === 0) codes.push("IMPACT_ASSESSMENT_REQUIRED");
  if (!proposal.rollbackPlanChecksum || !checksumPattern.test(proposal.rollbackPlanChecksum)) codes.push("ROLLBACK_PLAN_REQUIRED");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), originalApprovalRemainsEffective: true as const, automaticSupersedeAuthorized: false as const });
}

export function requiredChangeReviewRoles(impacts: readonly DecisionImpact[]) {
  const roles = new Set<string>(["PRODUCT"]);
  if (impacts.includes("LEGAL") || impacts.includes("DATA") || impacts.includes("COMMERCIAL")) roles.add("LEGAL");
  if (impacts.includes("SECURITY") || impacts.includes("DATA") || impacts.includes("PARTNER")) roles.add("SECURITY");
  if (impacts.includes("OPS") || impacts.includes("PARTNER")) roles.add("OPERATIONS");
  return Object.freeze([...roles]);
}
