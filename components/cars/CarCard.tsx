import type { RecommendedCar } from "@/types/recommendation";
import { XpyDecisionCard } from "@/components/xpy/XpyDecisionCard";
import { LEGACY_CARS_STAGE_ONE_PRESENTATION } from "@/features/xpy/carsStageOneAdapters";

interface CarCardProps {
  recommendedCar: RecommendedCar;
  locale?: "tr" | "en";
  position?: number;
}

export function CarCard({ recommendedCar, locale = "tr", position = 1 }: CarCardProps) {
  void locale; void position;
  return <XpyDecisionCard card={LEGACY_CARS_STAGE_ONE_PRESENTATION.project(recommendedCar)}/>;
}
