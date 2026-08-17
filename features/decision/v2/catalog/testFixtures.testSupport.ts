import { catalogPayloadHash, serializeCanonical } from "@/features/vehicle-data/productionCatalogRelease";

import type { CatalogReleaseRepository } from "./repository";

const EFFECTIVE = "2026-08-18T23:00:00.000Z";
export function sourced<T>(value: T) {
  return { value, confidence: "HIGH", provenance: [{ sourceId: "source-1", sourceUrl: "https://example.com/catalog", accessedAt: EFFECTIVE, documentVersion: "test", extractionMethod: "DOCUMENT_IMPORT", confidence: "HIGH", limitations: [] }] };
}

export function variant(id: string, brand: string, model: string, trim: string, overrides: Readonly<Record<string, unknown>> = {}) {
  return { variant: {
    id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced(brand), model: sourced(model), trim: sourced(trim),
    bodyStyle: sourced("Generic"), modelYear: sourced(2026),
    powertrain: { fuelType: sourced("GASOLINE"), powerKw: sourced(100), transmission: sourced("Automatic") },
    dimensions: {}, efficiency: {}, safetyFeatureCodes: [], createdAt: EFFECTIVE, updatedAt: EFFECTIVE,
    ...overrides,
  }, activeNewPrice: null };
}

export function release(version: string, records: readonly ReturnType<typeof variant>[], effectiveAsOf = EFFECTIVE) {
  const catalog = { catalog_schema_version: "0.1", market: "TR", effective_as_of: effectiveAsOf, records };
  const catalogHash = catalogPayloadHash(serializeCanonical(catalog));
  const manifest = {
    catalog_release_version: version, catalog_schema_version: "0.1", catalog_payload_hash: catalogHash, market: "TR",
    source_revision: "test-revision", source_path: "test-source", effective_as_of: effectiveAsOf,
    record_count: records.length, publishable_record_count: records.length, included_variant_ids: records.map((record) => record.variant.id).sort(),
    generator_version: "test-generator", validator_version: "test-validator", validator_status: "PASS",
    approval: { state: "APPROVED", at: effectiveAsOf, reference: "test-approval" },
    staging: { state: "STAGED", at: effectiveAsOf, actor_reference: "test-actor", target: "INTERNAL_INTEGRATION_NON_PRODUCTION" },
    previous_release: null, declared_limitations: [],
  };
  const pointer = { market: "TR", state: "ACTIVE", active_catalog_release_version: version, catalog_payload_hash: catalogHash, activated_at: effectiveAsOf, activation_reference: "test-activation", previous_active_release: "0.0.1", rollback_release: "0.0.1" };
  return { catalog, manifest, pointer, facets: { version: 1, facets: [] }, catalogHash };
}

export function repository(releases: Readonly<Record<string, ReturnType<typeof release>>>, activeVersion: string): CatalogReleaseRepository {
  return {
    loadActivePointer: async () => releases[activeVersion]!.pointer,
    loadReleaseManifest: async (version) => releases[version]!.manifest,
    loadReleaseCatalog: async (version) => releases[version]!.catalog,
    loadDecisionFacets: async (version) => releases[version]!.facets,
    releaseExists: async (version) => releases[version] !== undefined,
  };
}
