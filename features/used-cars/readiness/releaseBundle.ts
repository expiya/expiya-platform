import { usedCarsDeliveryWorkstreams } from "./deliveryWorkstreams";
import { validateReleaseEvidence, type ReleaseEvidence } from "./releaseEvidence";
import type { LaunchStage } from "./launchControl";

export interface UsedCarsReleaseBundle {
  readonly bundleId: string;
  readonly targetStage: LaunchStage;
  readonly sourceCommitSha: string;
  readonly artifactDigest: string;
  readonly createdAt: string;
  readonly scopeAuthorizationId: string | null;
  readonly rollbackPlanChecksum: string;
  readonly evidence: readonly ReleaseEvidence[];
  readonly containsProductionData: false;
  readonly deploymentRequested: false;
}

export function validateUsedCarsReleaseBundle(bundle: UsedCarsReleaseBundle, now: string) {
  const codes: string[] = [];
  if (!/^[a-f0-9]{40}$/u.test(bundle.sourceCommitSha)) codes.push("SOURCE_COMMIT_INVALID");
  if (!/^sha256:[a-f0-9]{64}$/u.test(bundle.artifactDigest)) codes.push("ARTIFACT_DIGEST_INVALID");
  if (!/^sha256:[a-f0-9]{64}$/u.test(bundle.rollbackPlanChecksum)) codes.push("ROLLBACK_PLAN_INVALID");
  if (!bundle.scopeAuthorizationId) codes.push("SCOPE_AUTHORIZATION_REQUIRED");
  if (new Set(bundle.evidence.map((item) => item.evidenceId)).size !== bundle.evidence.length) codes.push("DUPLICATE_EVIDENCE_ID");
  const missingDomains = usedCarsDeliveryWorkstreams.map((item) => item.domain).filter((domain) => !bundle.evidence.some((item) => item.domain === domain && item.stage === bundle.targetStage && validateReleaseEvidence({ evidence: item, now, requireIndependentReview: item.kind === "SECURITY_REVIEW" || item.kind === "LEGAL_APPROVAL" }).length === 0));
  if (missingDomains.length > 0) codes.push("DOMAIN_EVIDENCE_INCOMPLETE");
  if (bundle.containsProductionData || bundle.deploymentRequested) codes.push("BUNDLE_SIDE_EFFECT_BOUNDARY_VIOLATION");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), missingDomains: Object.freeze(missingDomains), promotionAuthorized: false as const, deploymentAuthorized: false as const });
}
