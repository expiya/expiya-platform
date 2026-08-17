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

function runningCostSignals(snapshot: CatalogSnapshot): readonly RankingSignal[] {
  const rows = snapshot.variants.flatMap((variant) => {
    const litres = variant.decisionFacts.efficiency.combinedLitresPer100Km;
    const kwh = variant.decisionFacts.efficiency.combinedKwhPer100Km;
    const fact = litres ?? kwh;
    if (!fact || !Number.isFinite(fact.value) || fact.value <= 0 || fact.confidence === "LOW" || fact.provenance.length === 0) return [];
    return [{ id: variant.id, value: fact.value, cohort: litres ? "COMBUSTION" : "ELECTRIC" }];
  });
  return Object.freeze(rows.map((row) => {
    const cohort = rows.filter((candidate) => candidate.cohort === row.cohort);
    const lower = cohort.filter((candidate) => candidate.value < row.value).length;
    const score = cohort.length <= 1 ? 1 : 1 - (lower / (cohort.length - 1));
    return Object.freeze({ exactVariantId: row.id, score, reasonCode: `VERIFIED_LOW_RUNNING_COST_${row.cohort}_SIGNAL` });
  }));
}

export function createExplicitFunctionalPreferenceSignals(input: {
  readonly snapshot: CatalogSnapshot;
  readonly constraints: readonly ActiveNonHardConstraint[];
}): readonly RankingSignal[] {
  const signals: RankingSignal[] = [];
  for (const constraint of input.constraints.filter((item) => item.decisionEffect === "STRONG_RANK")) {
    if (constraint.fieldId === "runningCostPreference" && constraint.normalizedValue === "LOW_RUNNING_COST") { signals.push(...runningCostSignals(input.snapshot)); continue; }
    for (const variant of input.snapshot.variants) {
      if (matches(factValue(variant, constraint.fieldId), constraint.normalizedValue)) signals.push(Object.freeze({ exactVariantId: variant.id, score: 1, reasonCode: `EXPLICIT_${constraint.fieldId.toUpperCase()}_MATCH` }));
    }
  }
  return Object.freeze(signals);
}
