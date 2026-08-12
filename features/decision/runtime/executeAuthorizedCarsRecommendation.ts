import { getRecommendedCars } from "@/features/recommendation/getRecommendedCars";
import type { DecisionContext } from "@/types/decisionContext";
import type { RecommendedCar } from "@/types/recommendation";

export interface ExecuteAuthorizedCarsRecommendationInput {
  readonly context: DecisionContext;
  readonly optionIds?: readonly string[];
}

export function executeAuthorizedCarsRecommendation(
  input: ExecuteAuthorizedCarsRecommendationInput,
): readonly RecommendedCar[] {
  return getRecommendedCars(input.context, input.optionIds);
}
