import { cars } from "@/data/car";
import { DecisionContext } from "@/types/decisionContext";
import { createDecisionSummary } from "@/features/decision/createDecisionSummary";
import { evaluateCar } from "@/features/decision/engine";
import { defaultRanking } from "@/features/recommendation/ranking/defaultRanking";
import { RecommendedCar } from "@/types/recommendation";

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

function matchesExplicitContext(car: (typeof cars)[number], text: string): boolean {
  const priceLimit = requestedMaximum(text, "price");
  const kmLimit = requestedMaximum(text, "km");
  if (priceLimit !== undefined && car.price > priceLimit) return false;
  if (kmLimit !== undefined && car.km > kmLimit) return false;

  const fuelRequests: [RegExp, string][] = [
    [/\b(?:gasoline|petrol|benzin(?:li)?)\b/i, "Gasoline"],
    [/\b(?:electric|elektrik(?:li)?)\b/i, "Electric"],
  ];
  const requestedFuel = fuelRequests.find(([pattern]) => pattern.test(text));
  if (requestedFuel && car.fuel !== requestedFuel[1]) return false;
  if (/\b(?:automatic|otomatik)\b/i.test(text) && car.transmission !== "Automatic") return false;

  return true;
}

export function getRecommendedCars(
  context: DecisionContext,
  optionIds?: readonly string[],
): RecommendedCar[] {
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
    };
  });

  const rankedCars = defaultRanking(evaluatedCars);

  return rankedCars.map((recommendedCar, index) => ({
    ...recommendedCar,
    isTopPick: index === 0,
  }));
}
