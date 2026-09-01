export interface TaxonomyReviewSamplingEvidence { readonly candidateVersion: string; readonly totalLeafEntities: number; readonly fullAutomatedIntegrityPassed: boolean; readonly sourcePermissionCoverageRatio: number; readonly trMarketEvidenceCoverageRatio: number; readonly duplicateConflictCount: number; readonly cyclicSupersedeCount: number; readonly randomSampleSize: number; readonly randomSampleErrors: number; readonly highRiskEntityCount: number; readonly highRiskEntitiesReviewed: number; readonly primaryReviewerId: string | null; readonly secondReviewerId: string | null; readonly legalUsageReviewerId: string | null; readonly evidenceChecksum: string }
export function assessTaxonomyReviewSamplingGate(evidence: TaxonomyReviewSamplingEvidence) {
  const codes: string[] = [];
  if (evidence.totalLeafEntities <= 0 || !evidence.fullAutomatedIntegrityPassed) codes.push("DATASET_AND_INTEGRITY_REQUIRED");
  if (evidence.sourcePermissionCoverageRatio !== 1 || evidence.trMarketEvidenceCoverageRatio !== 1) codes.push("FULL_PROVENANCE_COVERAGE_REQUIRED");
  if (evidence.duplicateConflictCount > 0 || evidence.cyclicSupersedeCount > 0) codes.push("IDENTITY_GRAPH_CONFLICT");
  if (evidence.randomSampleSize < Math.min(200, evidence.totalLeafEntities) || evidence.randomSampleErrors > 0) codes.push("CLEAN_RANDOM_SAMPLE_REQUIRED");
  if (evidence.highRiskEntityCount !== evidence.highRiskEntitiesReviewed) codes.push("HIGH_RISK_FULL_REVIEW_REQUIRED");
  const reviewers = [evidence.primaryReviewerId, evidence.secondReviewerId, evidence.legalUsageReviewerId];
  if (reviewers.some((item) => !item) || new Set(reviewers).size !== 3) codes.push("THREE_PART_REVIEW_SEPARATION_REQUIRED");
  if (!/^sha256:[a-f0-9]{64}$/u.test(evidence.evidenceChecksum)) codes.push("EVIDENCE_CHECKSUM_REQUIRED");
  return Object.freeze({ passed: codes.length === 0, codes: Object.freeze(codes), publicTaxonomyReleaseAuthorized: false as const });
}
