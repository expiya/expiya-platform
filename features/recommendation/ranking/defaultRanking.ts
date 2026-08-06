import { RecommendedCar } from "@/types/recommendation";

export function defaultRanking(
  recommendedCars: RecommendedCar[],
): RecommendedCar[] {
  return [...recommendedCars].sort(
    (a, b) => b.decision.score - a.decision.score,
  );
}
