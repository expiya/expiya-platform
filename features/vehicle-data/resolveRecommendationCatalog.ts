import { cars as fixtureCars } from "@/data/car";
import activeCatalogPointer from "@/data/production/catalog/active.json";
import activeCatalogPayload from "@/data/production/catalog/releases/v0.8.0/catalog.json";
import activeCatalogManifest from "@/data/production/catalog/releases/v0.8.0/manifest.json";
import { adaptPublishedCatalogToCars } from "@/features/vehicle-data/adaptPublishedCatalogToCars";
import type { PublishedCatalog, PublishedVehicleRecord } from "@/features/vehicle-data/buildPublishedCatalog";
import {
  validateProductionCatalogActivation,
  validateProductionCatalogRelease,
  type ProductionCatalogActivation,
  type ProductionCatalogReleaseManifest,
  type ProductionCatalogReleasePayload,
} from "@/features/vehicle-data/productionCatalogRelease";
import type { Car } from "@/types/car";
import type { VehicleCatalogReadRepository } from "@/features/vehicle-data/catalogReadRepository";

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
  const payload = activeCatalogPayload as unknown as ProductionCatalogReleasePayload;
  const manifest = activeCatalogManifest as unknown as ProductionCatalogReleaseManifest;
  const activation = activeCatalogPointer as ProductionCatalogActivation;
  const authorityErrors = [
    ...validateProductionCatalogRelease(payload, manifest),
    ...validateProductionCatalogActivation(activation, manifest),
  ];
  if (authorityErrors.length > 0) {
    throw new Error(`ACTIVE_PRODUCTION_CATALOG_INVALID:${authorityErrors.join(",")}`);
  }
  const activeRecords: PublishedVehicleRecord[] = [];
  const rejected: PublishedCatalog["rejected"][number][] = [];
  for (const record of payload.records) {
    const validFrom = new Date(record.activeNewPrice.validFrom);
    if (validFrom <= at) activeRecords.push(record);
    else rejected.push({ vehicleVariantId: record.variant.id, issues: ["ACTIVE_NEW_PRICE_MISSING"] });
  }
  const published: PublishedCatalog = {
    records: Object.freeze(activeRecords),
    rejected: Object.freeze(rejected),
    generatedAt: at.toISOString(),
  };
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

export async function resolveRecommendationCatalogFromRepository(
  mode: CarsCatalogMode,
  repository: VehicleCatalogReadRepository,
  at = new Date(),
): Promise<RecommendationCatalogResolution> {
  if (mode === "fixture") return resolveRecommendationCatalog(mode, at);
  return repository.readPublishedCatalog(at);
}
