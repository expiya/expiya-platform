export type ExperimentSurface = "B2C_ONBOARDING" | "MATCH_EXPLANATION" | "LISTING_DETAIL" | "LEAD_CTA" | "PARTNER_WORKFLOW";
export type ExperimentMetric = "TASK_COMPLETION" | "EXPLANATION_UNDERSTANDING" | "QUALIFIED_LEAD" | "DEALER_RESPONSE_TIME" | "ERROR_RATE" | "ACCESSIBILITY_SUCCESS";
export interface UsedCarsExperiment {
  readonly experimentId: string; readonly hypothesis: string; readonly surface: ExperimentSurface; readonly primaryMetric: ExperimentMetric; readonly guardrailMetrics: readonly ExperimentMetric[]; readonly allocationKeys: readonly string[]; readonly startsAt: string; readonly endsAt: string; readonly ownerId: string; readonly privacyReviewId: string | null; readonly fairnessReviewId: string | null; readonly rollbackPlanChecksum: string | null; readonly status: "DRAFT" | "REVIEWED" | "RUNNING" | "STOPPED" | "COMPLETED"; readonly productionExecutionAuthorized: false;
}
const forbiddenAllocationKeys = Object.freeze(["tenantId", "dealerPlan", "monthlyFee", "sponsoredStatus", "religion", "ethnicity", "gender", "healthData", "exactAddress", "vin", "plate"]);
export function validateExperiment(experiment: UsedCarsExperiment) {
  const codes: string[] = [];
  if (!experiment.hypothesis.trim()) codes.push("HYPOTHESIS_REQUIRED");
  if (experiment.endsAt <= experiment.startsAt) codes.push("INVALID_TIMEBOX");
  if (experiment.guardrailMetrics.length === 0) codes.push("GUARDRAIL_REQUIRED");
  if (experiment.allocationKeys.some((key) => forbiddenAllocationKeys.includes(key))) codes.push("FORBIDDEN_ALLOCATION_KEY");
  if (!experiment.privacyReviewId) codes.push("PRIVACY_REVIEW_REQUIRED");
  if (!experiment.fairnessReviewId) codes.push("FAIRNESS_REVIEW_REQUIRED");
  if (!/^sha256:[a-f0-9]{64}$/u.test(experiment.rollbackPlanChecksum ?? "")) codes.push("ROLLBACK_PLAN_REQUIRED");
  if (experiment.status === "RUNNING") codes.push("PRODUCTION_EXECUTION_FORBIDDEN");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), organicRankingMutationAuthorized: false as const, productionExecutionAuthorized: false as const });
}
