import type { CatalogSnapshot } from "./types";

export interface CatalogDecisionFactCoverage {
  readonly totalVariants: number;
  readonly fields: Readonly<Record<string, number>>;
  readonly publicPriceObservations: number;
  readonly internalEstimateObservations: number;
}

export function calculateCatalogDecisionFactCoverage(snapshot: CatalogSnapshot): CatalogDecisionFactCoverage {
  const count = (present: (variant: CatalogSnapshot["variants"][number]) => unknown) => snapshot.variants.filter((variant) => present(variant) !== undefined).length;
  return Object.freeze({
    totalVariants: snapshot.variants.length,
    fields: Object.freeze({
      vehicleUseClass: count((variant) => variant.decisionFacts.vehicleUseClass), bodyStyle: count((variant) => variant.decisionFacts.bodyStyle),
      seats: count((variant) => variant.decisionFacts.dimensions.seats), luggageLitres: count((variant) => variant.decisionFacts.dimensions.luggageLitres),
      cargoVolumeLitres: count((variant) => variant.decisionFacts.dimensions.cargoVolumeLitres), payloadKg: count((variant) => variant.decisionFacts.dimensions.payloadKg),
      lengthMm: count((variant) => variant.decisionFacts.dimensions.lengthMm), widthMm: count((variant) => variant.decisionFacts.dimensions.widthMm),
      fuelType: count((variant) => variant.decisionFacts.powertrain.fuelType), transmission: count((variant) => variant.decisionFacts.powertrain.transmission),
      drivenWheels: count((variant) => variant.decisionFacts.powertrain.drivenWheels), powerKw: count((variant) => variant.decisionFacts.powertrain.powerKw),
      protocol: count((variant) => variant.decisionFacts.efficiency.protocol),
      combinedLitresPer100Km: count((variant) => variant.decisionFacts.efficiency.combinedLitresPer100Km),
      combinedKwhPer100Km: count((variant) => variant.decisionFacts.efficiency.combinedKwhPer100Km),
      electricRangeKm: count((variant) => variant.decisionFacts.efficiency.electricRangeKm),
      batteryCapacityKwh: count((variant) => variant.decisionFacts.efficiency.batteryCapacityKwh),
      batteryUsableKwh: count((variant) => variant.decisionFacts.efficiency.batteryUsableKwh),
      maxDcChargeKw: count((variant) => variant.decisionFacts.efficiency.maxDcChargeKw),
    }),
    publicPriceObservations: snapshot.variants.filter((variant) => variant.activeNewPrice?.consumerVisibility === "PUBLIC").length,
    internalEstimateObservations: snapshot.variants.filter((variant) => variant.activeNewPrice?.priceType === "ESTIMATE" && variant.activeNewPrice.consumerVisibility === "INTERNAL_ONLY").length,
  });
}
