import { catalogPayloadHash, serializeCanonical } from "@/features/vehicle-data/productionCatalogRelease";

import type { CatalogAuthoritySnapshot } from "../domain/conversationMemory";
import { activePointerSchema, catalogManifestSchema, catalogPayloadSchema, decisionFacetsSchema } from "../schema/catalogReleaseSchemas";
import { parseStrictRfc3339Instant, validateCatalogTemporalInvariant } from "../schema/strictRfc3339Timestamp";
import { buildModelFamilyIndexes, createImmutableIndex } from "./familyIndex";
import type { CatalogReleaseRepository } from "./repository";
import { assertSafeCatalogReleaseVersion } from "./repository";
import type { CatalogDiagnostic, CatalogFact, CatalogFactProvenance, CatalogPriceObservationFact, CatalogSnapshot, CatalogSnapshotLoadResult, CatalogTemporalStatus, CatalogVariantSnapshot } from "./types";

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);
  for (const child of Object.values(value as object)) deepFreeze(child, seen);
  return Object.freeze(value);
}

export function evaluateCatalogTemporalStatus(effectiveAsOf: string, now: Date): CatalogTemporalStatus {
  const effective = parseStrictRfc3339Instant(effectiveAsOf);
  if (effective === undefined || !Number.isFinite(now.getTime())) return "TEMPORAL_METADATA_INVALID";
  return now.getTime() < effective ? "NOT_YET_EFFECTIVE" : "EFFECTIVE";
}

