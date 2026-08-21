import type { CatalogVariantSnapshot } from "../catalog/types";

export const VARIANT_USAGE_SCENARIOS = Object.freeze([
  "URBAN_DAILY", "FAMILY", "LONG_DISTANCE", "URBAN_DELIVERY", "GENERAL_CARGO",
  "PASSENGER_TRANSPORT", "ROUGH_ROAD", "MUD_SNOW", "SERIOUS_OFF_ROAD",
] as const);

export type VariantUsageScenario = typeof VARIANT_USAGE_SCENARIOS[number];
export type UsageScenarioDecisionEffect = "HARD_MEMBERSHIP" | "MEDIUM_RANK";

const PASSENGER_BODIES = new Set(["Sedan", "Hatchback", "SUV", "Crossover", "Fastback SUV", "Liftback", "Station Wagon", "MPV", "Passenger Van"]);
const COMMERCIAL_BODIES = new Set(["Panel Van", "Passenger Van", "MPV", "Pickup", "Chassis Cab"]);
const RAISED_BODIES = new Set(["SUV", "Crossover", "Fastback SUV", "Pickup"]);

function normalizedDrive(value: string | undefined): string {
  return (value ?? "").toLocaleUpperCase("tr-TR").replace(/\s+/gu, "");
}

export function usageScenarioDecisionEffect(scenario: VariantUsageScenario): UsageScenarioDecisionEffect {
  return scenario === "ROUGH_ROAD" || scenario === "MUD_SNOW" ? "MEDIUM_RANK" : "HARD_MEMBERSHIP";
}

export function classifyVariantUsageScenarios(variant: CatalogVariantSnapshot): readonly VariantUsageScenario[] {
  const body = variant.decisionFacts.bodyStyle.value;
  const useClass = variant.decisionFacts.vehicleUseClass?.value;
  const seats = variant.decisionFacts.dimensions.seats?.value;
  const drive = normalizedDrive(variant.decisionFacts.powertrain.drivenWheels?.value);
  const awd = drive === "AWD" || drive === "4X4" || drive === "4WD";
  const scenarios = new Set<VariantUsageScenario>();

  if (PASSENGER_BODIES.has(body) || useClass === "PASSENGER") scenarios.add("URBAN_DAILY");
  if (PASSENGER_BODIES.has(body) && body !== "Passenger Van" && (seats === undefined || seats >= 4)) scenarios.add("FAMILY");
  if (PASSENGER_BODIES.has(body) && (seats === undefined || seats >= 4)) scenarios.add("LONG_DISTANCE");
  if ((["Panel Van", "Passenger Van", "MPV", "Pickup"].includes(body) || useClass === "LIGHT_COMMERCIAL") && body !== "Chassis Cab" && useClass !== "HEAVY_COMMERCIAL") scenarios.add("URBAN_DELIVERY");
  if (COMMERCIAL_BODIES.has(body) || useClass === "LIGHT_COMMERCIAL" || useClass === "HEAVY_COMMERCIAL") scenarios.add("GENERAL_CARGO");
  if (body === "Passenger Van" || body === "MPV" || (typeof seats === "number" && seats >= 7)) scenarios.add("PASSENGER_TRANSPORT");
  if (RAISED_BODIES.has(body)) {
    scenarios.add("ROUGH_ROAD");
    scenarios.add("MUD_SNOW");
  }
  if (awd && RAISED_BODIES.has(body)) scenarios.add("SERIOUS_OFF_ROAD");

  // Closed-world coverage invariant: unusual passenger architectures still
  // remain classifiable without inventing a stronger specialist use case.
  if (scenarios.size === 0) scenarios.add("URBAN_DAILY");
  return Object.freeze(VARIANT_USAGE_SCENARIOS.filter((scenario) => scenarios.has(scenario)));
}

export function variantMatchesUsageScenario(variant: CatalogVariantSnapshot, scenario: VariantUsageScenario): boolean {
  return classifyVariantUsageScenarios(variant).includes(scenario);
}
