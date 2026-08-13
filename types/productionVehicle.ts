export type DataConfidence = "LOW" | "MEDIUM" | "HIGH";
export type SourceAuthority = "PRIMARY" | "OFFICIAL" | "LICENSED" | "COMMUNITY";
export type UsagePermission =
  | "OPEN_LICENSE"
  | "PUBLIC_FACTS_ONLY"
  | "CONTRACT_REQUIRED"
  | "PERMISSION_REQUIRED"
  | "INTERNAL_ONLY"
  | "PROHIBITED";

export interface DataSource {
  readonly id: string;
  readonly name: string;
  readonly authority: SourceAuthority;
  readonly homepageUrl: string;
  readonly termsUrl?: string;
  readonly robotsUrl?: string;
  readonly usagePermission: UsagePermission;
  readonly license?: string;
  readonly reviewedAt: string;
  readonly reviewNotes: readonly string[];
}

export interface ProvenanceRecord {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly accessedAt: string;
  readonly publishedAt?: string;
  readonly documentVersion?: string;
  readonly contentHash?: string;
  readonly extractionMethod: "MANUAL" | "API" | "LICENSED_FEED" | "DOCUMENT_IMPORT" | "USER_SUBMISSION";
  readonly confidence: DataConfidence;
  readonly limitations: readonly string[];
}

export interface SourcedValue<T> {
  readonly value: T;
  readonly provenance: readonly [ProvenanceRecord, ...ProvenanceRecord[]];
  readonly confidence: DataConfidence;
  readonly conflictGroupId?: string;
}

export type ProductionFuelType =
  | "GASOLINE" | "DIESEL" | "LPG" | "MHEV" | "HEV" | "PHEV" | "BEV" | "HYDROGEN";

export interface TurkeyVehicleVariant {
  readonly id: string;
  readonly market: "TR";
  readonly lifecycleStatus: "ANNOUNCED" | "ON_SALE" | "ORDER_CLOSED" | "DISCONTINUED";
  readonly brand: SourcedValue<string>;
  readonly model: SourcedValue<string>;
  readonly generation?: SourcedValue<string>;
  readonly bodyStyle: SourcedValue<string>;
  readonly trim: SourcedValue<string>;
  readonly modelYear: SourcedValue<number>;
  readonly onSaleFrom?: SourcedValue<string>;
  readonly onSaleUntil?: SourcedValue<string>;
  readonly powertrain: {
    readonly fuelType: SourcedValue<ProductionFuelType>;
    readonly engineDisplacementCc?: SourcedValue<number>;
    readonly powerKw: SourcedValue<number>;
    readonly torqueNm?: SourcedValue<number>;
    readonly transmission: SourcedValue<string>;
    readonly drivenWheels?: SourcedValue<string>;
  };
  readonly dimensions: {
    readonly lengthMm?: SourcedValue<number>;
    readonly widthMm?: SourcedValue<number>;
    readonly heightMm?: SourcedValue<number>;
    readonly wheelbaseMm?: SourcedValue<number>;
    readonly seats?: SourcedValue<number>;
    readonly luggageLitres?: SourcedValue<number>;
    readonly payloadKg?: SourcedValue<number>;
    readonly brakedTowingKg?: SourcedValue<number>;
  };
  readonly efficiency: {
    readonly protocol?: SourcedValue<"WLTP" | "NEDC" | "EPA" | "USER_REPORTED">;
    readonly combinedLitresPer100Km?: SourcedValue<number>;
    readonly combinedKwhPer100Km?: SourcedValue<number>;
    readonly electricRangeKm?: SourcedValue<number>;
    readonly batteryCapacityKwh?: SourcedValue<number>;
    readonly batteryUsableKwh?: SourcedValue<number>;
    readonly maxDcChargeKw?: SourcedValue<number>;
  };
  readonly safetyFeatureCodes: readonly SourcedValue<string>[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PriceObservation {
  readonly id: string;
  readonly vehicleVariantId: string;
  readonly market: "TR";
  readonly condition: "NEW" | "USED";
  readonly amountTry: number;
  readonly priceType: "LIST" | "CAMPAIGN" | "ASKING" | "TRANSACTION" | "VALUATION";
  readonly validFrom: string;
  readonly validUntil?: string;
  readonly mileageKm?: number;
  readonly sellerType?: "DISTRIBUTOR" | "DEALER" | "BUSINESS" | "PRIVATE";
  readonly provenance: readonly [ProvenanceRecord, ...ProvenanceRecord[]];
  readonly confidence: DataConfidence;
}

export interface UserExperienceSignal {
  readonly id: string;
  readonly vehicleVariantId?: string;
  readonly modelScopeId: string;
  readonly market: string;
  readonly sentiment: "POSITIVE" | "NEGATIVE" | "UNCERTAIN";
  readonly themeCode: string;
  readonly summary: string;
  readonly ownershipVerified: boolean;
  readonly sampleSize: number;
  readonly exposureDenominator?: number;
  readonly observedAt: string;
  readonly provenance: ProvenanceRecord;
  readonly confidence: DataConfidence;
  readonly moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  readonly containsPersonalData: boolean;
}
