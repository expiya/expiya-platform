import type { ProvenanceRecord, SourcedValue, TurkeyVehicleVariant } from "@/types/productionVehicle";

export interface VariantFact {
  readonly key: string;
  readonly value: unknown;
  readonly unit?: string;
  readonly confidence: SourcedValue<unknown>["confidence"];
  readonly conflictGroupId?: string;
  readonly provenance: readonly ProvenanceRecord[];
  readonly validFrom: string;
  readonly ingestionKey: string;
}

const units: Readonly<Record<string, string>> = {
  "powertrain.engineDisplacementCc": "cc",
  "powertrain.powerKw": "kW",
  "powertrain.torqueNm": "Nm",
  "dimensions.lengthMm": "mm",
  "dimensions.widthMm": "mm",
  "dimensions.heightMm": "mm",
  "dimensions.wheelbaseMm": "mm",
  "dimensions.seats": "count",
  "dimensions.luggageLitres": "L",
  "dimensions.cargoVolumeLitres": "L",
  "dimensions.payloadKg": "kg",
  "dimensions.brakedTowingKg": "kg",
  "efficiency.combinedLitresPer100Km": "L/100km",
  "efficiency.combinedKwhPer100Km": "kWh/100km",
  "efficiency.electricRangeKm": "km",
  "efficiency.batteryCapacityKwh": "kWh",
  "efficiency.batteryUsableKwh": "kWh",
  "efficiency.maxDcChargeKw": "kW",
};

function fact(variantId: string, key: string, sourced: SourcedValue<unknown>): VariantFact {
  const validFrom = sourced.provenance[0].accessedAt;
  return {
    key, value: sourced.value, unit: units[key], confidence: sourced.confidence,
    conflictGroupId: sourced.conflictGroupId, provenance: sourced.provenance, validFrom,
    ingestionKey: [variantId, key, validFrom, sourced.conflictGroupId ?? "canonical"].join(":"),
  };
}

export function flattenVariantFacts(variant: TurkeyVehicleVariant): readonly VariantFact[] {
  const facts: VariantFact[] = [];
  const add = (key: string, value?: SourcedValue<unknown>) => { if (value) facts.push(fact(variant.id, key, value)); };

  add("generation", variant.generation);
  add("onSaleFrom", variant.onSaleFrom);
  add("onSaleUntil", variant.onSaleUntil);
  add("vehicleUseClass", variant.vehicleUseClass);
  for (const [key, value] of Object.entries(variant.powertrain)) add(`powertrain.${key}`, value);
  for (const [key, value] of Object.entries(variant.dimensions)) add(`dimensions.${key}`, value);
  for (const [key, value] of Object.entries(variant.efficiency)) add(`efficiency.${key}`, value);
  variant.safetyFeatureCodes.forEach((value, index) => add(`safetyFeatureCodes.${index}`, value));
  return facts;
}
