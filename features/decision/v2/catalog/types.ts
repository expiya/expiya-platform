import type { CatalogAuthoritySnapshot } from "../domain/conversationMemory";

export type CatalogTemporalStatus = "EFFECTIVE" | "NOT_YET_EFFECTIVE" | "EXPIRED" | "TEMPORAL_METADATA_INVALID";
export type CatalogDiagnosticCode =
  | "ACTIVE_POINTER_INVALID" | "POINTER_MANIFEST_VERSION_MISMATCH" | "POINTER_MANIFEST_HASH_MISMATCH"
  | "CATALOG_PAYLOAD_HASH_MISMATCH" | "INCLUDED_VARIANT_IDS_MISMATCH" | "DUPLICATE_VARIANT_ID"
  | "MARKET_MISMATCH" | "UNSUPPORTED_CATALOG_SCHEMA" | "RELEASE_NOT_APPROVED" | "NOT_YET_EFFECTIVE" | "TEMPORAL_INVARIANT_VIOLATION"
  | "NORMALIZATION_COLLISION" | "FAMILY_ID_COLLISION" | "ALIAS_COLLISION" | "DECISION_FACETS_INCOMPATIBLE"
  | "PINNED_RELEASE_NOT_FOUND" | "PINNED_FINGERPRINT_MISMATCH" | "DECISION_FACT_SCHEMA_INVALID"
  | "DECISION_FACT_PROVENANCE_INVALID" | "DECISION_FACT_VALUE_INVALID" | "REQUIRED_DECISION_FACT_MISSING";

export interface CatalogDiagnostic { readonly code: CatalogDiagnosticCode; readonly reference?: string }
export type FactAvailability = "AVAILABLE" | "MISSING" | "UNSUPPORTED";
export interface CatalogFactProvenance {
  readonly sourceId: string; readonly sourceUrl: string; readonly accessedAt: string;
  readonly publishedAt?: string; readonly documentVersion?: string; readonly contentHash?: string;
  readonly extractionMethod: "MANUAL" | "API" | "LICENSED_FEED" | "DOCUMENT_IMPORT" | "USER_SUBMISSION";
  readonly confidence: "LOW" | "MEDIUM" | "HIGH"; readonly limitations: readonly string[];
}
export interface CatalogFact<T> {
  readonly value: T; readonly confidence: "LOW" | "MEDIUM" | "HIGH";
  readonly provenance: readonly CatalogFactProvenance[]; readonly catalogFingerprint: string;
  readonly explanationAccess: "AUTHORITY_REQUIRED";
}
export interface CatalogVariantDecisionFacts {
  readonly vehicleUseClass?: CatalogFact<"PASSENGER" | "LIGHT_COMMERCIAL" | "HEAVY_COMMERCIAL">;
  readonly bodyStyle: CatalogFact<string>; readonly modelYear: CatalogFact<number>;
  readonly powertrain: {
    readonly fuelType: CatalogFact<"GASOLINE" | "DIESEL" | "LPG" | "MHEV" | "HEV" | "PHEV" | "BEV" | "HYDROGEN">;
    readonly powerKw: CatalogFact<number>; readonly transmission: CatalogFact<string>;
    readonly drivenWheels?: CatalogFact<string>; readonly engineDisplacementCc?: CatalogFact<number>; readonly torqueNm?: CatalogFact<number>;
  };
  readonly dimensions: {
    readonly seats?: CatalogFact<number>; readonly luggageLitres?: CatalogFact<number>; readonly cargoVolumeLitres?: CatalogFact<number>;
    readonly payloadKg?: CatalogFact<number>; readonly brakedTowingKg?: CatalogFact<number>; readonly lengthMm?: CatalogFact<number>;
    readonly widthMm?: CatalogFact<number>; readonly heightMm?: CatalogFact<number>; readonly wheelbaseMm?: CatalogFact<number>;
  };
  readonly efficiency: {
    readonly protocol?: CatalogFact<"WLTP" | "NEDC" | "EPA" | "USER_REPORTED">;
    readonly combinedLitresPer100Km?: CatalogFact<number>; readonly combinedKwhPer100Km?: CatalogFact<number>;
    readonly electricRangeKm?: CatalogFact<number>; readonly batteryCapacityKwh?: CatalogFact<number>;
    readonly batteryUsableKwh?: CatalogFact<number>; readonly maxDcChargeKw?: CatalogFact<number>;
  };
  readonly safetyFeatureCodes: readonly CatalogFact<string>[];
}
export interface CatalogPriceObservationFact {
  readonly id: string; readonly vehicleVariantId: string; readonly market: "TR"; readonly condition: "NEW" | "USED";
  readonly amountTry: number; readonly priceType: "LIST" | "CAMPAIGN" | "ASKING" | "TRANSACTION" | "VALUATION" | "ESTIMATE";
  readonly consumerVisibility: "PUBLIC" | "INTERNAL_ONLY"; readonly realizationSafe: boolean;
  readonly estimationMethod?: string; readonly validFrom: string; readonly validUntil?: string;
  readonly sellerType?: "DISTRIBUTOR" | "DEALER" | "BUSINESS" | "PRIVATE";
  readonly taxTreatment: "INCLUDED" | "EXCLUDED" | "UNKNOWN";
  readonly confidence: "LOW" | "MEDIUM" | "HIGH"; readonly provenance: readonly CatalogFactProvenance[];
  readonly catalogFingerprint: string;
}
export type AliasProvenance = "CANONICAL_BRAND" | "CANONICAL_MODEL" | "CANONICAL_BRAND_MODEL" | "NORMALIZATION_VARIANT" | "VERSIONED_OVERRIDE";
export interface ModelAlias { readonly value: string; readonly normalizedValue: string; readonly provenance: AliasProvenance }

