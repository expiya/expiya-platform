import { cars } from "@/data/car";
import { evaluateCar } from "@/features/decision/engine";
import { defaultRanking } from "@/features/recommendation/ranking/defaultRanking";
import { RecommendedCar } from "@/types/recommendation";

export function getRecommendedCars(): RecommendedCar[] {
  const evaluatedCars = cars.map((car) => ({
    car,
    decision: evaluateCar(car),
    isTopPick: false,
  }));

  const rankedCars = defaultRanking(evaluatedCars);

  return rankedCars.map((recommendedCar, index) => ({
    ...recommendedCar,
    isTopPick: index === 0,
  }));
}
