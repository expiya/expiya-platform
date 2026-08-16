import { createHash } from "node:crypto";

import type { PublishedVehicleRecord } from "@/features/vehicle-data/buildPublishedCatalog";

export const FIRST_CATALOG_RELEASE_VERSION = "0.1.0";
export const CATALOG_SCHEMA_VERSION = "0.1";
export const CATALOG_SOURCE_REVISION = "pilot-vehicles:2026-08-14";
export const CATALOG_SOURCE_PATH = "data/production/pilotVehicles.ts";
export const CATALOG_BOOTSTRAP_INSTANT = "2026-08-14T12:00:00.000Z";
export const CATALOG_GENERATOR_VERSION = "production-catalog-release-generator:0.1.0";
export const CATALOG_VALIDATOR_VERSION = "production-catalog-release-validator:0.1.0";
export const SECOND_CATALOG_RELEASE_VERSION = "0.2.0";
export const SECOND_CATALOG_RELEASE_AS_OF = "2026-08-14T20:00:00.000Z";
export const SECOND_CATALOG_SOURCE_REVISION = "staged-catalog-expansion-batch-01:2026-08-14";
export const SECOND_CATALOG_SOURCE_PATH = "data/production/stagedCatalogBatch01.ts";
export const THIRD_CATALOG_RELEASE_VERSION = "0.3.0";
export const THIRD_CATALOG_RELEASE_AS_OF = "2026-08-16T12:00:00.000Z";
export const THIRD_CATALOG_SOURCE_REVISION = "hyundai-brand-batch-01:2026-08-16";
export const THIRD_CATALOG_SOURCE_PATH = "data/production/hyundaiBatch01*.ts";
export const FOURTH_CATALOG_RELEASE_VERSION = "0.4.0";
export const FOURTH_CATALOG_RELEASE_AS_OF = "2026-08-16T18:00:00.000Z";
export const FOURTH_CATALOG_SOURCE_REVISION = "alfa-romeo-brand-batch-01:2026-08-16";
export const FOURTH_CATALOG_SOURCE_PATH = "data/production/alfaRomeoBatch01.ts";
export const FIFTH_CATALOG_RELEASE_VERSION = "0.5.0";
export const FIFTH_CATALOG_RELEASE_AS_OF = "2026-08-16T21:00:00.000Z";
export const FIFTH_CATALOG_SOURCE_REVISION = "alpine-brand-batch-01:2026-08-16";
export const FIFTH_CATALOG_SOURCE_PATH = "data/production/alpineBatch01.ts";
export const SIXTH_CATALOG_RELEASE_VERSION = "0.6.0";
export const SIXTH_CATALOG_RELEASE_AS_OF = "2026-08-16T22:00:00.000Z";
export const SIXTH_CATALOG_SOURCE_REVISION = "estimated-price-backfill-01:2026-08-16";
export const SIXTH_CATALOG_SOURCE_PATH = "data/production/estimatedPriceBackfill01.ts";
export const SEVENTH_CATALOG_RELEASE_VERSION="0.7.0";
export const SEVENTH_CATALOG_RELEASE_AS_OF="2026-08-16T23:00:00.000Z";
export const SEVENTH_CATALOG_SOURCE_REVISION="bmw-brand-batch-01:2026-08-16";
export const SEVENTH_CATALOG_SOURCE_PATH="data/production/bmwBatch01.ts";
export const EIGHTH_CATALOG_RELEASE_VERSION="0.8.0";
export const EIGHTH_CATALOG_RELEASE_AS_OF="2026-08-17T00:00:00.000Z";
export const EIGHTH_CATALOG_SOURCE_REVISION="bmw-electric-brand-batch-01:2026-08-17";
export const EIGHTH_CATALOG_SOURCE_PATH="data/production/bmwElectricBatch01.ts";
export const NINTH_CATALOG_RELEASE_VERSION="0.9.0";
export const NINTH_CATALOG_RELEASE_AS_OF="2026-08-17T01:00:00.000Z";
export const NINTH_CATALOG_SOURCE_REVISION="byd-brand-batch-01:2026-08-17";
export const NINTH_CATALOG_SOURCE_PATH="data/production/bydBatch01.ts";
export const TENTH_CATALOG_RELEASE_VERSION="0.10.0";
export const TENTH_CATALOG_RELEASE_AS_OF="2026-08-17T02:00:00.000Z";
export const TENTH_CATALOG_SOURCE_REVISION="chery-brand-batch-01:2026-08-17";
export const TENTH_CATALOG_SOURCE_PATH="data/production/cheryBatch01.ts";
export const ELEVENTH_CATALOG_RELEASE_VERSION="0.11.0";
export const ELEVENTH_CATALOG_RELEASE_AS_OF="2026-08-17T03:00:00.000Z";
export const ELEVENTH_CATALOG_SOURCE_REVISION="citroen-passenger-brand-batch-01:2026-08-17";
export const ELEVENTH_CATALOG_SOURCE_PATH="data/production/citroenBatch01.ts";
export const TWELFTH_CATALOG_RELEASE_VERSION="0.12.0";
export const TWELFTH_CATALOG_RELEASE_AS_OF="2026-08-17T04:00:00.000Z";
export const TWELFTH_CATALOG_SOURCE_REVISION="citroen-commercial-brand-batch-01:2026-08-17";
export const TWELFTH_CATALOG_SOURCE_PATH="data/production/citroenCommercialBatch01.ts";
export const THIRTEENTH_CATALOG_RELEASE_VERSION="0.13.0";
export const THIRTEENTH_CATALOG_RELEASE_AS_OF="2026-08-17T05:00:00.000Z";
export const THIRTEENTH_CATALOG_SOURCE_REVISION="cupra-brand-batch-01:2026-08-17";
export const THIRTEENTH_CATALOG_SOURCE_PATH="data/production/cupraBatch01.ts";
export const FOURTEENTH_CATALOG_RELEASE_VERSION="0.14.0",FOURTEENTH_CATALOG_RELEASE_AS_OF="2026-08-17T06:00:00.000Z",FOURTEENTH_CATALOG_SOURCE_REVISION="dacia-brand-batch-01:2026-08-17",FOURTEENTH_CATALOG_SOURCE_PATH="data/production/daciaBatch01.ts";
export const FIFTEENTH_CATALOG_RELEASE_VERSION="0.15.0",FIFTEENTH_CATALOG_RELEASE_AS_OF="2026-08-17T07:00:00.000Z",FIFTEENTH_CATALOG_SOURCE_REVISION="dfsk-brand-batch-01:2026-08-17",FIFTEENTH_CATALOG_SOURCE_PATH="data/production/dfskBatch01.ts";
export const SIXTEENTH_CATALOG_RELEASE_VERSION="0.16.0",SIXTEENTH_CATALOG_RELEASE_AS_OF="2026-08-17T08:00:00.000Z",SIXTEENTH_CATALOG_SOURCE_REVISION="ds-brand-batch-01:2026-08-17",SIXTEENTH_CATALOG_SOURCE_PATH="data/production/dsBatch01.ts";
export const SEVENTEENTH_CATALOG_RELEASE_VERSION="0.17.0",SEVENTEENTH_CATALOG_RELEASE_AS_OF="2026-08-17T09:00:00.000Z",SEVENTEENTH_CATALOG_SOURCE_REVISION="ferrari-brand-batch-01:2026-08-17",SEVENTEENTH_CATALOG_SOURCE_PATH="data/production/ferrariBatch01.ts";
export const EIGHTEENTH_CATALOG_RELEASE_VERSION="0.18.0",EIGHTEENTH_CATALOG_RELEASE_AS_OF="2026-08-17T10:00:00.000Z",EIGHTEENTH_CATALOG_SOURCE_REVISION="fiat-brand-batch-01:2026-08-17",EIGHTEENTH_CATALOG_SOURCE_PATH="data/production/fiatBatch01.ts";
export const NINETEENTH_CATALOG_RELEASE_VERSION="0.19.0",NINETEENTH_CATALOG_RELEASE_AS_OF="2026-08-17T11:00:00.000Z",NINETEENTH_CATALOG_SOURCE_REVISION="ford-brand-batch-01:2026-08-17",NINETEENTH_CATALOG_SOURCE_PATH="data/production/fordBatch01.ts";
export const TWENTIETH_CATALOG_RELEASE_VERSION="0.20.0",TWENTIETH_CATALOG_RELEASE_AS_OF="2026-08-17T12:00:00.000Z",TWENTIETH_CATALOG_SOURCE_REVISION="honda-brand-batch-01:2026-08-17",TWENTIETH_CATALOG_SOURCE_PATH="data/production/hondaBatch01.ts";
export const TWENTY_FIRST_CATALOG_RELEASE_VERSION="0.21.0",TWENTY_FIRST_CATALOG_RELEASE_AS_OF="2026-08-17T13:00:00.000Z",TWENTY_FIRST_CATALOG_SOURCE_REVISION="hongqi-brand-batch-01:2026-08-17",TWENTY_FIRST_CATALOG_SOURCE_PATH="data/production/hongqiBatch01.ts";
export const TWENTY_SECOND_CATALOG_RELEASE_VERSION="0.22.0",TWENTY_SECOND_CATALOG_RELEASE_AS_OF="2026-08-17T14:00:00.000Z",TWENTY_SECOND_CATALOG_SOURCE_REVISION="jaecoo-brand-batch-01:2026-08-17",TWENTY_SECOND_CATALOG_SOURCE_PATH="data/production/jaecooBatch01.ts";
export const TWENTY_THIRD_CATALOG_RELEASE_VERSION="0.23.0",TWENTY_THIRD_CATALOG_RELEASE_AS_OF="2026-08-17T15:00:00.000Z",TWENTY_THIRD_CATALOG_SOURCE_REVISION="jaguar-brand-batch-01:2026-08-17",TWENTY_THIRD_CATALOG_SOURCE_PATH="data/production/jaguarBatch01.ts";
export const TWENTY_FOURTH_CATALOG_RELEASE_VERSION="0.24.0",TWENTY_FOURTH_CATALOG_RELEASE_AS_OF="2026-08-17T16:00:00.000Z",TWENTY_FOURTH_CATALOG_SOURCE_REVISION="jeep-brand-batch-01:2026-08-17",TWENTY_FOURTH_CATALOG_SOURCE_PATH="data/production/jeepBatch01.ts";
export const TWENTY_FIFTH_CATALOG_RELEASE_VERSION="0.25.0",TWENTY_FIFTH_CATALOG_RELEASE_AS_OF="2026-08-17T17:00:00.000Z",TWENTY_FIFTH_CATALOG_SOURCE_REVISION="kgm-brand-batch-01:2026-08-17",TWENTY_FIFTH_CATALOG_SOURCE_PATH="data/production/kgmBatch01.ts";
export const TWENTY_SIXTH_CATALOG_RELEASE_VERSION="0.26.0",TWENTY_SIXTH_CATALOG_RELEASE_AS_OF="2026-08-17T18:00:00.000Z",TWENTY_SIXTH_CATALOG_SOURCE_REVISION="kia-brand-batch-01:2026-08-17",TWENTY_SIXTH_CATALOG_SOURCE_PATH="data/production/kiaBatch01.ts";
export const TWENTY_SEVENTH_CATALOG_RELEASE_VERSION="0.27.0",TWENTY_SEVENTH_CATALOG_RELEASE_AS_OF="2026-08-17T19:00:00.000Z",TWENTY_SEVENTH_CATALOG_SOURCE_REVISION="lamborghini-brand-batch-01:2026-08-17",TWENTY_SEVENTH_CATALOG_SOURCE_PATH="data/production/lamborghiniBatch01.ts";
export const TWENTY_EIGHTH_CATALOG_RELEASE_VERSION="0.28.0",TWENTY_EIGHTH_CATALOG_RELEASE_AS_OF="2026-08-17T20:00:00.000Z",TWENTY_EIGHTH_CATALOG_SOURCE_REVISION="land-rover-brand-batch-01:2026-08-17",TWENTY_EIGHTH_CATALOG_SOURCE_PATH="data/production/landRoverBatch01.ts";
export const TWENTY_NINTH_CATALOG_RELEASE_VERSION="0.29.0",TWENTY_NINTH_CATALOG_RELEASE_AS_OF="2026-08-17T21:00:00.000Z",TWENTY_NINTH_CATALOG_SOURCE_REVISION="leapmotor-brand-batch-01:2026-08-17",TWENTY_NINTH_CATALOG_SOURCE_PATH="data/production/leapmotorBatch01.ts";
export const THIRTIETH_CATALOG_RELEASE_VERSION="0.30.0",THIRTIETH_CATALOG_RELEASE_AS_OF="2026-08-17T22:00:00.000Z",THIRTIETH_CATALOG_SOURCE_REVISION="lexus-brand-batch-01:2026-08-17",THIRTIETH_CATALOG_SOURCE_PATH="data/production/lexusBatch01.ts";
export const THIRTY_FIRST_CATALOG_RELEASE_VERSION="0.31.0",THIRTY_FIRST_CATALOG_RELEASE_AS_OF="2026-08-17T23:00:00.000Z",THIRTY_FIRST_CATALOG_SOURCE_REVISION="maserati-brand-batch-01:2026-08-17",THIRTY_FIRST_CATALOG_SOURCE_PATH="data/production/maseratiBatch01.ts";
export const THIRTY_SECOND_CATALOG_RELEASE_VERSION="0.32.0",THIRTY_SECOND_CATALOG_RELEASE_AS_OF="2026-08-18T00:00:00.000Z",THIRTY_SECOND_CATALOG_SOURCE_REVISION="mercedes-brand-batch-01:2026-08-18",THIRTY_SECOND_CATALOG_SOURCE_PATH="data/production/mercedesBatch01.ts";
export const THIRTY_THIRD_CATALOG_RELEASE_VERSION="0.33.0",THIRTY_THIRD_CATALOG_RELEASE_AS_OF="2026-08-18T01:00:00.000Z",THIRTY_THIRD_CATALOG_SOURCE_REVISION="mg-brand-batch-01:2026-08-18",THIRTY_THIRD_CATALOG_SOURCE_PATH="data/production/mgBatch01.ts";
export const THIRTY_FOURTH_CATALOG_RELEASE_VERSION="0.34.0",THIRTY_FOURTH_CATALOG_RELEASE_AS_OF="2026-08-18T02:00:00.000Z",THIRTY_FOURTH_CATALOG_SOURCE_REVISION="mini-brand-batch-01:2026-08-18",THIRTY_FOURTH_CATALOG_SOURCE_PATH="data/production/miniBatch01.ts";
export const THIRTY_FIFTH_CATALOG_RELEASE_VERSION="0.35.0",THIRTY_FIFTH_CATALOG_RELEASE_AS_OF="2026-08-18T03:00:00.000Z",THIRTY_FIFTH_CATALOG_SOURCE_REVISION="mitsubishi-brand-batch-01:2026-08-18",THIRTY_FIFTH_CATALOG_SOURCE_PATH="data/production/mitsubishiBatch01.ts";
export const THIRTY_SIXTH_CATALOG_RELEASE_VERSION="0.36.0",THIRTY_SIXTH_CATALOG_RELEASE_AS_OF="2026-08-18T04:00:00.000Z",THIRTY_SIXTH_CATALOG_SOURCE_REVISION="nissan-brand-batch-01:2026-08-18",THIRTY_SIXTH_CATALOG_SOURCE_PATH="data/production/nissanBatch01.ts";
export const THIRTY_SEVENTH_CATALOG_RELEASE_VERSION="0.37.0",THIRTY_SEVENTH_CATALOG_RELEASE_AS_OF="2026-08-18T05:00:00.000Z",THIRTY_SEVENTH_CATALOG_SOURCE_REVISION="omoda-brand-batch-01:2026-08-18",THIRTY_SEVENTH_CATALOG_SOURCE_PATH="data/production/omodaBatch01.ts";
export const THIRTY_EIGHTH_CATALOG_RELEASE_VERSION="0.38.0",THIRTY_EIGHTH_CATALOG_RELEASE_AS_OF="2026-08-18T06:00:00.000Z",THIRTY_EIGHTH_CATALOG_SOURCE_REVISION="opel-brand-batch-02:2026-08-18",THIRTY_EIGHTH_CATALOG_SOURCE_PATH="data/production/opelBatch02.ts";
export const THIRTY_NINTH_CATALOG_RELEASE_VERSION="0.39.0",THIRTY_NINTH_CATALOG_RELEASE_AS_OF="2026-08-18T07:00:00.000Z",THIRTY_NINTH_CATALOG_SOURCE_REVISION="peugeot-brand-batch-01:2026-08-18",THIRTY_NINTH_CATALOG_SOURCE_PATH="data/production/peugeotBatch01.ts";
export const FORTIETH_CATALOG_RELEASE_VERSION="0.40.0",FORTIETH_CATALOG_RELEASE_AS_OF="2026-08-18T08:00:00.000Z",FORTIETH_CATALOG_SOURCE_REVISION="porsche-brand-batch-01:2026-08-18",FORTIETH_CATALOG_SOURCE_PATH="data/production/porscheBatch01.ts";
export const FORTY_FIRST_CATALOG_RELEASE_VERSION="0.41.0",FORTY_FIRST_CATALOG_RELEASE_AS_OF="2026-08-18T09:00:00.000Z",FORTY_FIRST_CATALOG_SOURCE_REVISION="renault-brand-batch-02:2026-08-18",FORTY_FIRST_CATALOG_SOURCE_PATH="data/production/renaultBatch02.ts";
export const FORTY_SECOND_CATALOG_RELEASE_VERSION="0.42.0",FORTY_SECOND_CATALOG_RELEASE_AS_OF="2026-08-18T10:00:00.000Z",FORTY_SECOND_CATALOG_SOURCE_REVISION="rolls-royce-brand-batch-01:2026-08-18",FORTY_SECOND_CATALOG_SOURCE_PATH="data/production/rollsRoyceBatch01.ts";
export const FORTY_THIRD_CATALOG_RELEASE_VERSION="0.43.0",FORTY_THIRD_CATALOG_RELEASE_AS_OF="2026-08-18T11:00:00.000Z",FORTY_THIRD_CATALOG_SOURCE_REVISION="seat-brand-batch-01:2026-08-18",FORTY_THIRD_CATALOG_SOURCE_PATH="data/production/seatBatch01.ts";
export const FORTY_FOURTH_CATALOG_RELEASE_VERSION="0.44.0",FORTY_FOURTH_CATALOG_RELEASE_AS_OF="2026-08-18T12:00:00.000Z",FORTY_FOURTH_CATALOG_SOURCE_REVISION="skoda-brand-batch-01:2026-08-18",FORTY_FOURTH_CATALOG_SOURCE_PATH="data/production/skodaBatch01.ts";
export const FORTY_FIFTH_CATALOG_RELEASE_VERSION="0.45.0",FORTY_FIFTH_CATALOG_RELEASE_AS_OF="2026-08-18T13:00:00.000Z",FORTY_FIFTH_CATALOG_SOURCE_REVISION="subaru-brand-batch-01:2026-08-18",FORTY_FIFTH_CATALOG_SOURCE_PATH="data/production/subaruBatch01.ts";
export const FORTY_SIXTH_CATALOG_RELEASE_VERSION="0.46.0",FORTY_SIXTH_CATALOG_RELEASE_AS_OF="2026-08-18T14:00:00.000Z",FORTY_SIXTH_CATALOG_SOURCE_REVISION="suzuki-brand-batch-01:2026-08-18",FORTY_SIXTH_CATALOG_SOURCE_PATH="data/production/suzukiBatch01.ts";
export const FORTY_SEVENTH_CATALOG_RELEASE_VERSION="0.47.0",FORTY_SEVENTH_CATALOG_RELEASE_AS_OF="2026-08-18T15:00:00.000Z",FORTY_SEVENTH_CATALOG_SOURCE_REVISION="tesla-brand-batch-01:2026-08-18",FORTY_SEVENTH_CATALOG_SOURCE_PATH="data/production/teslaBatch01.ts";
export const FORTY_EIGHTH_CATALOG_RELEASE_VERSION="0.48.0",FORTY_EIGHTH_CATALOG_RELEASE_AS_OF="2026-08-18T16:00:00.000Z",FORTY_EIGHTH_CATALOG_SOURCE_REVISION="togg-brand-batch-02:2026-08-18",FORTY_EIGHTH_CATALOG_SOURCE_PATH="data/production/toggBatch02.ts";
export const FORTY_NINTH_CATALOG_RELEASE_VERSION="0.49.0",FORTY_NINTH_CATALOG_RELEASE_AS_OF="2026-08-18T17:00:00.000Z",FORTY_NINTH_CATALOG_SOURCE_REVISION="toyota-brand-batch-02:2026-08-18",FORTY_NINTH_CATALOG_SOURCE_PATH="data/production/toyotaBatch02.ts";
export const FIFTIETH_CATALOG_RELEASE_VERSION="0.50.0",FIFTIETH_CATALOG_RELEASE_AS_OF="2026-08-18T18:00:00.000Z",FIFTIETH_CATALOG_SOURCE_REVISION="volkswagen-brand-batch-01:2026-08-18",FIFTIETH_CATALOG_SOURCE_PATH="data/production/volkswagenBatch01.ts";
export const FIFTY_FIRST_CATALOG_RELEASE_VERSION="0.51.0",FIFTY_FIRST_CATALOG_RELEASE_AS_OF="2026-08-18T19:00:00.000Z",FIFTY_FIRST_CATALOG_SOURCE_REVISION="aston-martin-brand-batch-01:2026-08-18",FIFTY_FIRST_CATALOG_SOURCE_PATH="data/production/astonMartinBatch01.ts";
export const FIFTY_SECOND_CATALOG_RELEASE_VERSION="0.52.0",FIFTY_SECOND_CATALOG_RELEASE_AS_OF="2026-08-18T20:00:00.000Z",FIFTY_SECOND_CATALOG_SOURCE_REVISION="audi-brand-batch-01:2026-08-18",FIFTY_SECOND_CATALOG_SOURCE_PATH="data/production/audiBatch01.ts";
export const FIFTY_THIRD_CATALOG_RELEASE_VERSION="0.53.0",FIFTY_THIRD_CATALOG_RELEASE_AS_OF="2026-08-18T21:00:00.000Z",FIFTY_THIRD_CATALOG_SOURCE_REVISION="bentley-brand-batch-01:2026-08-18",FIFTY_THIRD_CATALOG_SOURCE_PATH="data/production/bentleyBatch01.ts";
export const FIFTY_FOURTH_CATALOG_RELEASE_VERSION="0.54.0",FIFTY_FOURTH_CATALOG_RELEASE_AS_OF="2026-08-18T22:00:00.000Z",FIFTY_FOURTH_CATALOG_SOURCE_REVISION="volvo-brand-batch-01:2026-08-18",FIFTY_FOURTH_CATALOG_SOURCE_PATH="data/production/volvoBatch01.ts";
export const FIFTY_FIFTH_CATALOG_RELEASE_VERSION="0.55.0",FIFTY_FIFTH_CATALOG_RELEASE_AS_OF="2026-08-18T23:00:00.000Z",FIFTY_FIFTH_CATALOG_SOURCE_REVISION="all-light-commercial-batch-01:2026-08-18",FIFTY_FIFTH_CATALOG_SOURCE_PATH="data/production/allCommercialBatch01.ts";