export interface CatalogVariantSnapshot {
  readonly id: string;
  readonly market: "TR";
  readonly lifecycleStatus: "ANNOUNCED" | "ON_SALE" | "ORDER_CLOSED" | "DISCONTINUED";
  readonly brand: string;
  readonly model: string;
  readonly trim: string;
  readonly identityProvenance: readonly { readonly sourceId: string; readonly sourceUrl: string; readonly accessedAt: string }[];
  readonly decisionFacts: CatalogVariantDecisionFacts;
  readonly activeNewPrice?: CatalogPriceObservationFact;
}

export interface ModelFamilyIndexEntry {
  readonly familyId: string; readonly canonicalBrand: string; readonly canonicalModel: string;
  readonly normalizedBrand: string; readonly normalizedModel: string;
  readonly variantIds: readonly string[]; readonly aliases: readonly ModelAlias[];
}
export interface BrandIndexEntry { readonly canonicalBrand: string; readonly normalizedBrand: string; readonly familyIds: readonly string[] }

export interface ImmutableIndex<K, V> {
  readonly size: number;
  get(key: K): V | undefined;
  has(key: K): boolean;
  values(): readonly V[];
  entries(): readonly (readonly [K, V])[];
}
export type ModelFamilyIndex = ImmutableIndex<string, ModelFamilyIndexEntry>;
export type BrandIndex = ImmutableIndex<string, BrandIndexEntry>;
export interface DecisionFacetSnapshot { readonly version: number; readonly catalogReleaseVersion: string; readonly catalogPayloadHash: string; readonly facets: readonly unknown[] }

export interface CatalogSnapshot {
  readonly authority: CatalogAuthoritySnapshot;
  readonly temporalStatus: "EFFECTIVE";
  readonly variants: readonly CatalogVariantSnapshot[];
  readonly variantById: ImmutableIndex<string, CatalogVariantSnapshot>;
  readonly familyIndex: ModelFamilyIndex;
  readonly brandIndex: BrandIndex;
  readonly decisionFacets: DecisionFacetSnapshot;
  readonly diagnostics: readonly CatalogDiagnostic[];
}

export type CatalogSnapshotUnavailableReason = "ACTIVE_POINTER_INVALID" | "RELEASE_NOT_FOUND" | "INTEGRITY_FAILURE" | "NOT_YET_EFFECTIVE" | "UNSUPPORTED_SCHEMA" | "CATALOG_SNAPSHOT_UNAVAILABLE";
export type CatalogSnapshotLoadResult =
  | { readonly status: "READY"; readonly snapshot: CatalogSnapshot }
  | { readonly status: "UNAVAILABLE"; readonly reason: CatalogSnapshotUnavailableReason; readonly diagnostics: readonly CatalogDiagnostic[] };
