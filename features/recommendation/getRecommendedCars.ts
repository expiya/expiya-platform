import { cars } from "@/data/car";
import { DecisionContext } from "@/types/decisionContext";
import { createDecisionSummary } from "@/features/decision/createDecisionSummary";
import { evaluateCar } from "@/features/decision/engine";
import { defaultRanking } from "@/features/recommendation/ranking/defaultRanking";
import { RecommendedCar } from "@/types/recommendation";

export function getRecommendedCars(
  context: DecisionContext,
  optionIds?: readonly string[],
): RecommendedCar[] {
  const eligibleCars = optionIds
    ? cars.filter((car) => optionIds.includes(car.id))
    : cars;
  const evaluatedCars = eligibleCars.map((car) => {
    const decision = evaluateCar(car, context);

    return {
      car,
      decision: createDecisionSummary(decision),
      isTopPick: false,
    };
  });

  const rankedCars = defaultRanking(evaluatedCars);

  return rankedCars.map((recommendedCar, index) => ({
    ...recommendedCar,
    isTopPick: index === 0,
  }));
}
