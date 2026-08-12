import { Car } from "@/types/car";
import { DecisionSummary } from "@/types/decisionSummary";
import type { ConsumerExperienceEvidence } from "@/types/consumerExperience";

export interface RecommendedCar {
  car: Car;
  decision: DecisionSummary;
  isTopPick: boolean;
  consumerExperience?: ConsumerExperienceEvidence;
}
