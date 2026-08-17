export type PriceAuthorityState = "VERIFIED_CURRENT" | "VERIFIED_STALE" | "VERIFIED_NOT_YET_VALID" | "INTERNAL_ESTIMATE" | "UNKNOWN" | "INVALID";
export type BudgetDisposition = "CONFIRMED_WITHIN_BUDGET" | "CONFIRMED_OVER_BUDGET" | "NOT_APPLIED" | "NOT_EVALUABLE";

export type RecommendationEligibility =
  | "FULLY_ELIGIBLE"
  | "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED"
  | "INELIGIBLE";

export interface AffordabilityEvaluation {
  readonly priceAuthorityState: PriceAuthorityState;
  readonly budgetDisposition: BudgetDisposition;
  readonly recommendationEligibility: RecommendationEligibility;
  readonly affordabilityClaimAllowed: boolean;
  readonly includedInMinimumBudgetIncrease: boolean;
  readonly requiresUnverifiedGroupConsent: boolean;
}

export function recommendationEligibilityFor(input: {
  readonly technicalEligibility: "ELIGIBLE" | "ELIMINATED" | "NOT_EVALUABLE";
  readonly priceAuthorityState: PriceAuthorityState;
  readonly budgetDisposition: BudgetDisposition;
}): RecommendationEligibility {
  if (input.technicalEligibility !== "ELIGIBLE" || input.budgetDisposition === "CONFIRMED_OVER_BUDGET") return "INELIGIBLE";
  if (input.budgetDisposition === "CONFIRMED_WITHIN_BUDGET" && input.priceAuthorityState === "VERIFIED_CURRENT") return "FULLY_ELIGIBLE";
  if (["UNKNOWN", "INTERNAL_ESTIMATE", "VERIFIED_STALE"].includes(input.priceAuthorityState)
    && ["NOT_APPLIED", "NOT_EVALUABLE"].includes(input.budgetDisposition)) {
    return "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED";
  }
  return input.priceAuthorityState === "VERIFIED_CURRENT" && input.budgetDisposition === "NOT_APPLIED"
    ? "FULLY_ELIGIBLE"
    : "INELIGIBLE";
}
