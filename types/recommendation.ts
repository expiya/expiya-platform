import { Car } from "@/types/car";
import { DecisionResult } from "@/types/decision";

export interface RecommendedCar {
  car: Car;
  decision: DecisionResult;
  isTopPick: boolean;
}
