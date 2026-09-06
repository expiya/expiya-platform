export interface RankingIndependenceAuditEvidence { readonly evaluationWindowDays: number; readonly paidEligibleListings: number; readonly unpaidEligibleListings: number; readonly matchedCohortCount: number; readonly maximumExposureDelta: number; readonly rankingSchemaCommercialFields: readonly string[]; readonly rankingServiceBillingAccess: boolean; readonly sponsoredOrganicMixingCount: number; readonly manualOrganicOverrideCount: number; readonly independentReviewerId: string | null; readonly evidenceChecksum: string }
export function assessRankingIndependenceAudit(evidence: RankingIndependenceAuditEvidence) {
  const codes: string[] = [];
  if (evidence.evaluationWindowDays < 28) codes.push("AUDIT_WINDOW_INSUFFICIENT");
  if (evidence.paidEligibleListings < 100 || evidence.unpaidEligibleListings < 100 || evidence.matchedCohortCount < 5) codes.push("AUDIT_SAMPLE_INSUFFICIENT");
  if (evidence.maximumExposureDelta > 0.05) codes.push("EXPOSURE_DELTA_TOO_HIGH");
  if (evidence.rankingSchemaCommercialFields.length > 0 || evidence.rankingServiceBillingAccess) codes.push("COMMERCIAL_RANKING_COUPLING");
  if (evidence.sponsoredOrganicMixingCount > 0 || evidence.manualOrganicOverrideCount > 0) codes.push("ORGANIC_INDEPENDENCE_VIOLATION");
  if (!evidence.independentReviewerId) codes.push("INDEPENDENT_REVIEW_REQUIRED");
  if (!/^sha256:[a-f0-9]{64}$/u.test(evidence.evidenceChecksum)) codes.push("EVIDENCE_CHECKSUM_INVALID");
  return Object.freeze({ passed: codes.length === 0, codes: Object.freeze(codes), sponsoredPublicationAuthorized: false as const, rankingOverrideAuthorized: false as const });
}
