import type { ProviderCapability, ProviderRequirement } from "./providerRegistry";

export interface ProviderCandidateAssessment {
  readonly assessmentId: string;
  readonly providerReference: string;
  readonly capability: ProviderCapability;
  readonly satisfiedControls: readonly string[];
  readonly dpaApproved: boolean;
  readonly kvkkRoleRecorded: boolean;
  readonly processingRegionsRecorded: boolean;
  readonly internationalTransferMechanismApproved: boolean;
  readonly subprocessorsReviewed: boolean;
  readonly breachSlaApproved: boolean;
  readonly deletionVerified: boolean;
  readonly exitExportTested: boolean;
  readonly securityReviewApproved: boolean;
  readonly legalReviewApproved: boolean;
  readonly commercialApprovalRecorded: boolean;
}

export function assessProviderCandidate(requirement: ProviderRequirement, candidate: ProviderCandidateAssessment) {
  const blockers: string[] = [];
  if (candidate.capability !== requirement.capability) blockers.push("CAPABILITY_MISMATCH");
  for (const control of requirement.requiredControls) if (!candidate.satisfiedControls.includes(control)) blockers.push(`CONTROL_MISSING:${control}`);
  for (const [key, ready] of Object.entries(candidate).filter(([key]) => ["dpaApproved", "kvkkRoleRecorded", "processingRegionsRecorded", "internationalTransferMechanismApproved", "subprocessorsReviewed", "breachSlaApproved", "deletionVerified", "exitExportTested", "securityReviewApproved", "legalReviewApproved", "commercialApprovalRecorded"].includes(key))) if (!ready) blockers.push(`ASSESSMENT_MISSING:${key}`);
  return Object.freeze({ approved: blockers.length === 0, blockers: Object.freeze(blockers), productionAdapterActivationAuthorized: false as const, dataTransferAuthorized: false as const });
}

export function assessProviderPortfolioCoverage(requirements: readonly ProviderRequirement[], candidates: readonly ProviderCandidateAssessment[]) {
  const missing = requirements.filter((requirement) => !candidates.some((candidate) => candidate.capability === requirement.capability && assessProviderCandidate(requirement, candidate).approved)).map((requirement) => requirement.capability);
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), providerSelectionAuthorized: false as const, productionAdapterActivationAuthorized: false as const });
}