export const FIRST_RELEASE_VARIANT_IDS = Object.freeze([
  "1eb75421-a038-4679-977e-7cd4e4608863",
  "4c22cb31-e980-4dc8-8525-c47363783d96",
  "5d3538b1-c726-44f5-8160-41a64d33eb8e",
  "62465336-2cfb-4ccd-b9a7-36467d63497f",
  "87e30119-f0d5-4c98-8324-cbd65156974b",
  "8af2278c-4168-4a1b-a915-6b72b9cd6f48",
  "a3728e65-51b2-447f-a6c3-a1f64db8a310",
  "c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8",
  "db2d6503-f10f-41a4-ad11-b2ca71e59d32",
  "f81b0873-f3a7-454a-9f34-4d5ad273708d",
] as const);

export interface ProductionCatalogReleasePayload {
  readonly catalog_schema_version: typeof CATALOG_SCHEMA_VERSION;
  readonly market: "TR";
  readonly effective_as_of: string;
  readonly records: readonly PublishedVehicleRecord[];
}

export interface ProductionCatalogReleaseManifest {
  readonly catalog_release_version: string;
  readonly catalog_schema_version: string;
  readonly catalog_payload_hash: string;
  readonly market: "TR";
  readonly source_revision: string;
  readonly source_path: string;
  readonly effective_as_of: string;
  readonly record_count: number;
  readonly publishable_record_count: number;
  readonly included_variant_ids: readonly string[];
  readonly generator_version: string;
  readonly validator_version: string;
  readonly validator_status: "PASS";
  readonly approval: {
    readonly state: "APPROVED";
    readonly at: string;
    readonly reference: string;
  };
  readonly staging: {
    readonly state: "STAGED";
    readonly at: string;
    readonly actor_reference: string;
    readonly target: "INTERNAL_INTEGRATION_NON_PRODUCTION";
  };
  readonly previous_release: string | null;
  readonly declared_limitations: readonly string[];
}

export interface ProductionCatalogActivation {
  readonly market: "TR";
  readonly state: "ACTIVE";
  readonly active_catalog_release_version: string;
  readonly catalog_payload_hash: string;
  readonly activated_at: string;
  readonly activation_reference: string;
  readonly previous_active_release: string;
  readonly rollback_release: string;
}

function compareCanonical(left: unknown, right: unknown): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right), "en");
}

