import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import { vehicleDataSourceById } from "@/data/production/vehicleDataSources";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";
import type { VehicleDataRepository } from "@/features/vehicle-data/repository";
import { validatePriceObservations } from "@/features/vehicle-data/validatePriceObservations";
import { validateProductionVehicleIdentity } from "@/features/vehicle-data/validateProductionVehicle";

export interface PilotCatalogImportReport {
  readonly dryRun: boolean;
  readonly acceptedVehicleVariantIds: readonly string[];
  readonly rejected: readonly { vehicleVariantId: string; issues: readonly string[] }[];
  readonly importedCount: number;
}

export async function importPilotCatalog(
  records: readonly PilotVehicleRecord[],
  repository: VehicleDataRepository,
  at: Date,
  options: { readonly dryRun?: boolean } = {},
): Promise<PilotCatalogImportReport> {
  const accepted: PilotVehicleRecord[] = [];
  const rejected: PilotCatalogImportReport["rejected"][number][] = [];

  for (const record of records) {
    const identity = validateProductionVehicleIdentity(record.identity, vehicleDataSourceById, at);
    const observationTime = new Date(record.prices[0]?.validFrom ?? at.toISOString());
    const readiness = assessCatalogReadiness(record, observationTime);
    const priceIssues = validatePriceObservations(record.prices).map(({ code }) => code);
    const identityIssues = identity.ok ? [] : identity.errors.map(({ code }) => code);
    const issues = [...identityIssues, ...readiness.issues, ...priceIssues];
    if (issues.length > 0) rejected.push({ vehicleVariantId: record.identity.id, issues });
    else accepted.push(record);
  }

  if (!options.dryRun) {
    for (const record of accepted) await repository.upsertPilotRecord(record);
  }

  return {
    dryRun: options.dryRun ?? false,
    acceptedVehicleVariantIds: accepted.map(({ identity }) => identity.id),
    rejected,
    importedCount: options.dryRun ? 0 : accepted.length,
  };
}
