import { cars } from "@/data/car";
import { createDecisionSummary } from "@/features/decision/createDecisionSummary";
import { evaluateCar } from "@/features/decision/engine";
import { defaultRanking } from "@/features/recommendation/ranking/defaultRanking";
import { RecommendedCar } from "@/types/recommendation";

export function getRecommendedCars(): RecommendedCar[] {
  const evaluatedCars = cars.map((car) => {
    const decision = evaluateCar(car);

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