export function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeValue).sort(compareCanonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([key, child]) => [key, canonicalizeValue(child)]));
  }
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Non-finite numbers are not canonical");
  return value;
}

export function serializeCanonical(value: unknown): string {
  return `${JSON.stringify(canonicalizeValue(value), null, 2)}\n`;
}

export function catalogPayloadHash(payloadBytes: string | Buffer): string {
  return `sha256:${createHash("sha256").update(payloadBytes).digest("hex")}`;
}

export function createFirstReleasePayload(records: readonly PublishedVehicleRecord[]): ProductionCatalogReleasePayload {
  const ids = records.map(({ variant }) => variant.id);
  if (records.length !== 10) throw new Error(`Expected 10 publishable records, received ${records.length}`);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate catalog variant IDs are forbidden");
  const actual = [...ids].sort();
  if (JSON.stringify(actual) !== JSON.stringify(FIRST_RELEASE_VARIANT_IDS)) {
    throw new Error(`Unexpected first-release membership: ${actual.join(",")}`);
  }
  return {
    catalog_schema_version: CATALOG_SCHEMA_VERSION,
    market: "TR",
    effective_as_of: CATALOG_BOOTSTRAP_INSTANT,
    records: [...records].sort((left, right) => left.variant.id.localeCompare(right.variant.id, "en")),
  };
}

export function createFirstReleaseManifest(payload: ProductionCatalogReleasePayload): ProductionCatalogReleaseManifest {
  const payloadBytes = serializeCanonical(payload);
  const ids = payload.records.map(({ variant }) => variant.id).sort();
  return {
    catalog_release_version: FIRST_CATALOG_RELEASE_VERSION,
    catalog_schema_version: CATALOG_SCHEMA_VERSION,
    catalog_payload_hash: catalogPayloadHash(payloadBytes),
    market: "TR",
    source_revision: CATALOG_SOURCE_REVISION,
    source_path: CATALOG_SOURCE_PATH,
    effective_as_of: CATALOG_BOOTSTRAP_INSTANT,
    record_count: payload.records.length,
    publishable_record_count: payload.records.length,
    included_variant_ids: ids,
    generator_version: CATALOG_GENERATOR_VERSION,
    validator_version: CATALOG_VALIDATOR_VERSION,
    validator_status: "PASS",
    approval: { state: "APPROVED", at: CATALOG_BOOTSTRAP_INSTANT, reference: "expiya-catalog-bootstrap-approval-v0.1" },
    staging: {
      state: "STAGED", at: CATALOG_BOOTSTRAP_INSTANT,
      actor_reference: "expiya-controlled-staging-v0.1", target: "INTERNAL_INTEGRATION_NON_PRODUCTION",
    },
    previous_release: null,
    declared_limitations: [
      "staged-only-not-active",
      "bootstrap-governance-references-are-not-individual-identities",
      "eligibility-evaluated-at-pinned-bootstrap-instant",
      "vehicle-evidence-and-identity-mapping-remain-separately-governed",
    ],
  };
}

export function createSecondReleasePayload(records: readonly PublishedVehicleRecord[]): ProductionCatalogReleasePayload {
  const ids = records.map(({ variant }) => variant.id);
  if (records.length !== 13) throw new Error(`Expected 13 publishable records, received ${records.length}`);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate catalog variant IDs are forbidden");
  for (const id of FIRST_RELEASE_VARIANT_IDS) {
    if (!ids.includes(id)) throw new Error(`Previous release member missing: ${id}`);
  }
  return {
    catalog_schema_version: CATALOG_SCHEMA_VERSION,
    market: "TR",
    effective_as_of: SECOND_CATALOG_RELEASE_AS_OF,
    records: [...records].sort((left, right) => left.variant.id.localeCompare(right.variant.id, "en")),
  };
}

export function createSecondReleaseManifest(payload: ProductionCatalogReleasePayload): ProductionCatalogReleaseManifest {
  return {
    catalog_release_version: SECOND_CATALOG_RELEASE_VERSION,
    catalog_schema_version: CATALOG_SCHEMA_VERSION,
    catalog_payload_hash: catalogPayloadHash(serializeCanonical(payload)),
    market: "TR",
    source_revision: SECOND_CATALOG_SOURCE_REVISION,
    source_path: SECOND_CATALOG_SOURCE_PATH,
    effective_as_of: SECOND_CATALOG_RELEASE_AS_OF,
    record_count: payload.records.length,
    publishable_record_count: payload.records.length,
    included_variant_ids: payload.records.map(({ variant }) => variant.id).sort(),
    generator_version: CATALOG_GENERATOR_VERSION,
    validator_version: CATALOG_VALIDATOR_VERSION,
    validator_status: "PASS",
    approval: { state: "APPROVED", at: SECOND_CATALOG_RELEASE_AS_OF, reference: "small-staged-catalog-expansion-batch-01" },
    staging: {
      state: "STAGED", at: SECOND_CATALOG_RELEASE_AS_OF,
      actor_reference: "controlled-catalog-staging-process", target: "INTERNAL_INTEGRATION_NON_PRODUCTION",
    },
    previous_release: FIRST_CATALOG_RELEASE_VERSION,
    declared_limitations: [
      "staged-only-not-active",
      "default-recommendation-remains-pinned-to-authoring-baseline-v0.1.0",
      "vehicle-evidence-used-for-reconciliation-only-not-publication-authority",
      "identity-mapping-and-runtime-evidence-artifacts-unchanged",
    ],
  };
}

export function createThirdReleasePayload(records: readonly PublishedVehicleRecord[]): ProductionCatalogReleasePayload {
  const ids = records.map(({ variant }) => variant.id);
  if (records.length !== 52) throw new Error(`Expected 52 publishable records, received ${records.length}`);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate catalog variant IDs are forbidden");
  for (const id of FIRST_RELEASE_VARIANT_IDS) {
    if (!ids.includes(id)) throw new Error(`Previous member missing: ${id}`);
  }
  return { catalog_schema_version: CATALOG_SCHEMA_VERSION, market: "TR", effective_as_of: THIRD_CATALOG_RELEASE_AS_OF, records: [...records].sort((left, right) => left.variant.id.localeCompare(right.variant.id, "en")) };
}

export function createThirdReleaseManifest(payload: ProductionCatalogReleasePayload): ProductionCatalogReleaseManifest {
  return {
    catalog_release_version: THIRD_CATALOG_RELEASE_VERSION, catalog_schema_version: CATALOG_SCHEMA_VERSION,
    catalog_payload_hash: catalogPayloadHash(serializeCanonical(payload)), market: "TR",
    source_revision: THIRD_CATALOG_SOURCE_REVISION, source_path: THIRD_CATALOG_SOURCE_PATH,
    effective_as_of: THIRD_CATALOG_RELEASE_AS_OF, record_count: payload.records.length,
    publishable_record_count: payload.records.length, included_variant_ids: payload.records.map(({ variant }) => variant.id).sort(),
    generator_version: CATALOG_GENERATOR_VERSION, validator_version: CATALOG_VALIDATOR_VERSION, validator_status: "PASS",
    approval: { state: "APPROVED", at: THIRD_CATALOG_RELEASE_AS_OF, reference: "user-directed-hyundai-brand-batch-01" },
    staging: { state: "STAGED", at: THIRD_CATALOG_RELEASE_AS_OF, actor_reference: "controlled-hyundai-brand-batch-process", target: "INTERNAL_INTEGRATION_NON_PRODUCTION" },
    previous_release: SECOND_CATALOG_RELEASE_VERSION,
    declared_limitations: [
      "kona-my2025-withheld-model-year-applicability-unresolved",
      "tucson-diesel-my2025-withheld-model-year-applicability-unresolved",
      "tucson-comfort-160ps-fact-superseded-by-current-180ps-evidence-with-stable-identity",
      "manufacturer-reported-battery-capacity-not-interpreted-as-gross-or-usable",
    ],
  };
}

export function createFourthReleasePayload(records: readonly PublishedVehicleRecord[]): ProductionCatalogReleasePayload {
  const ids = records.map(({ variant }) => variant.id);
  if (records.length !== 56) throw new Error(`Expected 56 publishable records, received ${records.length}`);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate catalog variant IDs are forbidden");
  return { catalog_schema_version: CATALOG_SCHEMA_VERSION, market: "TR", effective_as_of: FOURTH_CATALOG_RELEASE_AS_OF, records: [...records].sort((left, right) => left.variant.id.localeCompare(right.variant.id, "en")) };
}

export function createFourthReleaseManifest(payload: ProductionCatalogReleasePayload): ProductionCatalogReleaseManifest {
  return {
    catalog_release_version: FOURTH_CATALOG_RELEASE_VERSION, catalog_schema_version: CATALOG_SCHEMA_VERSION,
    catalog_payload_hash: catalogPayloadHash(serializeCanonical(payload)), market: "TR",
    source_revision: FOURTH_CATALOG_SOURCE_REVISION, source_path: FOURTH_CATALOG_SOURCE_PATH,
    effective_as_of: FOURTH_CATALOG_RELEASE_AS_OF, record_count: payload.records.length,
    publishable_record_count: payload.records.length, included_variant_ids: payload.records.map(({ variant }) => variant.id).sort(),
    generator_version: CATALOG_GENERATOR_VERSION, validator_version: CATALOG_VALIDATOR_VERSION, validator_status: "PASS",
    approval: { state: "APPROVED", at: FOURTH_CATALOG_RELEASE_AS_OF, reference: "user-directed-alfa-romeo-brand-batch-01" },
    staging: { state: "STAGED", at: FOURTH_CATALOG_RELEASE_AS_OF, actor_reference: "controlled-alfa-romeo-brand-batch-process", target: "INTERNAL_INTEGRATION_NON_PRODUCTION" },
    previous_release: THIRD_CATALOG_RELEASE_VERSION,
    declared_limitations: [
      "giulia-and-stelvio-withheld-no-current-official-price-circular-row",
      "technical-pdf-binary-download-blocked-by-publisher-cdn-facts-cross-checked-with-official-model-pages",
      "hybrid-system-power-retained-separately-from-combustion-engine-power-semantics",
      "junior-elettrica-charge-time-soc-context-retained-in-source-provenance-not-flat-runtime-field",
    ],
  };
}

export function createFifthReleasePayload(records: readonly PublishedVehicleRecord[]): ProductionCatalogReleasePayload {
  const ids = records.map(({ variant }) => variant.id);
  if (records.length !== 58) throw new Error(`Expected 58 publishable records, received ${records.length}`);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate catalog variant IDs are forbidden");
  return { catalog_schema_version: CATALOG_SCHEMA_VERSION, market: "TR", effective_as_of: FIFTH_CATALOG_RELEASE_AS_OF, records: [...records].sort((left, right) => left.variant.id.localeCompare(right.variant.id, "en")) };
}

export function createFifthReleaseManifest(payload: ProductionCatalogReleasePayload): ProductionCatalogReleaseManifest {
  return {
    catalog_release_version: FIFTH_CATALOG_RELEASE_VERSION, catalog_schema_version: CATALOG_SCHEMA_VERSION,
    catalog_payload_hash: catalogPayloadHash(serializeCanonical(payload)), market: "TR",
    source_revision: FIFTH_CATALOG_SOURCE_REVISION, source_path: FIFTH_CATALOG_SOURCE_PATH,
    effective_as_of: FIFTH_CATALOG_RELEASE_AS_OF, record_count: payload.records.length,
    publishable_record_count: payload.records.length, included_variant_ids: payload.records.map(({ variant }) => variant.id).sort(),
    generator_version: CATALOG_GENERATOR_VERSION, validator_version: CATALOG_VALIDATOR_VERSION, validator_status: "PASS",
    approval: { state: "APPROVED", at: FIFTH_CATALOG_RELEASE_AS_OF, reference: "user-directed-alpine-brand-batch-01" },
    staging: { state: "STAGED", at: FIFTH_CATALOG_RELEASE_AS_OF, actor_reference: "controlled-alpine-brand-batch-process", target: "INTERNAL_INTEGRATION_NON_PRODUCTION" },
    previous_release: FOURTH_CATALOG_RELEASE_VERSION,
    declared_limitations: [
      "a110-gt-and-a110-s-withheld-last-units-no-current-public-exact-price",
      "a290-gts-withheld-no-current-public-exact-configurator-price",
      "a290-gt-performance-official-range-conflict-retained-current-configurator-361km-homologation-pdf-362km",
      "manufacturer-reported-battery-capacity-not-interpreted-as-gross-or-usable",
      "model-year-is-current-2026-catalog-observation-configurator-has-no-explicit-my-label",
    ],
  };
}