export function buildCatalogSnapshot(input: {
  readonly pointer?: unknown; readonly manifest: unknown; readonly catalog: unknown; readonly decisionFacets: unknown;
  readonly now: Date; readonly pinned?: { readonly releaseVersion: string; readonly catalogFingerprint: string; readonly activatedAt?: string };
  readonly enforceTemporalInvariant?: boolean;
}): CatalogSnapshotLoadResult {
  const diagnostics: CatalogDiagnostic[] = [];
  const manifestResult = catalogManifestSchema.safeParse(input.manifest);
  const catalogResult = catalogPayloadSchema.safeParse(input.catalog);
  if (!manifestResult.success) {
    diagnostics.push({ code: "UNSUPPORTED_CATALOG_SCHEMA" });
    return { status: "UNAVAILABLE", reason: "UNSUPPORTED_SCHEMA", diagnostics };
  }
  if (!catalogResult.success) {
    const rawVersion = input.catalog && typeof input.catalog === "object" ? (input.catalog as { catalog_schema_version?: unknown }).catalog_schema_version : undefined;
    if (rawVersion !== "0.1") return { status: "UNAVAILABLE", reason: "UNSUPPORTED_SCHEMA", diagnostics: [{ code: "UNSUPPORTED_CATALOG_SCHEMA" }] };
    const issues = catalogResult.error.issues;
    const code = issues.some((issue) => issue.path.includes("provenance")) ? "DECISION_FACT_PROVENANCE_INVALID"
      : issues.some((issue) => issue.path.includes("value")) ? "DECISION_FACT_VALUE_INVALID"
        : issues.some((issue) => issue.code === "invalid_type" && issue.path.some((part) => ["bodyStyle", "modelYear", "powertrain"].includes(String(part)))) ? "REQUIRED_DECISION_FACT_MISSING"
          : "DECISION_FACT_SCHEMA_INVALID";
    return { status: "UNAVAILABLE", reason: "INTEGRITY_FAILURE", diagnostics: [{ code }] };
  }
  const manifest = manifestResult.data;
  const catalog = catalogResult.data;
  const pointerResult = input.pointer === undefined ? undefined : activePointerSchema.safeParse(input.pointer);
  if (pointerResult && !pointerResult.success) return { status: "UNAVAILABLE", reason: "ACTIVE_POINTER_INVALID", diagnostics: [{ code: "ACTIVE_POINTER_INVALID" }] };
  const pointer = pointerResult?.data;
  if (pointer && pointer.active_catalog_release_version !== manifest.catalog_release_version) diagnostics.push({ code: "POINTER_MANIFEST_VERSION_MISMATCH" });
  if (pointer && pointer.catalog_payload_hash !== manifest.catalog_payload_hash) diagnostics.push({ code: "POINTER_MANIFEST_HASH_MISMATCH" });
  if (input.pinned && input.pinned.releaseVersion !== manifest.catalog_release_version) diagnostics.push({ code: "PINNED_RELEASE_NOT_FOUND", reference: input.pinned.releaseVersion });
  if (input.pinned && input.pinned.catalogFingerprint !== manifest.catalog_payload_hash) diagnostics.push({ code: "PINNED_FINGERPRINT_MISMATCH" });
  const calculatedHash = catalogPayloadHash(serializeCanonical(catalog));
  if (calculatedHash !== manifest.catalog_payload_hash) diagnostics.push({ code: "CATALOG_PAYLOAD_HASH_MISMATCH" });
  const ids = catalog.records.map((record) => record.variant.id);
  if (new Set(ids).size !== ids.length) diagnostics.push({ code: "DUPLICATE_VARIANT_ID" });
  if (JSON.stringify([...ids].sort()) !== JSON.stringify([...manifest.included_variant_ids].sort())) diagnostics.push({ code: "INCLUDED_VARIANT_IDS_MISMATCH" });
  if (manifest.record_count !== catalog.records.length || manifest.publishable_record_count !== catalog.records.length || catalog.effective_as_of !== manifest.effective_as_of) diagnostics.push({ code: "INCLUDED_VARIANT_IDS_MISMATCH" });
  if (catalog.market !== "TR" || manifest.market !== "TR" || catalog.records.some((record) => record.variant.market !== "TR")) diagnostics.push({ code: "MARKET_MISMATCH" });
  if (catalog.records.some((record) => record.activeNewPrice && record.activeNewPrice.vehicleVariantId !== record.variant.id)) diagnostics.push({ code: "DECISION_FACT_SCHEMA_INVALID", reference: "price-variant-link" });
  if (manifest.approval.state !== "APPROVED" || manifest.validator_status !== "PASS") diagnostics.push({ code: "RELEASE_NOT_APPROVED" });
  if (pointer && input.enforceTemporalInvariant && validateCatalogTemporalInvariant({ stagingAt: manifest.staging.at, approvalAt: manifest.approval.at, effectiveAt: manifest.effective_as_of, activatedAt: pointer.activated_at, evaluationAt: input.now.toISOString() }).length) diagnostics.push({ code: "TEMPORAL_INVARIANT_VIOLATION" });
  if (diagnostics.length > 0) return { status: "UNAVAILABLE", reason: "INTEGRITY_FAILURE", diagnostics: Object.freeze(diagnostics) };
  const temporalStatus = evaluateCatalogTemporalStatus(manifest.effective_as_of, input.now);
  if (temporalStatus === "NOT_YET_EFFECTIVE") return { status: "UNAVAILABLE", reason: "NOT_YET_EFFECTIVE", diagnostics: [{ code: "NOT_YET_EFFECTIVE", reference: manifest.effective_as_of }] };
  if (temporalStatus !== "EFFECTIVE") return { status: "UNAVAILABLE", reason: "INTEGRITY_FAILURE", diagnostics: [{ code: "UNSUPPORTED_CATALOG_SCHEMA" }] };
  const facetsResult = decisionFacetsSchema.safeParse(input.decisionFacets);
  if (!facetsResult.success) return { status: "UNAVAILABLE", reason: "INTEGRITY_FAILURE", diagnostics: [{ code: "DECISION_FACETS_INCOMPATIBLE" }] };
  const projectProvenance = (items: readonly {
    sourceId: string; sourceUrl: string; accessedAt: string; publishedAt?: string; documentVersion?: string;
    contentHash?: string; extractionMethod: CatalogFactProvenance["extractionMethod"];
    confidence: CatalogFactProvenance["confidence"]; limitations: readonly string[];
  }[]): readonly CatalogFactProvenance[] => items.map((item) => deepFreeze({ ...item, limitations: [...item.limitations] }));
  const fact = <T>(source: { readonly value: T; readonly confidence: CatalogFact<T>["confidence"]; readonly provenance: Parameters<typeof projectProvenance>[0] }): CatalogFact<T> => deepFreeze({
    value: source.value, confidence: source.confidence, provenance: projectProvenance(source.provenance),
    catalogFingerprint: manifest.catalog_payload_hash, explanationAccess: "AUTHORITY_REQUIRED",
  });
  const variants = catalog.records.map((record): CatalogVariantSnapshot => deepFreeze({
    id: record.variant.id, market: record.variant.market, lifecycleStatus: record.variant.lifecycleStatus,
    brand: record.variant.brand.value, model: record.variant.model.value, trim: record.variant.trim.value,
    identityProvenance: record.variant.brand.provenance.map(({ sourceId, sourceUrl, accessedAt }) => ({ sourceId, sourceUrl, accessedAt })),
    decisionFacts: {
      vehicleUseClass: record.variant.vehicleUseClass ? fact(record.variant.vehicleUseClass) : undefined,
      bodyStyle: fact(record.variant.bodyStyle), modelYear: fact(record.variant.modelYear),
      powertrain: {
        fuelType: fact(record.variant.powertrain.fuelType), powerKw: fact(record.variant.powertrain.powerKw), transmission: fact(record.variant.powertrain.transmission),
        drivenWheels: record.variant.powertrain.drivenWheels ? fact(record.variant.powertrain.drivenWheels) : undefined,
        engineDisplacementCc: record.variant.powertrain.engineDisplacementCc ? fact(record.variant.powertrain.engineDisplacementCc) : undefined,
        torqueNm: record.variant.powertrain.torqueNm ? fact(record.variant.powertrain.torqueNm) : undefined,
      },
      dimensions: {
        seats: record.variant.dimensions.seats ? fact(record.variant.dimensions.seats) : undefined,
        luggageLitres: record.variant.dimensions.luggageLitres ? fact(record.variant.dimensions.luggageLitres) : undefined,
        cargoVolumeLitres: record.variant.dimensions.cargoVolumeLitres ? fact(record.variant.dimensions.cargoVolumeLitres) : undefined,
        payloadKg: record.variant.dimensions.payloadKg ? fact(record.variant.dimensions.payloadKg) : undefined,
        brakedTowingKg: record.variant.dimensions.brakedTowingKg ? fact(record.variant.dimensions.brakedTowingKg) : undefined,
        lengthMm: record.variant.dimensions.lengthMm ? fact(record.variant.dimensions.lengthMm) : undefined,
        widthMm: record.variant.dimensions.widthMm ? fact(record.variant.dimensions.widthMm) : undefined,
        heightMm: record.variant.dimensions.heightMm ? fact(record.variant.dimensions.heightMm) : undefined,
        wheelbaseMm: record.variant.dimensions.wheelbaseMm ? fact(record.variant.dimensions.wheelbaseMm) : undefined,
      },
      efficiency: {
        protocol: record.variant.efficiency.protocol ? fact(record.variant.efficiency.protocol) : undefined,
        combinedLitresPer100Km: record.variant.efficiency.combinedLitresPer100Km ? fact(record.variant.efficiency.combinedLitresPer100Km) : undefined,
        combinedKwhPer100Km: record.variant.efficiency.combinedKwhPer100Km ? fact(record.variant.efficiency.combinedKwhPer100Km) : undefined,
        electricRangeKm: record.variant.efficiency.electricRangeKm ? fact(record.variant.efficiency.electricRangeKm) : undefined,
        batteryCapacityKwh: record.variant.efficiency.batteryCapacityKwh ? fact(record.variant.efficiency.batteryCapacityKwh) : undefined,
        batteryUsableKwh: record.variant.efficiency.batteryUsableKwh ? fact(record.variant.efficiency.batteryUsableKwh) : undefined,
        maxDcChargeKw: record.variant.efficiency.maxDcChargeKw ? fact(record.variant.efficiency.maxDcChargeKw) : undefined,
      },
      safetyFeatureCodes: record.variant.safetyFeatureCodes.map(fact),
    },
    activeNewPrice: record.activeNewPrice ? deepFreeze<CatalogPriceObservationFact>({
      id: record.activeNewPrice.id, vehicleVariantId: record.activeNewPrice.vehicleVariantId, market: record.activeNewPrice.market,
      condition: record.activeNewPrice.condition, amountTry: record.activeNewPrice.amountTry, priceType: record.activeNewPrice.priceType,
      consumerVisibility: record.activeNewPrice.consumerVisibility ?? (record.activeNewPrice.priceType === "ESTIMATE" ? "INTERNAL_ONLY" : "PUBLIC"),
      realizationSafe: record.activeNewPrice.priceType !== "ESTIMATE" && record.activeNewPrice.consumerVisibility !== "INTERNAL_ONLY",
      estimationMethod: record.activeNewPrice.estimationMethod, validFrom: record.activeNewPrice.validFrom, validUntil: record.activeNewPrice.validUntil,
      sellerType: record.activeNewPrice.sellerType, confidence: record.activeNewPrice.confidence,
      provenance: projectProvenance(record.activeNewPrice.provenance), catalogFingerprint: manifest.catalog_payload_hash,
    }) : undefined,
  })).sort((left, right) => left.id.localeCompare(right.id, "en"));
  const indexes = buildModelFamilyIndexes(variants);
  if (indexes.diagnostics.some((diagnostic) => diagnostic.code === "FAMILY_ID_COLLISION" || diagnostic.code === "NORMALIZATION_COLLISION")) {
    return { status: "UNAVAILABLE", reason: "INTEGRITY_FAILURE", diagnostics: indexes.diagnostics };
  }
  const authority: CatalogAuthoritySnapshot = deepFreeze({
    market: "TR", releaseVersion: manifest.catalog_release_version, catalogFingerprint: manifest.catalog_payload_hash,
    manifestFingerprint: catalogPayloadHash(serializeCanonical(manifest)), activatedAt: pointer?.activated_at ?? input.pinned?.activatedAt ?? manifest.effective_as_of,
  });
  const snapshot: CatalogSnapshot = Object.freeze({
    authority, temporalStatus: "EFFECTIVE", variants: Object.freeze(variants),
    variantById: createImmutableIndex(variants.map((variant) => [variant.id, variant] as const)),
    familyIndex: indexes.familyIndex, brandIndex: indexes.brandIndex,
    decisionFacets: deepFreeze({ version: facetsResult.data.version, catalogReleaseVersion: manifest.catalog_release_version, catalogPayloadHash: manifest.catalog_payload_hash, facets: facetsResult.data.facets }),
    diagnostics: indexes.diagnostics,
  });
  return { status: "READY", snapshot };
}

