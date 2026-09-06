export interface ModelShadowEvalSnapshot { readonly environment: "STAGING"; readonly syntheticOnly: true; readonly candidateModelVersion: string; readonly baselineModelVersion: string; readonly datasetChecksum: string; readonly hardConstraintAccuracy: number; readonly groundingAccuracy: number; readonly handoffRecall: number; readonly maximumCohortDelta: number; readonly criticalViolations: number; readonly commercialRankingInfluenceIncidents: number; readonly liveDecisionServed: false; readonly reviewerId: string | null; readonly rollbackReleaseId: string | null }
export function assessModelShadowEval(snapshot: ModelShadowEvalSnapshot) {
  const codes: string[] = [];
  if (!/^sha256:[a-f0-9]{64}$/u.test(snapshot.datasetChecksum)) codes.push("DATASET_CHECKSUM_REQUIRED");
  if (snapshot.candidateModelVersion === snapshot.baselineModelVersion) codes.push("DISTINCT_CANDIDATE_REQUIRED");
  if (snapshot.hardConstraintAccuracy < 1) codes.push("HARD_CONSTRAINT_REGRESSION");
  if (snapshot.groundingAccuracy < 0.98) codes.push("GROUNDING_REGRESSION");
  if (snapshot.handoffRecall < 0.95) codes.push("HANDOFF_REGRESSION");
  if (snapshot.maximumCohortDelta > 0.05) codes.push("FAIRNESS_DELTA_EXCEEDED");
  if (snapshot.criticalViolations > 0) codes.push("CRITICAL_POLICY_VIOLATION");
  if (snapshot.commercialRankingInfluenceIncidents > 0) codes.push("COMMERCIAL_RANKING_INFLUENCE");
  if (snapshot.liveDecisionServed || !snapshot.syntheticOnly || snapshot.environment !== "STAGING") codes.push("SHADOW_BOUNDARY_VIOLATION");
  if (!snapshot.reviewerId || !snapshot.rollbackReleaseId) codes.push("REVIEW_AND_ROLLBACK_REQUIRED");
  return Object.freeze({ passed: codes.length === 0, codes: Object.freeze(codes), automaticRolloutAuthorized: false as const, productionModelReleaseAuthorized: false as const });
}
