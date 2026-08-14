import { createHash } from "node:crypto";

import type { PublishedVehicleRecord } from "@/features/vehicle-data/buildPublishedCatalog";

export const FIRST_CATALOG_RELEASE_VERSION = "0.1.0";
export const CATALOG_SCHEMA_VERSION = "0.1";
export const CATALOG_SOURCE_REVISION = "pilot-vehicles:2026-08-14";
export const CATALOG_SOURCE_PATH = "data/production/pilotVehicles.ts";
export const CATALOG_BOOTSTRAP_INSTANT = "2026-08-14T12:00:00.000Z";
export const CATALOG_GENERATOR_VERSION = "production-catalog-release-generator:0.1.0";
export const CATALOG_VALIDATOR_VERSION = "production-catalog-release-validator:0.1.0";

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
  readonly effective_as_of: typeof CATALOG_BOOTSTRAP_INSTANT;
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
  readonly previous_release: null;
  readonly declared_limitations: readonly string[];
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
  if (manifest.source_path !== CATALOG_SOURCE_PATH) errors.push("SOURCE_AUTHORITY_INVALID");
  if (payload.effective_as_of !== CATALOG_BOOTSTRAP_INSTANT || manifest.effective_as_of !== CATALOG_BOOTSTRAP_INSTANT) errors.push("BOOTSTRAP_INSTANT_MISMATCH");
  if (manifest.validator_status !== "PASS") errors.push("VALIDATOR_NOT_PASS");
  if (!manifest.approval || manifest.approval.state !== "APPROVED" || !manifest.approval.reference) errors.push("APPROVAL_EVIDENCE_MISSING");
  if (!manifest.staging || manifest.staging.state !== "STAGED" || !manifest.staging.actor_reference) errors.push("STAGING_EVIDENCE_MISSING");
  if (!manifest.staging || manifest.staging.target !== "INTERNAL_INTEGRATION_NON_PRODUCTION") errors.push("STAGING_TARGET_INVALID");
  return errors;
}
