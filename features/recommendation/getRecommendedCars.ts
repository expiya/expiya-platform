import { DecisionContext } from "@/types/decisionContext";
import type { Car } from "@/types/car";
import { createDecisionSummary } from "@/features/decision/createDecisionSummary";
import { evaluateCar } from "@/features/decision/engine";
import { defaultRanking } from "@/features/recommendation/ranking/defaultRanking";
import { RecommendedCar } from "@/types/recommendation";
import { consumerExperienceByCarId } from "@/data/consumerExperience";
import {
  carSatisfiesUseRequirements,
  resolveVehicleUseRequirements,
} from "@/features/recommendation/resolveVehicleUseRequirements";
import {
  type CarsCatalogMode,
  configuredCarsCatalogMode,
  resolveRecommendationCatalog,
} from "@/features/vehicle-data/resolveRecommendationCatalog";

export interface CarsRecommendationDataOptions {
  readonly catalogMode?: CarsCatalogMode;
  readonly at?: Date;
}

function contextText(context: DecisionContext): string {
  return [
    context.decisionNeed,
    ...context.userContext.needs,
    ...context.userContext.priorities,
    ...context.userContext.preferences,
    ...context.userContext.constraints,
    ...context.userContext.usageConditions,
    ...context.evaluationContext.decisionCriteria,
  ].join(" ").toLocaleLowerCase("en-US");
}

function requestedMaximum(text: string, unit: "price" | "km"): number | undefined {
  const patterns = unit === "price"
    ? [
        /(?:budget|under|up to|max(?:imum)?)[^\d]{0,20}([\d.,]+)\s*(million|milyon)?\s*(?:tl|₺)?/gi,
        /([\d.,]+)\s*(million|milyon)\s*(?:tl|₺)/gi,
      ]
    : [/(?:under|up to|max(?:imum)?)[^\d]{0,20}([\d.,]+)\s*(?:km|kilometers?)/gi];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    const match = matches.at(-1);
    if (!match) continue;
    const numeric = Number(match[1].replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
    if (!Number.isFinite(numeric)) continue;
    return /million|milyon/i.test(match[2] ?? "") ? numeric * 1_000_000 : numeric;
  }
}

function matchesExplicitContext(car: Car, text: string): boolean {
  const priceLimit = requestedMaximum(text, "price");
  const kmLimit = requestedMaximum(text, "km");
  if (priceLimit !== undefined && car.price > priceLimit) return false;
  if (kmLimit !== undefined && car.km > kmLimit) return false;
  if (/(?:^|\b)(?:sıfır|0\s*km|zero[ -]?kilomet(?:er|re)|brand new)(?:\b|$)/iu.test(text) && car.km !== 0) return false;

  const useRequirements = resolveVehicleUseRequirements(text);
  if (!carSatisfiesUseRequirements(car, useRequirements)) return false;

  const exclusiveFuel: [RegExp, string[]][] = [
    [/(?:sadece|yalnızca|only)[^.!?]{0,40}(?:benzinli\s*\/\s*hibrit|gasoline\s*(?:or|\/)\s*hybrid)/i, ["Gasoline", "Hybrid"]],
    [/(?:sadece|yalnızca|only)[^.!?]{0,30}(?:electric|elektrik)|(?:electric|elektrikli)[^.!?]{0,20}(?:istiyorum|olsun|tercih|only)/i, ["Electric"]],
    [/(?:sadece|yalnızca|only)[^.!?]{0,30}(?:gasoline|petrol|benzin)|(?:gasoline|petrol|benzinli)[^.!?]{0,20}(?:istiyorum|olsun|tercih|only|car|araç)/i, ["Gasoline"]],
    [/(?:hybrid|hibrit)[^.!?]{0,20}(?:istiyorum|olsun|tercih|only)/i, ["Hybrid"]],
  ];
  const requestedFuels = exclusiveFuel.find(([pattern]) => pattern.test(text))?.[1];
  if (requestedFuels && !requestedFuels.includes(car.fuel)) return false;
  if (/(?:elektrik(?:li)?|electric)[^.!?]{0,20}(?:istemiyorum|olmasın|hariç|no electric)/i.test(text) && car.fuel === "Electric") return false;
  if (/\b(?:automatic|otomatik)\b/i.test(text) && car.transmission !== "Automatic") return false;
  if (/\b(?:manual|manuel|düz vites)\b/i.test(text) && car.transmission !== "Manual") return false;

  const requestedBodyType: [RegExp, (typeof car.bodyType)[]][] = [
    [/\b(?:pick-up|pickup|kamyonet)\b/i, ["Pickup"]],
    [/\b(?:van|minibüs|ticari araç)\b/i, ["Van"]],
    [/\b(?:suv)\b/i, ["SUV"]],
    [/\b(?:coupe|kup|roadster|spor araba)\b/i, ["Coupe"]],
    [/\b(?:hatchback|küçük araba|kompakt araba|şehir otomobili)\b/i, ["Hatchback"]],
    [/\b(?:sedan)\b/i, ["Sedan"]],
  ];
  const bodyTypes = requestedBodyType.find(([pattern]) => pattern.test(text))?.[1];
  if (bodyTypes && !bodyTypes.includes(car.bodyType)) return false;

  if (/\b(?:klasik|classic|nostaljik)\b/i.test(text) && car.year > 1999) return false;
  if (/\b(?:off-road|offroad|arazi|4x4)\b/i.test(text)) {
    const offRoadModels = new Set(["Duster", "Wrangler", "Defender 110"]);
    if (!offRoadModels.has(car.model)) return false;
  }

  return true;
}

export function getRecommendedCars(
  context: DecisionContext,
  optionIds?: readonly string[],
  dataOptions: CarsRecommendationDataOptions = {},
): RecommendedCar[] {
  const cars = resolveRecommendationCatalog(
    dataOptions.catalogMode ?? configuredCarsCatalogMode(),
    dataOptions.at,
  ).cars;
  const scopedCars = optionIds
    ? cars.filter((car) => optionIds.includes(car.id))
    : cars;
  const text = contextText(context);
  const eligibleCars = scopedCars.filter((car) => matchesExplicitContext(car, text));
  const evaluatedCars = eligibleCars.map((car) => {
    const decision = evaluateCar(car, context);

    return {
      car,
      decision: createDecisionSummary(decision),
      isTopPick: false,
      consumerExperience: consumerExperienceByCarId[car.id],
    };
  });

  const rankedCars = defaultRanking(evaluatedCars);
  const prioritizesLowestPrice = /(?:en\s+ucuz|en\s+düşük\s+(?:fiyat|satın alma maliyet)|lowest\s+(?:price|purchase cost)|cheapest)/iu.test(text);
  const orderedCars = prioritizesLowestPrice
    ? [...rankedCars].sort((a, b) => a.car.price - b.car.price || b.decision.score - a.decision.score)
    : rankedCars;

  return orderedCars.slice(0, 3).map((recommendedCar, index) => ({
    ...recommendedCar,
    isTopPick: index === 0,
  }));
}