export function createSixthReleasePayload(records: readonly PublishedVehicleRecord[]): ProductionCatalogReleasePayload {
  if (records.length !== 63) throw new Error(`Expected 63 publishable records, received ${records.length}`);
  const ids=records.map(({variant})=>variant.id); if(new Set(ids).size!==ids.length) throw new Error("Duplicate catalog variant IDs are forbidden");
  return {catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:SIXTH_CATALOG_RELEASE_AS_OF,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))};
}
export function createSixthReleaseManifest(payload: ProductionCatalogReleasePayload): ProductionCatalogReleaseManifest {
  return {catalog_release_version:SIXTH_CATALOG_RELEASE_VERSION,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:SIXTH_CATALOG_SOURCE_REVISION,source_path:SIXTH_CATALOG_SOURCE_PATH,effective_as_of:SIXTH_CATALOG_RELEASE_AS_OF,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(({variant})=>variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at:SIXTH_CATALOG_RELEASE_AS_OF,reference:"user-directed-estimated-price-backfill-01"},staging:{state:"STAGED",at:SIXTH_CATALOG_RELEASE_AS_OF,actor_reference:"controlled-estimated-price-backfill",target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:FIFTH_CATALOG_RELEASE_VERSION,declared_limitations:["four-price-estimates-are-internal-only-and-not-consumer-display-authority","estimated-prices-participate-in-decision-filtering-with-low-confidence","official-price-always-supersedes-estimate","a290-gts-promoted-with-official-price-not-estimate"]};
}
export function createSeventhReleasePayload(records:readonly PublishedVehicleRecord[]):ProductionCatalogReleasePayload{if(records.length!==92)throw new Error(`Expected 92 publishable records, received ${records.length}`);const ids=records.map(r=>r.variant.id);if(new Set(ids).size!==ids.length)throw new Error("Duplicate catalog variant IDs are forbidden");return{catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:SEVENTH_CATALOG_RELEASE_AS_OF,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))}}
export function createSeventhReleaseManifest(payload:ProductionCatalogReleasePayload):ProductionCatalogReleaseManifest{return{catalog_release_version:SEVENTH_CATALOG_RELEASE_VERSION,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:SEVENTH_CATALOG_SOURCE_REVISION,source_path:SEVENTH_CATALOG_SOURCE_PATH,effective_as_of:SEVENTH_CATALOG_RELEASE_AS_OF,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(r=>r.variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at:SEVENTH_CATALOG_RELEASE_AS_OF,reference:"user-directed-bmw-brand-batch-01"},staging:{state:"STAGED",at:SEVENTH_CATALOG_RELEASE_AS_OF,actor_reference:"controlled-bmw-brand-batch",target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:SIXTH_CATALOG_RELEASE_VERSION,declared_limitations:["29-bmw-price-estimates-are-internal-only","bmw-bev-configurations-withheld-pending-battery-and-range-p0-closure","exact-official-inventory-prices-will-supersede-estimates","equipment-depth-remains-pending"]}}
export function createEighthReleasePayload(records:readonly PublishedVehicleRecord[]):ProductionCatalogReleasePayload{if(records.length!==107)throw new Error(`Expected 107 publishable records, received ${records.length}`);const ids=records.map(r=>r.variant.id);if(new Set(ids).size!==ids.length)throw new Error("Duplicate catalog variant IDs are forbidden");return{catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:EIGHTH_CATALOG_RELEASE_AS_OF,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))}}
export function createEighthReleaseManifest(payload:ProductionCatalogReleasePayload):ProductionCatalogReleaseManifest{return{catalog_release_version:EIGHTH_CATALOG_RELEASE_VERSION,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:EIGHTH_CATALOG_SOURCE_REVISION,source_path:EIGHTH_CATALOG_SOURCE_PATH,effective_as_of:EIGHTH_CATALOG_RELEASE_AS_OF,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(r=>r.variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at:EIGHTH_CATALOG_RELEASE_AS_OF,reference:"user-directed-bmw-electric-brand-batch-01"},staging:{state:"STAGED",at:EIGHTH_CATALOG_RELEASE_AS_OF,actor_reference:"controlled-bmw-electric-brand-batch",target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:SEVENTH_CATALOG_RELEASE_VERSION,declared_limitations:["15-bmw-bev-prices-are-internal-only-estimates","wltp-ranges-preserved-in-provenance-runtime-scalar-is-official-maximum","duplicate-visible-i5-xdrive40-model-code-not-double-counted","equipment-depth-remains-pending"]}}
export function createNinthReleasePayload(records:readonly PublishedVehicleRecord[]):ProductionCatalogReleasePayload{if(records.length!==120)throw new Error(`Expected 120 publishable records, received ${records.length}`);const ids=records.map(r=>r.variant.id);if(new Set(ids).size!==ids.length)throw new Error("Duplicate catalog variant IDs are forbidden");return{catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:NINTH_CATALOG_RELEASE_AS_OF,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))}}
export function createNinthReleaseManifest(payload:ProductionCatalogReleasePayload):ProductionCatalogReleaseManifest{return{catalog_release_version:NINTH_CATALOG_RELEASE_VERSION,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:NINTH_CATALOG_SOURCE_REVISION,source_path:NINTH_CATALOG_SOURCE_PATH,effective_as_of:NINTH_CATALOG_RELEASE_AS_OF,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(r=>r.variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at:NINTH_CATALOG_RELEASE_AS_OF,reference:"user-directed-byd-brand-batch-01"},staging:{state:"STAGED",at:NINTH_CATALOG_RELEASE_AS_OF,actor_reference:"controlled-byd-brand-batch",target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:EIGHTH_CATALOG_RELEASE_VERSION,declared_limitations:["nine-byd-prices-are-internal-only-estimates","four-official-prices-are-dated-2025-model-year-list-observations","manufacturer-battery-capacity-semantics-not-inferred","sealion-7-design-range-conflict-preserved","equipment-depth-remains-pending"]}}
export function createTenthReleasePayload(records:readonly PublishedVehicleRecord[]):ProductionCatalogReleasePayload{if(records.length!==124)throw new Error(`Expected 124 publishable records, received ${records.length}`);const ids=records.map(r=>r.variant.id);if(new Set(ids).size!==ids.length)throw new Error("Duplicate catalog variant IDs are forbidden");return{catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:TENTH_CATALOG_RELEASE_AS_OF,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))}}
export function createTenthReleaseManifest(payload:ProductionCatalogReleasePayload):ProductionCatalogReleaseManifest{return{catalog_release_version:TENTH_CATALOG_RELEASE_VERSION,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:TENTH_CATALOG_SOURCE_REVISION,source_path:TENTH_CATALOG_SOURCE_PATH,effective_as_of:TENTH_CATALOG_RELEASE_AS_OF,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(r=>r.variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at:TENTH_CATALOG_RELEASE_AS_OF,reference:"user-directed-chery-brand-batch-01"},staging:{state:"STAGED",at:TENTH_CATALOG_RELEASE_AS_OF,actor_reference:"controlled-chery-brand-batch",target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:NINTH_CATALOG_RELEASE_VERSION,declared_limitations:["current-chery-turkey-catalog-limited-to-tiggo7-and-tiggo8","four-prices-are-dated-official-list-observations","tiggo8-luggage-seat-layout-context-not-inferred","older-omoda-and-pro-max-families-not-carried-forward","equipment-depth-remains-pending"]}}
export function createEleventhReleasePayload(records:readonly PublishedVehicleRecord[]):ProductionCatalogReleasePayload{if(records.length!==142)throw new Error(`Expected 142 publishable records, received ${records.length}`);const ids=records.map(r=>r.variant.id);if(new Set(ids).size!==ids.length)throw new Error("Duplicate catalog variant IDs are forbidden");return{catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:ELEVENTH_CATALOG_RELEASE_AS_OF,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))}}
export function createEleventhReleaseManifest(payload:ProductionCatalogReleasePayload):ProductionCatalogReleaseManifest{return{catalog_release_version:ELEVENTH_CATALOG_RELEASE_VERSION,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:ELEVENTH_CATALOG_SOURCE_REVISION,source_path:ELEVENTH_CATALOG_SOURCE_PATH,effective_as_of:ELEVENTH_CATALOG_RELEASE_AS_OF,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(r=>r.variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at:ELEVENTH_CATALOG_RELEASE_AS_OF,reference:"user-directed-citroen-passenger-brand-batch-01"},staging:{state:"STAGED",at:ELEVENTH_CATALOG_RELEASE_AS_OF,actor_reference:"controlled-citroen-passenger-brand-batch",target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:TENTH_CATALOG_RELEASE_VERSION,declared_limitations:["two-c4-hybrid-prices-are-internal-only-estimates","sixteen-official-prices-are-dated-july-2026-observations","commercial-citroen-models-deferred-to-separate-batch","manufacturer-battery-capacity-semantics-not-inferred","equipment-depth-remains-pending"]}}
export function createTwelfthReleasePayload(records:readonly PublishedVehicleRecord[]):ProductionCatalogReleasePayload{if(records.length!==155)throw new Error(`Expected 155 publishable records, received ${records.length}`);const ids=records.map(r=>r.variant.id);if(new Set(ids).size!==ids.length)throw new Error("Duplicate catalog variant IDs are forbidden");return{catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:TWELFTH_CATALOG_RELEASE_AS_OF,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))}}
export function createTwelfthReleaseManifest(payload:ProductionCatalogReleasePayload):ProductionCatalogReleaseManifest{return{catalog_release_version:TWELFTH_CATALOG_RELEASE_VERSION,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:TWELFTH_CATALOG_SOURCE_REVISION,source_path:TWELFTH_CATALOG_SOURCE_PATH,effective_as_of:TWELFTH_CATALOG_RELEASE_AS_OF,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(r=>r.variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at:TWELFTH_CATALOG_RELEASE_AS_OF,reference:"user-directed-citroen-commercial-brand-batch-01"},staging:{state:"STAGED",at:TWELFTH_CATALOG_RELEASE_AS_OF,actor_reference:"controlled-citroen-commercial-brand-batch",target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:ELEVENTH_CATALOG_RELEASE_VERSION,declared_limitations:["thirteen-official-commercial-prices-are-dated-july-2026-observations","cargo-volume-is-distinct-from-passenger-luggage","jumpy-chassis-cab-upfit-capacity-not-asserted","payload-depth-remains-pending-for-most-commercial-configurations","equipment-depth-remains-pending"]}}
export function createThirteenthReleasePayload(records:readonly PublishedVehicleRecord[]):ProductionCatalogReleasePayload{if(records.length!==168)throw new Error(`Expected 168 publishable records, received ${records.length}`);const ids=records.map(r=>r.variant.id);if(new Set(ids).size!==ids.length)throw new Error("Duplicate catalog variant IDs are forbidden");return{catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:THIRTEENTH_CATALOG_RELEASE_AS_OF,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))}}
export function createThirteenthReleaseManifest(payload:ProductionCatalogReleasePayload):ProductionCatalogReleaseManifest{return{catalog_release_version:THIRTEENTH_CATALOG_RELEASE_VERSION,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:THIRTEENTH_CATALOG_SOURCE_REVISION,source_path:THIRTEENTH_CATALOG_SOURCE_PATH,effective_as_of:THIRTEENTH_CATALOG_RELEASE_AS_OF,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(r=>r.variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at:THIRTEENTH_CATALOG_RELEASE_AS_OF,reference:"user-directed-cupra-brand-batch-01"},staging:{state:"STAGED",at:THIRTEENTH_CATALOG_RELEASE_AS_OF,actor_reference:"controlled-cupra-brand-batch",target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:TWELFTH_CATALOG_RELEASE_VERSION,declared_limitations:["five-cupra-prices-are-internal-only-estimates","eight-official-prices-are-august-2026-list-observations","official-tavascan-range-and-power-conflicts-retained-not-merged","wltp-range-upper-bounds-retained-with-context","equipment-depth-remains-pending"]}}
function laterPayload(records:readonly PublishedVehicleRecord[],count:number,at:string):ProductionCatalogReleasePayload{if(records.length!==count)throw new Error(`Expected ${count} publishable records, received ${records.length}`);const ids=records.map(r=>r.variant.id);if(new Set(ids).size!==ids.length)throw new Error("Duplicate catalog variant IDs are forbidden");return{catalog_schema_version:CATALOG_SCHEMA_VERSION,market:"TR",effective_as_of:at,records:[...records].sort((a,b)=>a.variant.id.localeCompare(b.variant.id,"en"))}}
function laterManifest(payload:ProductionCatalogReleasePayload,version:string,at:string,revision:string,sourcePath:string,previous:string,brand:string,limitations:readonly string[]):ProductionCatalogReleaseManifest{return{catalog_release_version:version,catalog_schema_version:CATALOG_SCHEMA_VERSION,catalog_payload_hash:catalogPayloadHash(serializeCanonical(payload)),market:"TR",source_revision:revision,source_path:sourcePath,effective_as_of:at,record_count:payload.records.length,publishable_record_count:payload.records.length,included_variant_ids:payload.records.map(r=>r.variant.id).sort(),generator_version:CATALOG_GENERATOR_VERSION,validator_version:CATALOG_VALIDATOR_VERSION,validator_status:"PASS",approval:{state:"APPROVED",at,reference:`user-directed-${brand}-brand-batch-01`},staging:{state:"STAGED",at,actor_reference:`controlled-${brand}-brand-batch`,target:"INTERNAL_INTEGRATION_NON_PRODUCTION"},previous_release:previous,declared_limitations:limitations}}
export const createFourteenthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,186,FOURTEENTH_CATALOG_RELEASE_AS_OF);export const createFourteenthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FOURTEENTH_CATALOG_RELEASE_VERSION,FOURTEENTH_CATALOG_RELEASE_AS_OF,FOURTEENTH_CATALOG_SOURCE_REVISION,FOURTEENTH_CATALOG_SOURCE_PATH,THIRTEENTH_CATALOG_RELEASE_VERSION,"dacia",["thirteen-dacia-prices-are-internal-only-estimates","spring-battery-capacity-is-manufacturer-reported","equipment-depth-remains-pending"]);
export const createFifteenthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,187,FIFTEENTH_CATALOG_RELEASE_AS_OF);export const createFifteenthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FIFTEENTH_CATALOG_RELEASE_VERSION,FIFTEENTH_CATALOG_RELEASE_AS_OF,FIFTEENTH_CATALOG_SOURCE_REVISION,FIFTEENTH_CATALOG_SOURCE_PATH,FOURTEENTH_CATALOG_RELEASE_VERSION,"dfsk",["dfsk-e5-price-is-internal-only-estimate","dfsk-commercial-c-series-deferred-beyond-v0.20","equipment-depth-remains-pending"]);
export const createSixteenthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,193,SIXTEENTH_CATALOG_RELEASE_AS_OF);export const createSixteenthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,SIXTEENTH_CATALOG_RELEASE_VERSION,SIXTEENTH_CATALOG_RELEASE_AS_OF,SIXTEENTH_CATALOG_SOURCE_REVISION,SIXTEENTH_CATALOG_SOURCE_PATH,FIFTEENTH_CATALOG_RELEASE_VERSION,"ds",["four-ds-prices-are-internal-only-estimates","n8-battery-capacity-semantics-not-inferred","equipment-depth-remains-pending"]);
export const createSeventeenthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,199,SEVENTEENTH_CATALOG_RELEASE_AS_OF);export const createSeventeenthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,SEVENTEENTH_CATALOG_RELEASE_VERSION,SEVENTEENTH_CATALOG_RELEASE_AS_OF,SEVENTEENTH_CATALOG_SOURCE_REVISION,SEVENTEENTH_CATALOG_SOURCE_PATH,SIXTEENTH_CATALOG_RELEASE_VERSION,"ferrari",["all-six-ferrari-prices-are-internal-only-estimates","current-range-does-not-imply-open-turkey-allocation","special-series-vehicles-withheld","equipment-depth-remains-pending"]);
export const createEighteenthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,219,EIGHTEENTH_CATALOG_RELEASE_AS_OF);export const createEighteenthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,EIGHTEENTH_CATALOG_RELEASE_VERSION,EIGHTEENTH_CATALOG_RELEASE_AS_OF,EIGHTEENTH_CATALOG_SOURCE_REVISION,EIGHTEENTH_CATALOG_SOURCE_PATH,SEVENTEENTH_CATALOG_RELEASE_VERSION,"fiat",["eighteen-fiat-prices-are-internal-only-estimates","topolino-is-l6e-quadricycle-not-m1","fiat-cargo-and-heavy-commercial-variants-deferred","equipment-depth-remains-pending"]);
export const createNineteenthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,229,NINETEENTH_CATALOG_RELEASE_AS_OF);export const createNineteenthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,NINETEENTH_CATALOG_RELEASE_VERSION,NINETEENTH_CATALOG_RELEASE_AS_OF,NINETEENTH_CATALOG_SOURCE_REVISION,NINETEENTH_CATALOG_SOURCE_PATH,EIGHTEENTH_CATALOG_RELEASE_VERSION,"ford",["all-ten-ford-prices-are-internal-only-estimates","tourneo-passenger-variants-included-transit-commercials-deferred","equipment-depth-remains-pending"]);
export const createTwentiethReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,235,TWENTIETH_CATALOG_RELEASE_AS_OF);export const createTwentiethReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTIETH_CATALOG_RELEASE_VERSION,TWENTIETH_CATALOG_RELEASE_AS_OF,TWENTIETH_CATALOG_SOURCE_REVISION,TWENTIETH_CATALOG_SOURCE_PATH,NINETEENTH_CATALOG_RELEASE_VERSION,"honda",["six-honda-prices-are-dated-june-2026-observations","prelude-sales-start-note-retained","equipment-depth-remains-pending"]);
export const createTwentyFirstReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,239,TWENTY_FIRST_CATALOG_RELEASE_AS_OF);export const createTwentyFirstReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_FIRST_CATALOG_RELEASE_VERSION,TWENTY_FIRST_CATALOG_RELEASE_AS_OF,TWENTY_FIRST_CATALOG_SOURCE_REVISION,TWENTY_FIRST_CATALOG_SOURCE_PATH,TWENTIETH_CATALOG_RELEASE_VERSION,"hongqi",["all-four-hongqi-prices-are-internal-only-estimates","exact-turkey-stock-and-trim-require-distributor-confirmation","equipment-depth-remains-pending"]);
export const createTwentySecondReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,240,TWENTY_SECOND_CATALOG_RELEASE_AS_OF);export const createTwentySecondReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_SECOND_CATALOG_RELEASE_VERSION,TWENTY_SECOND_CATALOG_RELEASE_AS_OF,TWENTY_SECOND_CATALOG_SOURCE_REVISION,TWENTY_SECOND_CATALOG_SOURCE_PATH,TWENTY_FIRST_CATALOG_RELEASE_VERSION,"jaecoo",["jaecoo7-price-is-internal-only-estimate","only-current-official-turkey-configuration-carried-forward","equipment-depth-remains-pending"]);
export const createTwentyThirdReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,243,TWENTY_THIRD_CATALOG_RELEASE_AS_OF);export const createTwentyThirdReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_THIRD_CATALOG_RELEASE_VERSION,TWENTY_THIRD_CATALOG_RELEASE_AS_OF,TWENTY_THIRD_CATALOG_SOURCE_REVISION,TWENTY_THIRD_CATALOG_SOURCE_PATH,TWENTY_SECOND_CATALOG_RELEASE_VERSION,"jaguar",["all-three-jaguar-prices-are-internal-only-estimates","xe-xf-and-f-type-withheld-as-discontinued","stock-varies-by-online-reservation","equipment-depth-remains-pending"]);
export const createTwentyFourthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,246,TWENTY_FOURTH_CATALOG_RELEASE_AS_OF);export const createTwentyFourthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_FOURTH_CATALOG_RELEASE_VERSION,TWENTY_FOURTH_CATALOG_RELEASE_AS_OF,TWENTY_FOURTH_CATALOG_SOURCE_REVISION,TWENTY_FOURTH_CATALOG_SOURCE_PATH,TWENTY_THIRD_CATALOG_RELEASE_VERSION,"jeep",["all-three-jeep-prices-are-internal-only-estimates","current-turkey-universe-limited-to-avenger-family","equipment-depth-remains-pending"]);
export const createTwentyFifthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,252,TWENTY_FIFTH_CATALOG_RELEASE_AS_OF);export const createTwentyFifthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_FIFTH_CATALOG_RELEASE_VERSION,TWENTY_FIFTH_CATALOG_RELEASE_AS_OF,TWENTY_FIFTH_CATALOG_SOURCE_REVISION,TWENTY_FIFTH_CATALOG_SOURCE_PATH,TWENTY_FOURTH_CATALOG_RELEASE_VERSION,"kgm",["four-kgm-prices-are-internal-only-estimates","musso-pickup-family-deferred-beyond-v0.30","equipment-depth-remains-pending"]);
export const createTwentySixthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,270,TWENTY_SIXTH_CATALOG_RELEASE_AS_OF);export const createTwentySixthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_SIXTH_CATALOG_RELEASE_VERSION,TWENTY_SIXTH_CATALOG_RELEASE_AS_OF,TWENTY_SIXTH_CATALOG_SOURCE_REVISION,TWENTY_SIXTH_CATALOG_SOURCE_PATH,TWENTY_FIFTH_CATALOG_RELEASE_VERSION,"kia",["one-ev9-price-is-internal-only-estimate","seventeen-kia-prices-are-july-2026-list-observations","equipment-depth-remains-pending"]);
export const createTwentySeventhReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,273,TWENTY_SEVENTH_CATALOG_RELEASE_AS_OF);export const createTwentySeventhReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_SEVENTH_CATALOG_RELEASE_VERSION,TWENTY_SEVENTH_CATALOG_RELEASE_AS_OF,TWENTY_SEVENTH_CATALOG_SOURCE_REVISION,TWENTY_SEVENTH_CATALOG_SOURCE_PATH,TWENTY_SIXTH_CATALOG_RELEASE_VERSION,"lamborghini",["all-three-lamborghini-prices-are-internal-only-estimates","allocation-requires-dogus-dealer-confirmation","equipment-depth-remains-pending"]);
export const createTwentyEighthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,283,TWENTY_EIGHTH_CATALOG_RELEASE_AS_OF);export const createTwentyEighthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_EIGHTH_CATALOG_RELEASE_VERSION,TWENTY_EIGHTH_CATALOG_RELEASE_AS_OF,TWENTY_EIGHTH_CATALOG_SOURCE_REVISION,TWENTY_EIGHTH_CATALOG_SOURCE_PATH,TWENTY_SEVENTH_CATALOG_RELEASE_VERSION,"land-rover",["eight-land-rover-prices-are-internal-only-estimates","two-range-rover-prices-are-official-my2026-observations","equipment-depth-remains-pending"]);
export const createTwentyNinthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,284,TWENTY_NINTH_CATALOG_RELEASE_AS_OF);export const createTwentyNinthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,TWENTY_NINTH_CATALOG_RELEASE_VERSION,TWENTY_NINTH_CATALOG_RELEASE_AS_OF,TWENTY_NINTH_CATALOG_SOURCE_REVISION,TWENTY_NINTH_CATALOG_SOURCE_PATH,TWENTY_EIGHTH_CATALOG_RELEASE_VERSION,"leapmotor",["t03-price-is-internal-only-estimate","c10-and-b10-withheld-no-current-turkey-distributor-evidence","t03-official-page-does-not-assert-aeb-or-lka","equipment-depth-remains-pending"]);
export const createThirtiethReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,292,THIRTIETH_CATALOG_RELEASE_AS_OF);export const createThirtiethReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTIETH_CATALOG_RELEASE_VERSION,THIRTIETH_CATALOG_RELEASE_AS_OF,THIRTIETH_CATALOG_SOURCE_REVISION,THIRTIETH_CATALOG_SOURCE_PATH,TWENTY_NINTH_CATALOG_RELEASE_VERSION,"lexus",["four-lexus-prices-are-internal-only-estimates","four-lexus-prices-are-july-2026-public-observations","equipment-depth-remains-pending"]);
export const createThirtyFirstReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,297,THIRTY_FIRST_CATALOG_RELEASE_AS_OF);export const createThirtyFirstReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_FIRST_CATALOG_RELEASE_VERSION,THIRTY_FIRST_CATALOG_RELEASE_AS_OF,THIRTY_FIRST_CATALOG_SOURCE_REVISION,THIRTY_FIRST_CATALOG_SOURCE_PATH,THIRTIETH_CATALOG_RELEASE_VERSION,"maserati",["five-prices-are-internal-only-estimates","equipment-depth-remains-pending"]);
export const createThirtySecondReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,317,THIRTY_SECOND_CATALOG_RELEASE_AS_OF);export const createThirtySecondReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_SECOND_CATALOG_RELEASE_VERSION,THIRTY_SECOND_CATALOG_RELEASE_AS_OF,THIRTY_SECOND_CATALOG_SOURCE_REVISION,THIRTY_SECOND_CATALOG_SOURCE_PATH,THIRTY_FIRST_CATALOG_RELEASE_VERSION,"mercedes",["twenty-prices-are-internal-only-estimates","commercial-vans-deferred","equipment-depth-remains-pending"]);
export const createThirtyThirdReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,325,THIRTY_THIRD_CATALOG_RELEASE_AS_OF);export const createThirtyThirdReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_THIRD_CATALOG_RELEASE_VERSION,THIRTY_THIRD_CATALOG_RELEASE_AS_OF,THIRTY_THIRD_CATALOG_SOURCE_REVISION,THIRTY_THIRD_CATALOG_SOURCE_PATH,THIRTY_SECOND_CATALOG_RELEASE_VERSION,"mg",["one-price-is-public-observation","seven-prices-are-internal-only-estimates","equipment-depth-remains-pending"]);
export const createThirtyFourthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,335,THIRTY_FOURTH_CATALOG_RELEASE_AS_OF);export const createThirtyFourthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_FOURTH_CATALOG_RELEASE_VERSION,THIRTY_FOURTH_CATALOG_RELEASE_AS_OF,THIRTY_FOURTH_CATALOG_SOURCE_REVISION,THIRTY_FOURTH_CATALOG_SOURCE_PATH,THIRTY_THIRD_CATALOG_RELEASE_VERSION,"mini",["ten-prices-are-internal-only-estimates","equipment-depth-remains-pending"]);
export const createThirtyFifthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,338,THIRTY_FIFTH_CATALOG_RELEASE_AS_OF);export const createThirtyFifthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_FIFTH_CATALOG_RELEASE_VERSION,THIRTY_FIFTH_CATALOG_RELEASE_AS_OF,THIRTY_FIFTH_CATALOG_SOURCE_REVISION,THIRTY_FIFTH_CATALOG_SOURCE_PATH,THIRTY_FOURTH_CATALOG_RELEASE_VERSION,"mitsubishi",["three-prices-are-internal-only-estimates","equipment-depth-remains-pending"]);
export const createThirtySixthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,349,THIRTY_SIXTH_CATALOG_RELEASE_AS_OF);export const createThirtySixthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_SIXTH_CATALOG_RELEASE_VERSION,THIRTY_SIXTH_CATALOG_RELEASE_AS_OF,THIRTY_SIXTH_CATALOG_SOURCE_REVISION,THIRTY_SIXTH_CATALOG_SOURCE_PATH,THIRTY_FIFTH_CATALOG_RELEASE_VERSION,"nissan",["eleven-prices-are-internal-only-estimates","townstar-van-deferred","equipment-depth-remains-pending"]);
export const createThirtySeventhReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,351,THIRTY_SEVENTH_CATALOG_RELEASE_AS_OF);export const createThirtySeventhReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_SEVENTH_CATALOG_RELEASE_VERSION,THIRTY_SEVENTH_CATALOG_RELEASE_AS_OF,THIRTY_SEVENTH_CATALOG_SOURCE_REVISION,THIRTY_SEVENTH_CATALOG_SOURCE_PATH,THIRTY_SIXTH_CATALOG_RELEASE_VERSION,"omoda",["two-prices-are-internal-only-estimates","equipment-depth-remains-pending"]);
export const createThirtyEighthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,362,THIRTY_EIGHTH_CATALOG_RELEASE_AS_OF);export const createThirtyEighthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_EIGHTH_CATALOG_RELEASE_VERSION,THIRTY_EIGHTH_CATALOG_RELEASE_AS_OF,THIRTY_EIGHTH_CATALOG_SOURCE_REVISION,THIRTY_EIGHTH_CATALOG_SOURCE_PATH,THIRTY_SEVENTH_CATALOG_RELEASE_VERSION,"opel",["eleven-prices-are-internal-only-estimates","existing-corsa-hybrid-not-duplicated","commercial-vans-deferred"]);
export const createThirtyNinthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,377,THIRTY_NINTH_CATALOG_RELEASE_AS_OF);export const createThirtyNinthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,THIRTY_NINTH_CATALOG_RELEASE_VERSION,THIRTY_NINTH_CATALOG_RELEASE_AS_OF,THIRTY_NINTH_CATALOG_SOURCE_REVISION,THIRTY_NINTH_CATALOG_SOURCE_PATH,THIRTY_EIGHTH_CATALOG_RELEASE_VERSION,"peugeot",["four-prices-are-public-observations","eleven-prices-are-internal-only-estimates","commercial-vans-deferred"]);
export const createFortiethReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,393,FORTIETH_CATALOG_RELEASE_AS_OF);export const createFortiethReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTIETH_CATALOG_RELEASE_VERSION,FORTIETH_CATALOG_RELEASE_AS_OF,FORTIETH_CATALOG_SOURCE_REVISION,FORTIETH_CATALOG_SOURCE_PATH,THIRTY_NINTH_CATALOG_RELEASE_VERSION,"porsche",["sixteen-prices-are-internal-only-estimates","equipment-depth-remains-pending"]);
export const createFortyFirstReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,401,FORTY_FIRST_CATALOG_RELEASE_AS_OF);export const createFortyFirstReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_FIRST_CATALOG_RELEASE_VERSION,FORTY_FIRST_CATALOG_RELEASE_AS_OF,FORTY_FIRST_CATALOG_SOURCE_REVISION,FORTY_FIRST_CATALOG_SOURCE_PATH,FORTIETH_CATALOG_RELEASE_VERSION,"renault",["eight-prices-are-internal-only-estimates","existing-three-renault-records-not-duplicated"]);
export const createFortySecondReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,407,FORTY_SECOND_CATALOG_RELEASE_AS_OF);export const createFortySecondReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_SECOND_CATALOG_RELEASE_VERSION,FORTY_SECOND_CATALOG_RELEASE_AS_OF,FORTY_SECOND_CATALOG_SOURCE_REVISION,FORTY_SECOND_CATALOG_SOURCE_PATH,FORTY_FIRST_CATALOG_RELEASE_VERSION,"rolls-royce",["six-prices-require-bespoke-dealer-quotation","prices-are-internal-only-estimates"]);
export const createFortyThirdReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,413,FORTY_THIRD_CATALOG_RELEASE_AS_OF);export const createFortyThirdReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_THIRD_CATALOG_RELEASE_VERSION,FORTY_THIRD_CATALOG_RELEASE_AS_OF,FORTY_THIRD_CATALOG_SOURCE_REVISION,FORTY_THIRD_CATALOG_SOURCE_PATH,FORTY_SECOND_CATALOG_RELEASE_VERSION,"seat",["one-public-price-observation","five-internal-only-estimates"]);
export const createFortyFourthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,426,FORTY_FOURTH_CATALOG_RELEASE_AS_OF);export const createFortyFourthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_FOURTH_CATALOG_RELEASE_VERSION,FORTY_FOURTH_CATALOG_RELEASE_AS_OF,FORTY_FOURTH_CATALOG_SOURCE_REVISION,FORTY_FOURTH_CATALOG_SOURCE_PATH,FORTY_THIRD_CATALOG_RELEASE_VERSION,"skoda",["thirteen-prices-are-internal-only-estimates","equipment-depth-remains-pending"]);
export const createFortyFifthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,430,FORTY_FIFTH_CATALOG_RELEASE_AS_OF);export const createFortyFifthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_FIFTH_CATALOG_RELEASE_VERSION,FORTY_FIFTH_CATALOG_RELEASE_AS_OF,FORTY_FIFTH_CATALOG_SOURCE_REVISION,FORTY_FIFTH_CATALOG_SOURCE_PATH,FORTY_FOURTH_CATALOG_RELEASE_VERSION,"subaru",["four-public-price-observations","older-model-year-stock-explicitly-preserved"]);
export const createFortySixthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,435,FORTY_SIXTH_CATALOG_RELEASE_AS_OF);export const createFortySixthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_SIXTH_CATALOG_RELEASE_VERSION,FORTY_SIXTH_CATALOG_RELEASE_AS_OF,FORTY_SIXTH_CATALOG_SOURCE_REVISION,FORTY_SIXTH_CATALOG_SOURCE_PATH,FORTY_FIFTH_CATALOG_RELEASE_VERSION,"suzuki",["five-public-price-observations","colour-options-not-separate-configurations"]);
export const createFortySeventhReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,441,FORTY_SEVENTH_CATALOG_RELEASE_AS_OF);export const createFortySeventhReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_SEVENTH_CATALOG_RELEASE_VERSION,FORTY_SEVENTH_CATALOG_RELEASE_AS_OF,FORTY_SEVENTH_CATALOG_SOURCE_REVISION,FORTY_SEVENTH_CATALOG_SOURCE_PATH,FORTY_SIXTH_CATALOG_RELEASE_VERSION,"tesla",["one-tax-inclusive-public-price-observation","five-internal-only-estimates","configurator-is-dynamic"]);
export const createFortyEighthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,448,FORTY_EIGHTH_CATALOG_RELEASE_AS_OF);export const createFortyEighthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_EIGHTH_CATALOG_RELEASE_VERSION,FORTY_EIGHTH_CATALOG_RELEASE_AS_OF,FORTY_EIGHTH_CATALOG_SOURCE_REVISION,FORTY_EIGHTH_CATALOG_SOURCE_PATH,FORTY_SEVENTH_CATALOG_RELEASE_VERSION,"togg",["seven-public-price-observations","existing-t10x-v2-long-range-not-duplicated"]);
export const createFortyNinthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,456,FORTY_NINTH_CATALOG_RELEASE_AS_OF);export const createFortyNinthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FORTY_NINTH_CATALOG_RELEASE_VERSION,FORTY_NINTH_CATALOG_RELEASE_AS_OF,FORTY_NINTH_CATALOG_SOURCE_REVISION,FORTY_NINTH_CATALOG_SOURCE_PATH,FORTY_EIGHTH_CATALOG_RELEASE_VERSION,"toyota",["two-public-price-observations","six-internal-only-estimates","commercial-models-deferred"]);
export const createFiftiethReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,471,FIFTIETH_CATALOG_RELEASE_AS_OF);export const createFiftiethReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FIFTIETH_CATALOG_RELEASE_VERSION,FIFTIETH_CATALOG_RELEASE_AS_OF,FIFTIETH_CATALOG_SOURCE_REVISION,FIFTIETH_CATALOG_SOURCE_PATH,FORTY_NINTH_CATALOG_RELEASE_VERSION,"volkswagen",["fifteen-prices-are-internal-only-estimates","commercial-models-deferred"]);
export const createFiftyFirstReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,477,FIFTY_FIRST_CATALOG_RELEASE_AS_OF);export const createFiftyFirstReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FIFTY_FIRST_CATALOG_RELEASE_VERSION,FIFTY_FIRST_CATALOG_RELEASE_AS_OF,FIFTY_FIRST_CATALOG_SOURCE_REVISION,FIFTY_FIRST_CATALOG_SOURCE_PATH,FIFTIETH_CATALOG_RELEASE_VERSION,"aston-martin",["six-prices-require-dealer-quotation","prices-are-internal-only-estimates"]);
export const createFiftySecondReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,497,FIFTY_SECOND_CATALOG_RELEASE_AS_OF);export const createFiftySecondReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FIFTY_SECOND_CATALOG_RELEASE_VERSION,FIFTY_SECOND_CATALOG_RELEASE_AS_OF,FIFTY_SECOND_CATALOG_SOURCE_REVISION,FIFTY_SECOND_CATALOG_SOURCE_PATH,FIFTY_FIRST_CATALOG_RELEASE_VERSION,"audi",["twenty-prices-are-internal-only-estimates","official-price-row-enrichment-pending"]);
export const createFiftyThirdReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,502,FIFTY_THIRD_CATALOG_RELEASE_AS_OF);export const createFiftyThirdReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FIFTY_THIRD_CATALOG_RELEASE_VERSION,FIFTY_THIRD_CATALOG_RELEASE_AS_OF,FIFTY_THIRD_CATALOG_SOURCE_REVISION,FIFTY_THIRD_CATALOG_SOURCE_PATH,FIFTY_SECOND_CATALOG_RELEASE_VERSION,"bentley",["five-prices-require-dealer-quotation","prices-are-internal-only-estimates"]);
export const createFiftyFourthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,513,FIFTY_FOURTH_CATALOG_RELEASE_AS_OF);export const createFiftyFourthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FIFTY_FOURTH_CATALOG_RELEASE_VERSION,FIFTY_FOURTH_CATALOG_RELEASE_AS_OF,FIFTY_FOURTH_CATALOG_SOURCE_REVISION,FIFTY_FOURTH_CATALOG_SOURCE_PATH,FIFTY_THIRD_CATALOG_RELEASE_VERSION,"volvo",["one-public-price-observation","ten-internal-only-estimates"]);
export const createFiftyFifthReleasePayload=(r:readonly PublishedVehicleRecord[])=>laterPayload(r,577,FIFTY_FIFTH_CATALOG_RELEASE_AS_OF);export const createFiftyFifthReleaseManifest=(p:ProductionCatalogReleasePayload)=>laterManifest(p,FIFTY_FIFTH_CATALOG_RELEASE_VERSION,FIFTY_FIFTH_CATALOG_RELEASE_AS_OF,FIFTY_FIFTH_CATALOG_SOURCE_REVISION,FIFTY_FIFTH_CATALOG_SOURCE_PATH,FIFTY_FOURTH_CATALOG_RELEASE_VERSION,"commercial",["sixty-four-new-commercial-configurations","heavy-truck-and-bus-product-families-excluded-from-cars-decision-contract","estimated-prices-are-internal-only"]);

