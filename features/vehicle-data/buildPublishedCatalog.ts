import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";
import type { PriceObservation, TurkeyVehicleVariant } from "@/types/productionVehicle";

export interface PublishedVehicleRecord {
  readonly variant: TurkeyVehicleVariant;
  readonly activeNewPrice: PriceObservation;
}

export interface PublishedCatalog {
  readonly records: readonly PublishedVehicleRecord[];
  readonly rejected: readonly {
    vehicleVariantId: string;
    issues: ReturnType<typeof assessCatalogReadiness>["issues"];
  }[];
  readonly generatedAt: string;
}

export function buildPublishedCatalog(
  records: readonly PilotVehicleRecord[],
  at: Date,
): PublishedCatalog {
  const published: PublishedVehicleRecord[] = [];
  const rejected: PublishedCatalog["rejected"][number][] = [];

  for (const record of records) {
    const assessment = assessCatalogReadiness(record, at);
    const variant = record.technicalVariant;
    const activeNewPrice = record.prices.find((price) => price.id === assessment.activePriceId);
    if (!assessment.ready || !variant || !activeNewPrice) {
      rejected.push({ vehicleVariantId: record.identity.id, issues: assessment.issues });
      continue;
    }
    published.push({ variant, activeNewPrice });
  }

  return Object.freeze({
    records: Object.freeze(published),
    rejected: Object.freeze(rejected),
    generatedAt: at.toISOString(),
  });
}