export async function loadActiveCatalogSnapshot(input: { readonly repository: CatalogReleaseRepository; readonly now: Date }): Promise<CatalogSnapshotLoadResult> {
  let pointer: unknown;
  try { pointer = await input.repository.loadActivePointer(); } catch { return { status: "UNAVAILABLE", reason: "ACTIVE_POINTER_INVALID", diagnostics: [{ code: "ACTIVE_POINTER_INVALID" }] }; }
  const parsed = activePointerSchema.safeParse(pointer);
  if (!parsed.success) return { status: "UNAVAILABLE", reason: "ACTIVE_POINTER_INVALID", diagnostics: [{ code: "ACTIVE_POINTER_INVALID" }] };
  const version = parsed.data.active_catalog_release_version;
  try {
    if (!await input.repository.releaseExists(version)) return { status: "UNAVAILABLE", reason: "RELEASE_NOT_FOUND", diagnostics: [{ code: "PINNED_RELEASE_NOT_FOUND", reference: version }] };
    return buildCatalogSnapshot({ pointer, manifest: await input.repository.loadReleaseManifest(version), catalog: await input.repository.loadReleaseCatalog(version), decisionFacets: await input.repository.loadDecisionFacets(version), now: input.now, enforceTemporalInvariant: true });
  } catch { return { status: "UNAVAILABLE", reason: "CATALOG_SNAPSHOT_UNAVAILABLE", diagnostics: [] }; }
}