export function validateProductionCatalogRelease(
  payload: ProductionCatalogReleasePayload,
  manifest: ProductionCatalogReleaseManifest,
  exactPayloadBytes?: string,
): readonly string[] {
  const errors: string[] = [];
  const canonicalBytes = serializeCanonical(payload);
  const ids = payload.records.map(({ variant }) => variant.id);
  const sortedIds = [...ids].sort();
  if (!/^\d+\.\d+\.\d+$/.test(manifest.catalog_release_version)) errors.push("INVALID_RELEASE_VERSION");
  if (payload.catalog_schema_version !== CATALOG_SCHEMA_VERSION || manifest.catalog_schema_version !== CATALOG_SCHEMA_VERSION) errors.push("UNSUPPORTED_SCHEMA_VERSION");
  if (manifest.catalog_payload_hash !== catalogPayloadHash(canonicalBytes)) errors.push("PAYLOAD_HASH_MISMATCH");
  if (exactPayloadBytes !== undefined && exactPayloadBytes !== canonicalBytes) errors.push("PAYLOAD_NOT_CANONICAL");
  if (manifest.record_count !== payload.records.length || manifest.publishable_record_count !== payload.records.length) errors.push("RECORD_COUNT_MISMATCH");
  if (new Set(ids).size !== ids.length) errors.push("DUPLICATE_VARIANT_ID");
  if (JSON.stringify(sortedIds) !== JSON.stringify([...manifest.included_variant_ids].sort())) errors.push("INCLUDED_IDS_MISMATCH");
  if (manifest.catalog_release_version === FIRST_CATALOG_RELEASE_VERSION && JSON.stringify(sortedIds) !== JSON.stringify(FIRST_RELEASE_VARIANT_IDS)) errors.push("FIRST_RELEASE_MEMBERSHIP_MISMATCH");
  if (payload.market !== "TR" || manifest.market !== "TR") errors.push("MARKET_MISMATCH");
  if (!manifest.source_revision) errors.push("SOURCE_REVISION_MISSING");
  let expectedSourcePath = manifest.catalog_release_version === FIRST_CATALOG_RELEASE_VERSION
    ? CATALOG_SOURCE_PATH : manifest.catalog_release_version === SECOND_CATALOG_RELEASE_VERSION
      ? SECOND_CATALOG_SOURCE_PATH : manifest.catalog_release_version === THIRD_CATALOG_RELEASE_VERSION
        ? THIRD_CATALOG_SOURCE_PATH : manifest.catalog_release_version === FOURTH_CATALOG_RELEASE_VERSION
          ? FOURTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version === FIFTH_CATALOG_RELEASE_VERSION
            ? FIFTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version === SIXTH_CATALOG_RELEASE_VERSION
              ? SIXTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version===SEVENTH_CATALOG_RELEASE_VERSION
                ? SEVENTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version===EIGHTH_CATALOG_RELEASE_VERSION
                  ? EIGHTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version===NINTH_CATALOG_RELEASE_VERSION
                    ? NINTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version===TENTH_CATALOG_RELEASE_VERSION
                      ? TENTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version===ELEVENTH_CATALOG_RELEASE_VERSION
                        ? ELEVENTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version===TWELFTH_CATALOG_RELEASE_VERSION
                          ? TWELFTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version===THIRTEENTH_CATALOG_RELEASE_VERSION
                            ? THIRTEENTH_CATALOG_SOURCE_PATH : manifest.catalog_release_version===FOURTEENTH_CATALOG_RELEASE_VERSION?FOURTEENTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===FIFTEENTH_CATALOG_RELEASE_VERSION?FIFTEENTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===SIXTEENTH_CATALOG_RELEASE_VERSION?SIXTEENTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===SEVENTEENTH_CATALOG_RELEASE_VERSION?SEVENTEENTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===EIGHTEENTH_CATALOG_RELEASE_VERSION?EIGHTEENTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===NINETEENTH_CATALOG_RELEASE_VERSION?NINETEENTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTIETH_CATALOG_RELEASE_VERSION?TWENTIETH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_FIRST_CATALOG_RELEASE_VERSION?TWENTY_FIRST_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_SECOND_CATALOG_RELEASE_VERSION?TWENTY_SECOND_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_THIRD_CATALOG_RELEASE_VERSION?TWENTY_THIRD_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_FOURTH_CATALOG_RELEASE_VERSION?TWENTY_FOURTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_FIFTH_CATALOG_RELEASE_VERSION?TWENTY_FIFTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_SIXTH_CATALOG_RELEASE_VERSION?TWENTY_SIXTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_SEVENTH_CATALOG_RELEASE_VERSION?TWENTY_SEVENTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_EIGHTH_CATALOG_RELEASE_VERSION?TWENTY_EIGHTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===TWENTY_NINTH_CATALOG_RELEASE_VERSION?TWENTY_NINTH_CATALOG_SOURCE_PATH:manifest.catalog_release_version===THIRTIETH_CATALOG_RELEASE_VERSION?THIRTIETH_CATALOG_SOURCE_PATH:undefined;
  const newestSourcePaths:Record<string,string>={
    [THIRTY_FIRST_CATALOG_RELEASE_VERSION]:THIRTY_FIRST_CATALOG_SOURCE_PATH,[THIRTY_SECOND_CATALOG_RELEASE_VERSION]:THIRTY_SECOND_CATALOG_SOURCE_PATH,
    [THIRTY_THIRD_CATALOG_RELEASE_VERSION]:THIRTY_THIRD_CATALOG_SOURCE_PATH,[THIRTY_FOURTH_CATALOG_RELEASE_VERSION]:THIRTY_FOURTH_CATALOG_SOURCE_PATH,
    [THIRTY_FIFTH_CATALOG_RELEASE_VERSION]:THIRTY_FIFTH_CATALOG_SOURCE_PATH,[THIRTY_SIXTH_CATALOG_RELEASE_VERSION]:THIRTY_SIXTH_CATALOG_SOURCE_PATH,
    [THIRTY_SEVENTH_CATALOG_RELEASE_VERSION]:THIRTY_SEVENTH_CATALOG_SOURCE_PATH,[THIRTY_EIGHTH_CATALOG_RELEASE_VERSION]:THIRTY_EIGHTH_CATALOG_SOURCE_PATH,
    [THIRTY_NINTH_CATALOG_RELEASE_VERSION]:THIRTY_NINTH_CATALOG_SOURCE_PATH,[FORTIETH_CATALOG_RELEASE_VERSION]:FORTIETH_CATALOG_SOURCE_PATH,
    [FORTY_FIRST_CATALOG_RELEASE_VERSION]:FORTY_FIRST_CATALOG_SOURCE_PATH,[FORTY_SECOND_CATALOG_RELEASE_VERSION]:FORTY_SECOND_CATALOG_SOURCE_PATH,
    [FORTY_THIRD_CATALOG_RELEASE_VERSION]:FORTY_THIRD_CATALOG_SOURCE_PATH,[FORTY_FOURTH_CATALOG_RELEASE_VERSION]:FORTY_FOURTH_CATALOG_SOURCE_PATH,
    [FORTY_FIFTH_CATALOG_RELEASE_VERSION]:FORTY_FIFTH_CATALOG_SOURCE_PATH,[FORTY_SIXTH_CATALOG_RELEASE_VERSION]:FORTY_SIXTH_CATALOG_SOURCE_PATH,
    [FORTY_SEVENTH_CATALOG_RELEASE_VERSION]:FORTY_SEVENTH_CATALOG_SOURCE_PATH,[FORTY_EIGHTH_CATALOG_RELEASE_VERSION]:FORTY_EIGHTH_CATALOG_SOURCE_PATH,
    [FORTY_NINTH_CATALOG_RELEASE_VERSION]:FORTY_NINTH_CATALOG_SOURCE_PATH,[FIFTIETH_CATALOG_RELEASE_VERSION]:FIFTIETH_CATALOG_SOURCE_PATH,
    [FIFTY_FIRST_CATALOG_RELEASE_VERSION]:FIFTY_FIRST_CATALOG_SOURCE_PATH,[FIFTY_SECOND_CATALOG_RELEASE_VERSION]:FIFTY_SECOND_CATALOG_SOURCE_PATH,
    [FIFTY_THIRD_CATALOG_RELEASE_VERSION]:FIFTY_THIRD_CATALOG_SOURCE_PATH,[FIFTY_FOURTH_CATALOG_RELEASE_VERSION]:FIFTY_FOURTH_CATALOG_SOURCE_PATH,
    [FIFTY_FIFTH_CATALOG_RELEASE_VERSION]:FIFTY_FIFTH_CATALOG_SOURCE_PATH,
  };expectedSourcePath??=newestSourcePaths[manifest.catalog_release_version];
  if (manifest.source_path !== expectedSourcePath) errors.push("SOURCE_AUTHORITY_INVALID");
  if (payload.effective_as_of !== manifest.effective_as_of) errors.push("EFFECTIVE_AS_OF_MISMATCH");
  if (manifest.catalog_release_version === FIRST_CATALOG_RELEASE_VERSION && payload.effective_as_of !== CATALOG_BOOTSTRAP_INSTANT) errors.push("BOOTSTRAP_INSTANT_MISMATCH");
  if (manifest.catalog_release_version === SECOND_CATALOG_RELEASE_VERSION && (
    payload.effective_as_of !== SECOND_CATALOG_RELEASE_AS_OF || manifest.previous_release !== FIRST_CATALOG_RELEASE_VERSION
  )) errors.push("SECOND_RELEASE_LINEAGE_INVALID");
  if (manifest.catalog_release_version === THIRD_CATALOG_RELEASE_VERSION && (
    payload.effective_as_of !== THIRD_CATALOG_RELEASE_AS_OF || manifest.previous_release !== SECOND_CATALOG_RELEASE_VERSION
  )) errors.push("THIRD_RELEASE_LINEAGE_INVALID");
  if (manifest.catalog_release_version === FOURTH_CATALOG_RELEASE_VERSION && (
    payload.effective_as_of !== FOURTH_CATALOG_RELEASE_AS_OF || manifest.previous_release !== THIRD_CATALOG_RELEASE_VERSION
  )) errors.push("FOURTH_RELEASE_LINEAGE_INVALID");
  if (manifest.catalog_release_version === FIFTH_CATALOG_RELEASE_VERSION && (
    payload.effective_as_of !== FIFTH_CATALOG_RELEASE_AS_OF || manifest.previous_release !== FOURTH_CATALOG_RELEASE_VERSION
  )) errors.push("FIFTH_RELEASE_LINEAGE_INVALID");
  if (manifest.catalog_release_version === SIXTH_CATALOG_RELEASE_VERSION && (payload.effective_as_of !== SIXTH_CATALOG_RELEASE_AS_OF || manifest.previous_release !== FIFTH_CATALOG_RELEASE_VERSION)) errors.push("SIXTH_RELEASE_LINEAGE_INVALID");
  if(manifest.catalog_release_version===SEVENTH_CATALOG_RELEASE_VERSION&&(payload.effective_as_of!==SEVENTH_CATALOG_RELEASE_AS_OF||manifest.previous_release!==SIXTH_CATALOG_RELEASE_VERSION))errors.push("SEVENTH_RELEASE_LINEAGE_INVALID");
  if(manifest.catalog_release_version===EIGHTH_CATALOG_RELEASE_VERSION&&(payload.effective_as_of!==EIGHTH_CATALOG_RELEASE_AS_OF||manifest.previous_release!==SEVENTH_CATALOG_RELEASE_VERSION))errors.push("EIGHTH_RELEASE_LINEAGE_INVALID");
  if(manifest.catalog_release_version===NINTH_CATALOG_RELEASE_VERSION&&(payload.effective_as_of!==NINTH_CATALOG_RELEASE_AS_OF||manifest.previous_release!==EIGHTH_CATALOG_RELEASE_VERSION))errors.push("NINTH_RELEASE_LINEAGE_INVALID");
  if(manifest.catalog_release_version===TENTH_CATALOG_RELEASE_VERSION&&(payload.effective_as_of!==TENTH_CATALOG_RELEASE_AS_OF||manifest.previous_release!==NINTH_CATALOG_RELEASE_VERSION))errors.push("TENTH_RELEASE_LINEAGE_INVALID");
  if(manifest.catalog_release_version===ELEVENTH_CATALOG_RELEASE_VERSION&&(payload.effective_as_of!==ELEVENTH_CATALOG_RELEASE_AS_OF||manifest.previous_release!==TENTH_CATALOG_RELEASE_VERSION))errors.push("ELEVENTH_RELEASE_LINEAGE_INVALID");
  if(manifest.catalog_release_version===TWELFTH_CATALOG_RELEASE_VERSION&&(payload.effective_as_of!==TWELFTH_CATALOG_RELEASE_AS_OF||manifest.previous_release!==ELEVENTH_CATALOG_RELEASE_VERSION))errors.push("TWELFTH_RELEASE_LINEAGE_INVALID");
  if(manifest.catalog_release_version===THIRTEENTH_CATALOG_RELEASE_VERSION&&(payload.effective_as_of!==THIRTEENTH_CATALOG_RELEASE_AS_OF||manifest.previous_release!==TWELFTH_CATALOG_RELEASE_VERSION))errors.push("THIRTEENTH_RELEASE_LINEAGE_INVALID");
  const laterLineage:Record<string,[string,string]>=Object.fromEntries([[FOURTEENTH_CATALOG_RELEASE_VERSION,FOURTEENTH_CATALOG_RELEASE_AS_OF,THIRTEENTH_CATALOG_RELEASE_VERSION],[FIFTEENTH_CATALOG_RELEASE_VERSION,FIFTEENTH_CATALOG_RELEASE_AS_OF,FOURTEENTH_CATALOG_RELEASE_VERSION],[SIXTEENTH_CATALOG_RELEASE_VERSION,SIXTEENTH_CATALOG_RELEASE_AS_OF,FIFTEENTH_CATALOG_RELEASE_VERSION],[SEVENTEENTH_CATALOG_RELEASE_VERSION,SEVENTEENTH_CATALOG_RELEASE_AS_OF,SIXTEENTH_CATALOG_RELEASE_VERSION],[EIGHTEENTH_CATALOG_RELEASE_VERSION,EIGHTEENTH_CATALOG_RELEASE_AS_OF,SEVENTEENTH_CATALOG_RELEASE_VERSION],[NINETEENTH_CATALOG_RELEASE_VERSION,NINETEENTH_CATALOG_RELEASE_AS_OF,EIGHTEENTH_CATALOG_RELEASE_VERSION],[TWENTIETH_CATALOG_RELEASE_VERSION,TWENTIETH_CATALOG_RELEASE_AS_OF,NINETEENTH_CATALOG_RELEASE_VERSION]].map(([v,a,p])=>[v,[a,p]]));const lineage=laterLineage[manifest.catalog_release_version];if(lineage&&(payload.effective_as_of!==lineage[0]||manifest.previous_release!==lineage[1]))errors.push("LATER_RELEASE_LINEAGE_INVALID");
  Object.assign(laterLineage,Object.fromEntries([[TWENTY_FIRST_CATALOG_RELEASE_VERSION,TWENTY_FIRST_CATALOG_RELEASE_AS_OF,TWENTIETH_CATALOG_RELEASE_VERSION],[TWENTY_SECOND_CATALOG_RELEASE_VERSION,TWENTY_SECOND_CATALOG_RELEASE_AS_OF,TWENTY_FIRST_CATALOG_RELEASE_VERSION],[TWENTY_THIRD_CATALOG_RELEASE_VERSION,TWENTY_THIRD_CATALOG_RELEASE_AS_OF,TWENTY_SECOND_CATALOG_RELEASE_VERSION],[TWENTY_FOURTH_CATALOG_RELEASE_VERSION,TWENTY_FOURTH_CATALOG_RELEASE_AS_OF,TWENTY_THIRD_CATALOG_RELEASE_VERSION],[TWENTY_FIFTH_CATALOG_RELEASE_VERSION,TWENTY_FIFTH_CATALOG_RELEASE_AS_OF,TWENTY_FOURTH_CATALOG_RELEASE_VERSION],[TWENTY_SIXTH_CATALOG_RELEASE_VERSION,TWENTY_SIXTH_CATALOG_RELEASE_AS_OF,TWENTY_FIFTH_CATALOG_RELEASE_VERSION],[TWENTY_SEVENTH_CATALOG_RELEASE_VERSION,TWENTY_SEVENTH_CATALOG_RELEASE_AS_OF,TWENTY_SIXTH_CATALOG_RELEASE_VERSION],[TWENTY_EIGHTH_CATALOG_RELEASE_VERSION,TWENTY_EIGHTH_CATALOG_RELEASE_AS_OF,TWENTY_SEVENTH_CATALOG_RELEASE_VERSION],[TWENTY_NINTH_CATALOG_RELEASE_VERSION,TWENTY_NINTH_CATALOG_RELEASE_AS_OF,TWENTY_EIGHTH_CATALOG_RELEASE_VERSION],[THIRTIETH_CATALOG_RELEASE_VERSION,THIRTIETH_CATALOG_RELEASE_AS_OF,TWENTY_NINTH_CATALOG_RELEASE_VERSION]].map(([v,a,p])=>[v,[a,p]])));const newLineage=laterLineage[manifest.catalog_release_version];if(newLineage&&(payload.effective_as_of!==newLineage[0]||manifest.previous_release!==newLineage[1])&&!lineage)errors.push("LATER_RELEASE_LINEAGE_INVALID");
  const newestLineage:Record<string,[string,string]>=Object.fromEntries([[THIRTY_FIRST_CATALOG_RELEASE_VERSION,THIRTY_FIRST_CATALOG_RELEASE_AS_OF,THIRTIETH_CATALOG_RELEASE_VERSION],[THIRTY_SECOND_CATALOG_RELEASE_VERSION,THIRTY_SECOND_CATALOG_RELEASE_AS_OF,THIRTY_FIRST_CATALOG_RELEASE_VERSION],[THIRTY_THIRD_CATALOG_RELEASE_VERSION,THIRTY_THIRD_CATALOG_RELEASE_AS_OF,THIRTY_SECOND_CATALOG_RELEASE_VERSION],[THIRTY_FOURTH_CATALOG_RELEASE_VERSION,THIRTY_FOURTH_CATALOG_RELEASE_AS_OF,THIRTY_THIRD_CATALOG_RELEASE_VERSION],[THIRTY_FIFTH_CATALOG_RELEASE_VERSION,THIRTY_FIFTH_CATALOG_RELEASE_AS_OF,THIRTY_FOURTH_CATALOG_RELEASE_VERSION],[THIRTY_SIXTH_CATALOG_RELEASE_VERSION,THIRTY_SIXTH_CATALOG_RELEASE_AS_OF,THIRTY_FIFTH_CATALOG_RELEASE_VERSION],[THIRTY_SEVENTH_CATALOG_RELEASE_VERSION,THIRTY_SEVENTH_CATALOG_RELEASE_AS_OF,THIRTY_SIXTH_CATALOG_RELEASE_VERSION],[THIRTY_EIGHTH_CATALOG_RELEASE_VERSION,THIRTY_EIGHTH_CATALOG_RELEASE_AS_OF,THIRTY_SEVENTH_CATALOG_RELEASE_VERSION],[THIRTY_NINTH_CATALOG_RELEASE_VERSION,THIRTY_NINTH_CATALOG_RELEASE_AS_OF,THIRTY_EIGHTH_CATALOG_RELEASE_VERSION],[FORTIETH_CATALOG_RELEASE_VERSION,FORTIETH_CATALOG_RELEASE_AS_OF,THIRTY_NINTH_CATALOG_RELEASE_VERSION]].map(([v,a,p])=>[v,[a,p]]));const newest=newestLineage[manifest.catalog_release_version];if(newest&&(payload.effective_as_of!==newest[0]||manifest.previous_release!==newest[1]))errors.push("LATER_RELEASE_LINEAGE_INVALID");
  Object.assign(newestLineage,Object.fromEntries([[FORTY_FIRST_CATALOG_RELEASE_VERSION,FORTY_FIRST_CATALOG_RELEASE_AS_OF,FORTIETH_CATALOG_RELEASE_VERSION],[FORTY_SECOND_CATALOG_RELEASE_VERSION,FORTY_SECOND_CATALOG_RELEASE_AS_OF,FORTY_FIRST_CATALOG_RELEASE_VERSION],[FORTY_THIRD_CATALOG_RELEASE_VERSION,FORTY_THIRD_CATALOG_RELEASE_AS_OF,FORTY_SECOND_CATALOG_RELEASE_VERSION],[FORTY_FOURTH_CATALOG_RELEASE_VERSION,FORTY_FOURTH_CATALOG_RELEASE_AS_OF,FORTY_THIRD_CATALOG_RELEASE_VERSION],[FORTY_FIFTH_CATALOG_RELEASE_VERSION,FORTY_FIFTH_CATALOG_RELEASE_AS_OF,FORTY_FOURTH_CATALOG_RELEASE_VERSION],[FORTY_SIXTH_CATALOG_RELEASE_VERSION,FORTY_SIXTH_CATALOG_RELEASE_AS_OF,FORTY_FIFTH_CATALOG_RELEASE_VERSION],[FORTY_SEVENTH_CATALOG_RELEASE_VERSION,FORTY_SEVENTH_CATALOG_RELEASE_AS_OF,FORTY_SIXTH_CATALOG_RELEASE_VERSION],[FORTY_EIGHTH_CATALOG_RELEASE_VERSION,FORTY_EIGHTH_CATALOG_RELEASE_AS_OF,FORTY_SEVENTH_CATALOG_RELEASE_VERSION],[FORTY_NINTH_CATALOG_RELEASE_VERSION,FORTY_NINTH_CATALOG_RELEASE_AS_OF,FORTY_EIGHTH_CATALOG_RELEASE_VERSION],[FIFTIETH_CATALOG_RELEASE_VERSION,FIFTIETH_CATALOG_RELEASE_AS_OF,FORTY_NINTH_CATALOG_RELEASE_VERSION]].map(([v,a,p])=>[v,[a,p]])));const newestExtended=newestLineage[manifest.catalog_release_version];if(newestExtended&&(payload.effective_as_of!==newestExtended[0]||manifest.previous_release!==newestExtended[1])&&!newest)errors.push("LATER_RELEASE_LINEAGE_INVALID");
  Object.assign(newestLineage,Object.fromEntries([[FIFTY_FIRST_CATALOG_RELEASE_VERSION,FIFTY_FIRST_CATALOG_RELEASE_AS_OF,FIFTIETH_CATALOG_RELEASE_VERSION],[FIFTY_SECOND_CATALOG_RELEASE_VERSION,FIFTY_SECOND_CATALOG_RELEASE_AS_OF,FIFTY_FIRST_CATALOG_RELEASE_VERSION],[FIFTY_THIRD_CATALOG_RELEASE_VERSION,FIFTY_THIRD_CATALOG_RELEASE_AS_OF,FIFTY_SECOND_CATALOG_RELEASE_VERSION],[FIFTY_FOURTH_CATALOG_RELEASE_VERSION,FIFTY_FOURTH_CATALOG_RELEASE_AS_OF,FIFTY_THIRD_CATALOG_RELEASE_VERSION]].map(([v,a,p])=>[v,[a,p]])));const finalLineage=newestLineage[manifest.catalog_release_version];if(finalLineage&&(payload.effective_as_of!==finalLineage[0]||manifest.previous_release!==finalLineage[1])&&!newestExtended)errors.push("LATER_RELEASE_LINEAGE_INVALID");
  if(manifest.catalog_release_version===FIFTY_FIFTH_CATALOG_RELEASE_VERSION&&(payload.effective_as_of!==FIFTY_FIFTH_CATALOG_RELEASE_AS_OF||manifest.previous_release!==FIFTY_FOURTH_CATALOG_RELEASE_VERSION))errors.push("LATER_RELEASE_LINEAGE_INVALID");
  if (manifest.validator_status !== "PASS") errors.push("VALIDATOR_NOT_PASS");
  if (!manifest.approval || manifest.approval.state !== "APPROVED" || !manifest.approval.reference) errors.push("APPROVAL_EVIDENCE_MISSING");
  if (!manifest.staging || manifest.staging.state !== "STAGED" || !manifest.staging.actor_reference) errors.push("STAGING_EVIDENCE_MISSING");
  if (!manifest.staging || manifest.staging.target !== "INTERNAL_INTEGRATION_NON_PRODUCTION") errors.push("STAGING_TARGET_INVALID");
  return errors;
}

