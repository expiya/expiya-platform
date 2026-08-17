import type { CatalogSnapshotLoadResult } from "../catalog/types";

export interface CarsDecisionV2Readiness { readonly ready: boolean; readonly failures: readonly string[] }

export function assessCarsDecisionV2ProductionReadiness(input: {
  readonly catalog: CatalogSnapshotLoadResult;
  readonly dailyLifeReady: boolean;
  readonly personaReady: boolean;
  readonly personaApproved: boolean;
  readonly providerConfigured: boolean;
  readonly durableStoreConfigured: boolean;
  readonly signingSecretValid: boolean;
  readonly migrationAvailable: boolean;
  readonly presentationReady?: boolean;
  readonly routeContractReady?: boolean;
  readonly publicFlag: boolean;
}): CarsDecisionV2Readiness {
  const failures: string[] = [];
  if (input.catalog.status !== "READY") failures.push(input.catalog.status === "UNAVAILABLE" ? `CATALOG_${input.catalog.reason}` : "CATALOG_UNAVAILABLE");
  if (!input.dailyLifeReady) failures.push("DAILY_LIFE_NOT_READY");
  if (!input.personaReady || !input.personaApproved) failures.push("PERSONA_NOT_APPROVED");
  if (!input.providerConfigured) failures.push("PROVIDER_NOT_CONFIGURED");
  if (!input.durableStoreConfigured) failures.push("DURABLE_STORE_NOT_CONFIGURED");
  if (!input.signingSecretValid) failures.push("SIGNING_NOT_READY");
  if (!input.migrationAvailable) failures.push("MIGRATION_NOT_AVAILABLE");
  if (input.presentationReady === false) failures.push("PRESENTATION_NOT_READY");
  if (input.routeContractReady === false) failures.push("ROUTE_CONTRACT_NOT_READY");
  if (!input.publicFlag) failures.push("PUBLIC_FLAG_DISABLED");
  return Object.freeze({ ready: failures.length === 0, failures: Object.freeze(failures) });
}
