export interface MembershipPlan {
  readonly code: "STARTER" | "GROWTH" | "ENTERPRISE";
  readonly billingPeriod: "MONTHLY" | "YEARLY";
  readonly activeStockLimit: number;
  readonly branchLimit: number;
  readonly userLimit: number;
  readonly analyticsLevel: "BASIC" | "ADVANCED";
  readonly feedIntegration: boolean;
  readonly organicRankingBenefit: false;
}

export function validateMembershipPlan(plan: MembershipPlan): boolean {
  return plan.activeStockLimit > 0 && plan.branchLimit > 0 && plan.userLimit > 0
    && plan.organicRankingBenefit === false;
}
