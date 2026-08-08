import { Car } from "@/types/car";
import { DecisionSummary } from "@/types/decisionSummary";

export interface RecommendedCar {
  car: Car;
  decision: DecisionSummary;
  isTopPick: boolean;
}
