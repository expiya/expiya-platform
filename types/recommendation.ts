import { Car } from "@/types/car";
import { DecisionSummary } from "@/types/decisionSummary";
import type { ConsumerExperienceEvidence } from "@/types/consumerExperience";
import type { CarsPriceValidityStatus } from "@/types/carsConversation";

export interface RecommendedCarPricePresentation {
  readonly amountTry: number;
  readonly priceType: "LIST" | "CAMPAIGN";
  readonly validFrom?: string;
  readonly validUntil?: string;
  readonly validityStatus: CarsPriceValidityStatus;
  readonly caveat?: string;
}

export interface RecommendedCar {
  car: Car;
  decision: DecisionSummary;
  isTopPick: boolean;
  consumerExperience?: ConsumerExperienceEvidence;
  configurationKind?: "NEW_VEHICLE_CONFIGURATION";
  pricePresentation?: RecommendedCarPricePresentation;
}
