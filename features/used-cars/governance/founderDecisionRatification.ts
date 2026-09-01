import { usedCarsProductDecisions } from "./productDecisions";

export interface FounderDecisionRatification {
  readonly ratificationId: string;
  readonly signerName: string;
  readonly organization: string;
  readonly capacity: string;
  readonly acceptedDecisionIds: readonly string[];
  readonly acceptedValues: Readonly<Record<string, string>>;
  readonly acceptedAt: string;
  readonly canonicalSnapshotChecksum: string;
  readonly specialistRoleApprovalsSatisfied: false;
  readonly independentLegalSecurityReviewSatisfied: false;
  readonly productionEffectAuthorized: false;
}

export const usedCarsFounderDecisionRatification: FounderDecisionRatification = Object.freeze({
  ratificationId: "UC-RAT-2026-09-01-001",
  signerName: "Serdar Akgül",
  organization: "SKYBIT Yazılım ve Bilgi Teknolojileri Danışmanlığı Ltd. Şti.",
  capacity: "Expiya.com kurucusu",
  acceptedDecisionIds: Object.freeze(usedCarsProductDecisions.map((decision) => decision.decisionId)),
  acceptedValues: Object.freeze(Object.fromEntries(usedCarsProductDecisions.map((decision) => [decision.decisionId, decision.recommendedDefault]))),
  acceptedAt: "2026-09-01",
  canonicalSnapshotChecksum: "sha256:09b11429422edb89f3808205494cc86c65785093321682e7ba13a7f368adb7f6",
  specialistRoleApprovalsSatisfied: false,
  independentLegalSecurityReviewSatisfied: false,
  productionEffectAuthorized: false,
});

export function validateFounderDecisionRatification(ratification: FounderDecisionRatification) {
  const decisionIds = usedCarsProductDecisions.map((decision) => decision.decisionId);
  const missing = decisionIds.filter((id) => !ratification.acceptedDecisionIds.includes(id) || ratification.acceptedValues[id] !== usedCarsProductDecisions.find((decision) => decision.decisionId === id)?.recommendedDefault);
  const codes: string[] = [];
  if (!ratification.signerName || !ratification.organization || !ratification.capacity) codes.push("SIGNER_IDENTITY_INCOMPLETE");
  if (!/^sha256:[a-f0-9]{64}$/u.test(ratification.canonicalSnapshotChecksum)) codes.push("SNAPSHOT_CHECKSUM_INVALID");
  if (ratification.specialistRoleApprovalsSatisfied || ratification.independentLegalSecurityReviewSatisfied || ratification.productionEffectAuthorized) codes.push("RATIFICATION_AUTHORITY_OVERREACH");
  if (missing.length > 0) codes.push("DECISION_COVERAGE_INCOMPLETE");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), missing: Object.freeze(missing), founderRecommendationsAccepted: codes.length === 0, productGovernanceReady: false as const, productionEffectAuthorized: false as const });
}
