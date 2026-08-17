import type { CatalogSnapshot, CatalogVariantSnapshot } from "../catalog/types";
import type { ActiveNonHardConstraint } from "../filter/types";
import type { RankingSignal } from "./types";

function transmissionClass(value: string): "AUTOMATIC" | "MANUAL" {
  return /manual/iu.test(value) ? "MANUAL" : "AUTOMATIC";
}

function factValue(variant: CatalogVariantSnapshot, fieldId: string): unknown {
  if (fieldId === "bodyStyle") return variant.decisionFacts.bodyStyle.value;
  if (fieldId === "fuelType") return variant.decisionFacts.powertrain.fuelType.value;
  if (fieldId === "transmission") return transmissionClass(variant.decisionFacts.powertrain.transmission.value);
  if (fieldId === "drivenWheels") return variant.decisionFacts.powertrain.drivenWheels?.value;
  return undefined;
}

function matches(actual: unknown, normalized: unknown): boolean {
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return false;
  const { operator, value } = normalized as { operator?: unknown; value?: unknown };
  if (operator === "EQUALS") return actual === value;
  if (operator === "ONE_OF" && Array.isArray(value)) return value.includes(actual);
  if (operator === "EXCLUDES" && Array.isArray(value)) return !value.includes(actual);
  return false;
}

export function createExplicitFunctionalPreferenceSignals(input: {
  readonly snapshot: CatalogSnapshot;
  readonly constraints: readonly ActiveNonHardConstraint[];
}): readonly RankingSignal[] {
  const signals: RankingSignal[] = [];
  for (const constraint of input.constraints.filter((item) => item.decisionEffect === "STRONG_RANK")) {
    for (const variant of input.snapshot.variants) {
      if (matches(factValue(variant, constraint.fieldId), constraint.normalizedValue)) signals.push(Object.freeze({ exactVariantId: variant.id, score: 1, reasonCode: `EXPLICIT_${constraint.fieldId.toUpperCase()}_MATCH` }));
    }
  }
  return Object.freeze(signals);
}
