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
  const expectedSourcePath = manifest.catalog_release_version === FIRST_CATALOG_RELEASE_VERSION
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
                            ? THIRTEENTH_CATALOG_SOURCE_PATH : undefined;
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