export function validateProductionCatalogActivation(
  activation: ProductionCatalogActivation,
  manifest: ProductionCatalogReleaseManifest,
): readonly string[] {
  const errors: string[] = [];
  if (activation.market !== "TR" || activation.market !== manifest.market) errors.push("ACTIVATION_MARKET_MISMATCH");
  if (activation.state !== "ACTIVE") errors.push("ACTIVATION_STATE_INVALID");
  if (activation.active_catalog_release_version !== manifest.catalog_release_version) errors.push("ACTIVATION_RELEASE_MISMATCH");
  if (activation.catalog_payload_hash !== manifest.catalog_payload_hash) errors.push("ACTIVATION_HASH_MISMATCH");
  if (!activation.activation_reference) errors.push("ACTIVATION_REFERENCE_MISSING");
  if (!Number.isFinite(Date.parse(activation.activated_at))) errors.push("ACTIVATION_TIMESTAMP_INVALID");
  if (activation.previous_active_release !== manifest.previous_release) errors.push("PREVIOUS_ACTIVE_RELEASE_MISMATCH");
  if (activation.rollback_release !== manifest.previous_release) errors.push("ROLLBACK_RELEASE_INVALID");
  if (manifest.validator_status !== "PASS" || manifest.approval.state !== "APPROVED") errors.push("RELEASE_NOT_ACTIVATION_ELIGIBLE");
  return errors;
}
