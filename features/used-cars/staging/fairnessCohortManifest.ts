export type FairnessAxis = "BUDGET_BAND" | "RISK_TOLERANCE" | "CITY_ACCESS" | "BODY_TYPE_NEED" | "FUEL_PREFERENCE" | "CLASSIC_INTEREST";
export interface FairnessCohortComparison { readonly comparisonId: string; readonly axis: FairnessAxis; readonly cohortA: string; readonly cohortB: string; readonly minimumSamplePerCohort: number; readonly maximumQualityDelta: 0.05; readonly protectedOrProxyFeatureUsed: false; readonly reviewerId: string | null; readonly evaluated: false }
export const usedCarsStagingFairnessCohorts: readonly FairnessCohortComparison[] = Object.freeze([
  { comparisonId: "FAIR-01", axis: "BUDGET_BAND", cohortA: "LOWER", cohortB: "UPPER", minimumSamplePerCohort: 100, maximumQualityDelta: 0.05, protectedOrProxyFeatureUsed: false, reviewerId: null, evaluated: false },
  { comparisonId: "FAIR-02", axis: "RISK_TOLERANCE", cohortA: "LOW", cohortB: "HIGH", minimumSamplePerCohort: 100, maximumQualityDelta: 0.05, protectedOrProxyFeatureUsed: false, reviewerId: null, evaluated: false },
  { comparisonId: "FAIR-03", axis: "CITY_ACCESS", cohortA: "PILOT_CORE", cohortB: "PILOT_EDGE", minimumSamplePerCohort: 100, maximumQualityDelta: 0.05, protectedOrProxyFeatureUsed: false, reviewerId: null, evaluated: false },
  { comparisonId: "FAIR-04", axis: "BODY_TYPE_NEED", cohortA: "PASSENGER", cohortB: "COMMERCIAL", minimumSamplePerCohort: 100, maximumQualityDelta: 0.05, protectedOrProxyFeatureUsed: false, reviewerId: null, evaluated: false },
  { comparisonId: "FAIR-05", axis: "FUEL_PREFERENCE", cohortA: "ICE", cohortB: "ELECTRIFIED", minimumSamplePerCohort: 100, maximumQualityDelta: 0.05, protectedOrProxyFeatureUsed: false, reviewerId: null, evaluated: false },
  { comparisonId: "FAIR-06", axis: "CLASSIC_INTEREST", cohortA: "DAILY", cohortB: "COLLECTION", minimumSamplePerCohort: 100, maximumQualityDelta: 0.05, protectedOrProxyFeatureUsed: false, reviewerId: null, evaluated: false },
]);
export function validateFairnessCohortManifest(comparisons: readonly FairnessCohortComparison[]) {
  const codes: string[] = [];
  const axes: readonly FairnessAxis[] = ["BUDGET_BAND", "RISK_TOLERANCE", "CITY_ACCESS", "BODY_TYPE_NEED", "FUEL_PREFERENCE", "CLASSIC_INTEREST"];
  for (const axis of axes) if (!comparisons.some((item) => item.axis === axis)) codes.push(`AXIS_REQUIRED:${axis}`);
  for (const item of comparisons) { if (item.minimumSamplePerCohort < 100 || item.maximumQualityDelta !== 0.05 || item.protectedOrProxyFeatureUsed) codes.push(`COHORT_POLICY_INVALID:${item.comparisonId}`); if (item.reviewerId || item.evaluated) codes.push(`FAIRNESS_EVALUATION_PREMATURE:${item.comparisonId}`); }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), liveUserProfilingAuthorized: false as const });
}
