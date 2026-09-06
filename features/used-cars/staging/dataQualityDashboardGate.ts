export interface DataQualityDashboardEvidence { readonly measuredAt: string; readonly tenantAggregationOnly: true; readonly rawVinOrPlateVisible: false; readonly allSixJobSignalsVisible: boolean; readonly thresholdVersion: string; readonly alertRoutesTested: boolean; readonly primaryReviewerId: string | null; readonly independentReviewerId: string | null; readonly evidenceChecksum: string }
export function assessDataQualityDashboard(evidence: DataQualityDashboardEvidence) {
  const codes: string[] = [];
  if (!evidence.allSixJobSignalsVisible) codes.push("JOB_SIGNAL_COVERAGE_INCOMPLETE");
  if (!evidence.alertRoutesTested) codes.push("ALERT_ROUTES_UNTESTED");
  if (!evidence.primaryReviewerId || !evidence.independentReviewerId || evidence.primaryReviewerId === evidence.independentReviewerId) codes.push("INDEPENDENT_REVIEW_REQUIRED");
  if (!/^sha256:[a-f0-9]{64}$/u.test(evidence.evidenceChecksum)) codes.push("EVIDENCE_CHECKSUM_INVALID");
  return Object.freeze({ accepted: codes.length === 0, codes: Object.freeze(codes), productionDashboardAuthorized: false as const });
}