export async function loadPinnedCatalogSnapshot(input: {
  readonly repository: CatalogReleaseRepository; readonly releaseVersion: string; readonly catalogFingerprint: string; readonly activatedAt?: string; readonly now: Date;
}): Promise<CatalogSnapshotLoadResult> {
  try { assertSafeCatalogReleaseVersion(input.releaseVersion); } catch { return { status: "UNAVAILABLE", reason: "CATALOG_SNAPSHOT_UNAVAILABLE", diagnostics: [{ code: "PINNED_RELEASE_NOT_FOUND" }] }; }
  if (!await input.repository.releaseExists(input.releaseVersion)) return { status: "UNAVAILABLE", reason: "CATALOG_SNAPSHOT_UNAVAILABLE", diagnostics: [{ code: "PINNED_RELEASE_NOT_FOUND", reference: input.releaseVersion }] };
  try {
    return buildCatalogSnapshot({ manifest: await input.repository.loadReleaseManifest(input.releaseVersion), catalog: await input.repository.loadReleaseCatalog(input.releaseVersion), decisionFacets: await input.repository.loadDecisionFacets(input.releaseVersion), now: input.now, pinned: input, enforceTemporalInvariant: true });
  } catch { return { status: "UNAVAILABLE", reason: "CATALOG_SNAPSHOT_UNAVAILABLE", diagnostics: [] }; }
}
