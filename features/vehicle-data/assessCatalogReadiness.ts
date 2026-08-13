import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";

export type CatalogReadinessIssue =
  | "TECHNICAL_VARIANT_MISSING"
  | "ACTIVE_NEW_PRICE_MISSING"
  | "POWERTRAIN_INCOMPLETE"
  | "EFFICIENCY_INCOMPLETE"
  | "SAFETY_EVIDENCE_MISSING";

export interface CatalogReadinessAssessment {
  readonly ready: boolean;
  readonly activePriceId?: string;
  readonly issues: readonly CatalogReadinessIssue[];
}

export function assessCatalogReadiness(
  record: PilotVehicleRecord,
  at: Date,
): CatalogReadinessAssessment {
  const issues: CatalogReadinessIssue[] = [];
  const activePrice = record.prices.find((price) =>
    price.condition === "NEW" &&
    new Date(price.validFrom).getTime() <= at.getTime() &&
    (price.validUntil === undefined || new Date(price.validUntil).getTime() >= at.getTime()),
  );
  if (!activePrice) issues.push("ACTIVE_NEW_PRICE_MISSING");

  const variant = record.technicalVariant;
  if (!variant) {
    issues.push("TECHNICAL_VARIANT_MISSING");
  } else {
    if (!variant.powertrain.fuelType || !variant.powertrain.powerKw || !variant.powertrain.transmission) {
      issues.push("POWERTRAIN_INCOMPLETE");
    }
    const isElectric = variant.powertrain.fuelType.value === "BEV";
    const batteryCapacity = variant.efficiency.batteryCapacityKwh ?? variant.efficiency.batteryUsableKwh;
    if (isElectric && (!variant.efficiency.protocol || !variant.efficiency.electricRangeKm || !batteryCapacity)) {
      issues.push("EFFICIENCY_INCOMPLETE");
    }
    if (variant.safetyFeatureCodes.length === 0) issues.push("SAFETY_EVIDENCE_MISSING");
  }

  return { ready: issues.length === 0, activePriceId: activePrice?.id, issues };
}
