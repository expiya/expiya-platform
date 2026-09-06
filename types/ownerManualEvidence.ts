import { EQUIPMENT_FEATURE_CODES, type EquipmentConfidence, type EquipmentFeatureCode } from "./equipmentEvidence";

export const OWNER_MANUAL_SCHEMA_VERSION = "4.0.0" as const;
export const OWNER_MANUAL_ADDITIONAL_FEATURE_CODES = [
  "REAR_DOOR_OPENING_180", "REAR_DOOR_OPENING_270", "POWER_SLIDING_SIDE_DOOR", "MANUAL_SLIDING_SIDE_DOOR",
  "POWER_TAILGATE",
  "ROOF_RAILS", "ROOF_RACK_COMPATIBILITY", "ROOF_LOAD_LIMIT", "CARGO_NET", "CARGO_NET_COMPATIBILITY", "CARGO_TIE_DOWN_POINTS", "INTEGRATED_REAR_DOOR_SUNSHADES",
  "FLAT_LOAD_FLOOR", "SPLIT_FOLDING_REAR_SEATS", "REMOVABLE_REAR_SEATS", "CARGO_PARTITION", "LOAD_SILL_HEIGHT",
  "TOWING_CAPACITY", "VERTICAL_TOWBALL_LOAD", "PAYLOAD_LIMIT", "CARGO_VOLUME", "FUEL_TANK_CAPACITY",
  "DEF_TANK_CAPACITY", "ENGINE_OIL_CAPACITY", "TYRE_PRESSURE", "WHEEL_TYRE_SIZE", "SERVICE_INTERVAL",
  "AC_CHARGING_SUPPORTED", "DC_CHARGING_SUPPORTED", "AC_CHARGING_POWER", "DC_CHARGING_POWER", "BATTERY_USABLE_CAPACITY", "BATTERY_CHARGING_LONGEVITY_GUIDANCE", "VEHICLE_TO_LOAD", "DRIVE_MODES",
  "HILL_START_ASSIST", "TRAILER_STABILITY_ASSIST", "ELECTRONIC_STABILITY_CONTROL", "TYRE_PRESSURE_MONITOR",
  "SPEED_LIMITER",
  "AUTOMATIC_CLIMATE_CONTROL", "REAR_CLIMATE_CONTROL", "INTERIOR_LIGHTING", "AMBIENT_LIGHTING", "USB_PORTS", "BLUETOOTH",
] as const;
export const OWNER_MANUAL_FEATURE_CODES = [...EQUIPMENT_FEATURE_CODES, ...OWNER_MANUAL_ADDITIONAL_FEATURE_CODES] as const;
export type OwnerManualFeatureCode = EquipmentFeatureCode | typeof OWNER_MANUAL_ADDITIONAL_FEATURE_CODES[number];
export type OwnerManualSourceType = "OFFICIAL_OWNER_MANUAL" | "OFFICIAL_INFOTAINMENT_MANUAL" | "OFFICIAL_QUICK_REFERENCE_GUIDE" | "OFFICIAL_VIN_DOCUMENT" | "OFFICIAL_SERVICE_SCHEDULE" | "OFFICIAL_EQUIPMENT_MATRIX" | "OFFICIAL_TECHNICAL_SPECIFICATION";
export type OwnerManualAuthorityLevel = "MODEL_FAMILY_CAPABILITY" | "MODEL_YEAR_TRIM_APPLICABILITY" | "EXACT_VARIANT_VERIFIED" | "RESEARCHED_INCONCLUSIVE";
export type OwnerManualDiscoveryStatus = "NOT_RESEARCHED" | "DISCOVERED_PUBLIC" | "ACCESS_REVIEW_REQUIRED" | "RESEARCHED_INCONCLUSIVE" | "EXTRACTED";

export interface OwnerManualApplicability {
  readonly market: string;
  readonly language: string;
  readonly modelFamily: string;
  readonly generation?: string;
  readonly modelYearFrom?: number;
  readonly modelYearTo?: number;
  readonly bodyConfigurations: readonly string[];
  readonly powertrains: readonly string[];
  readonly trims: readonly string[];
  readonly vinSpecific: boolean;
  readonly conditionalEquipment: boolean;
  readonly publishedAt?: string;
  readonly effectiveFrom?: string;
  readonly effectiveTo?: string;
  readonly observedAt: string;
}

export interface OwnerManualArtifactProvenance {
  readonly rawArtifactReference: string;
  readonly rawSha256: `sha256:${string}`;
  readonly derivedArtifactReference?: string;
  readonly derivedSha256?: `sha256:${string}`;
  readonly physicalPdfPage?: number;
  readonly sectionHeading: string;
  readonly table?: string;
  readonly row?: string;
  readonly column?: string;
  readonly extractionPolicyId: "OWNER_MANUAL_EXTRACTION_V4";
  readonly extractionPolicyVersion: "4.0.0";
  readonly modelAssistance?: { readonly provider: "OPENAI"; readonly model: string; readonly runId: string };
  readonly reviewerDecision: "PENDING" | "ACCEPTED" | "REJECTED" | "INCONCLUSIVE";
}

export interface OwnerManualAssertion {
  readonly assertionId: string;
  readonly sourceId: string;
  readonly exactVariantId?: string;
  readonly featureCode: OwnerManualFeatureCode;
  readonly normalizedValue: boolean | number | string;
  readonly unit?: string;
  readonly authorityLevel: OwnerManualAuthorityLevel;
  readonly applicability: OwnerManualApplicability;
  readonly polarity: "POSITIVE" | "NEGATIVE" | "UNRESOLVED";
  readonly confidence: EquipmentConfidence;
  readonly provenance: OwnerManualArtifactProvenance;
}

export interface OwnerManualSourceRegistryEntry {
  readonly sourceId: string;
  readonly sourceType: OwnerManualSourceType;
  readonly brand: string;
  readonly portalUrl: string;
  readonly accessMethod: "PUBLIC_PDF" | "PUBLIC_HTML" | "PUBLIC_SELECTOR" | "VIN_REQUIRED" | "AUTHENTICATION_REQUIRED";
  readonly publicAccess: boolean;
  readonly format: readonly ("PDF" | "HTML")[];
  readonly modelYearSelectable: boolean;
  readonly marketSelectable: boolean;
  readonly bulkAccessSafety: "SAFE_BOUNDED" | "MANUAL_ONLY" | "ACCESS_REVIEW_REQUIRED";
  readonly exactVariantAuthorityCapacity: "NONE" | "VIN_ONLY" | "EXPLICIT_TRIM_LINK_REQUIRED";
  readonly status: OwnerManualDiscoveryStatus;
  readonly applicability: OwnerManualApplicability;
  readonly notes: readonly string[];
}
