import type { ConstraintEvent } from "../domain/constraint";
import type { UsageCargoNeed } from "./types";

const terminal = (events: readonly ConstraintEvent[]) => {
  const superseded = new Set(events.flatMap((event) => event.supersedesId ? [event.supersedesId] : []));
  return events.filter((event) => event.status === "ACTIVE" && !superseded.has(event.id));
};

export function projectUsageCargoNeedFromConstraints(events: readonly ConstraintEvent[]): UsageCargoNeed {
  const active = terminal(events); const architecture = [...active].reverse().find((event) => event.field === "usageArchitecture");
  const usageScenarioEvent = [...active].reverse().find((event) => event.field === "usageScenario");
  const rearSeat = [...active].reverse().find((event) => event.field === "rearSeatPreference");
  const source = architecture?.sourceText ?? "";
  const normalized = architecture?.normalizedValue as { operator?: unknown; value?: unknown } | undefined;
  const required = normalized?.operator === "EQUALS" && typeof normalized.value === "string" ? normalized.value : undefined;
  const allowed = normalized?.operator === "ONE_OF" && Array.isArray(normalized.value)
    ? normalized.value.filter((value): value is "PASSENGER_CAR" | "PASSENGER_CARRIER" | "ENCLOSED_CARGO" | "OPEN_CARGO" | "CAB_CHASSIS" => typeof value === "string" && ["PASSENGER_CAR", "PASSENGER_CARRIER", "ENCLOSED_CARGO", "OPEN_CARGO", "CAB_CHASSIS"].includes(value))
    : undefined;
  const validArchitecture = ["PASSENGER_CAR", "PASSENGER_CARRIER", "ENCLOSED_CARGO", "OPEN_CARGO", "CAB_CHASSIS"].includes(required ?? "") ? required as "PASSENGER_CAR" | "PASSENGER_CARRIER" | "ENCLOSED_CARGO" | "OPEN_CARGO" | "CAB_CHASSIS" : undefined;
  const urban = /şehir içi dağıtım|mal dağıt|urban delivery/iu.test(source);
  const cargoArchitecture = validArchitecture === "ENCLOSED_CARGO" || validArchitecture === "OPEN_CARGO" || validArchitecture === "CAB_CHASSIS" || Boolean(allowed?.some((value) => ["ENCLOSED_CARGO", "OPEN_CARGO", "CAB_CHASSIS"].includes(value)));
  return Object.freeze({
    ...(typeof usageScenarioEvent?.normalizedValue === "string" && ["URBAN_DAILY", "FAMILY", "LONG_DISTANCE", "URBAN_DELIVERY", "GENERAL_CARGO", "PASSENGER_TRANSPORT", "ROUGH_ROAD", "MUD_SNOW", "SERIOUS_OFF_ROAD"].includes(usageScenarioEvent.normalizedValue)
      ? { usageScenario: { scenario: usageScenarioEvent.normalizedValue as import("./variantUsageClassification").VariantUsageScenario, decisionEffect: ["ROUGH_ROAD", "MUD_SNOW"].includes(usageScenarioEvent.normalizedValue) ? "MEDIUM_RANK" as const : "HARD_MEMBERSHIP" as const } }
      : {}),
    commercialScenario: urban ? "URBAN_DELIVERY" : cargoArchitecture ? "GENERAL_CARGO" : "UNSPECIFIED",
    orientation: cargoArchitecture ? "CARGO_PRIORITY" : "UNKNOWN",
    ...(validArchitecture || allowed?.length ? { architectureRequirement: { ...(validArchitecture ? { required: validArchitecture } : {}), ...(allowed?.length ? { allowed } : {}), explicitness: architecture?.decisionEffect === "HARD_FILTER" ? "USER_EXPLICIT" as const : "INFERRED" as const } } : {}),
    ...(rearSeat?.normalizedValue === "NOT_NEEDED" ? { rearSeatPreference: { requirement: "NOT_NEEDED" as const, presenceConstraint: "NO_CONSTRAINT" as const } } : rearSeat?.normalizedValue === "MUST_NOT_HAVE" ? { rearSeatPreference: { requirement: "UNKNOWN" as const, presenceConstraint: "MUST_NOT_HAVE" as const } } : {}),
    ...(/büyük panel ?van gerekmiyor|caddy tarz|kompakt/iu.test(source) ? { cargoCapacityPreference: { preferredClass: "COMPACT_CARGO" as const, decisionEffect: "STRONG_RANK" as const } } : {}),
  });
}
