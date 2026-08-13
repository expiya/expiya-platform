import { cars as fixtureCars } from "@/data/car";
import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { adaptPublishedCatalogToCars } from "@/features/vehicle-data/adaptPublishedCatalogToCars";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import type { Car } from "@/types/car";

export type CarsCatalogMode = "fixture" | "production";

export interface RecommendationCatalogResolution {
  readonly mode: CarsCatalogMode;
  readonly cars: readonly Car[];
  readonly limitations: readonly string[];
}

export function resolveRecommendationCatalog(
  mode: CarsCatalogMode,
  at = new Date(),
): RecommendationCatalogResolution {
  if (mode === "fixture") {
    return { mode, cars: fixtureCars, limitations: ["test-fixture-only", "not-production-evidence"] };
  }
  const published = buildPublishedCatalog(pilotVehicleRecords, at);
  const adapted = adaptPublishedCatalogToCars(published);
  return {
    mode,
    cars: adapted.cars,
    limitations: [
      ...published.rejected.map(({ vehicleVariantId, issues }) => `${vehicleVariantId}:${issues.join(",")}`),
      ...adapted.rejectedVehicleVariantIds.map((id) => `${id}:LEGACY_ADAPTATION_FAILED`),
    ],
  };
}

export function configuredCarsCatalogMode(value = process.env.EXPIYA_CARS_CATALOG_MODE): CarsCatalogMode {
  return value === "production" ? "production" : "fixture";
}
