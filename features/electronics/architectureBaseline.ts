export const ELECTRONICS_ARCHITECTURE_BASELINE_VERSION = "electronics-product-architecture-baseline/v1" as const;

export const ELECTRONICS_CATEGORY_IDS = [
  "SMARTPHONE", "LAPTOP", "TABLET", "MONITOR", "TELEVISION", "E_READER",
  "HEADPHONES", "PORTABLE_SPEAKER", "SOUNDBAR", "DIGITAL_CAMERA", "PROJECTOR", "GAME_CONSOLE",
  "WIFI_ROUTER_MESH", "NETWORK_ATTACHED_STORAGE", "EXTERNAL_STORAGE", "PRINTER", "WEBCAM", "COMPUTER_AUDIO",
  "SMARTWATCH", "FITNESS_TRACKER", "HOME_SECURITY_CAMERA", "VIDEO_DOORBELL", "SMART_HOME_HUB", "UNINTERRUPTIBLE_POWER_SUPPLY",
] as const;

export type ElectronicsCategoryId = typeof ELECTRONICS_CATEGORY_IDS[number];
export type ElectronicsWave = 1 | 2 | 3 | 4;
export type ElectronicsReadiness = "TAXONOMY_READY" | "CATEGORY_POLICY_REQUIRED" | "DEFERRED";

export interface ElectronicsCategoryRegistration {
  readonly categoryId: ElectronicsCategoryId;
  readonly publicLabelTr: string;
  readonly wave: ElectronicsWave;
  readonly readiness: ElectronicsReadiness;
  readonly identityDiscriminators: readonly string[];
  readonly categoryPolicyRequired: readonly string[];
  readonly parallelResearch: readonly string[];
}

const category = (
  categoryId: ElectronicsCategoryId,
  publicLabelTr: string,
  wave: ElectronicsWave,
  identityDiscriminators: readonly string[],
  categoryPolicyRequired: readonly string[],
  parallelResearch: readonly string[] = ["AMAZON_TR_DISCOVERY", "TR_MARKET_APPLICABILITY", "OFFICIAL_TECHNICAL_EVIDENCE"],
): ElectronicsCategoryRegistration => Object.freeze({ categoryId, publicLabelTr, wave, readiness: "CATEGORY_POLICY_REQUIRED", identityDiscriminators, categoryPolicyRequired, parallelResearch });

export const ELECTRONICS_CATEGORY_REGISTRY: readonly ElectronicsCategoryRegistration[] = Object.freeze([
  category("SMARTPHONE", "Akıllı telefon", 1, ["manufacturer", "commercialModel", "manufacturerModelCode", "storage", "memory", "color", "regionalVariant"], ["OS_SUPPORT", "CELLULAR_BANDS", "CAMERA", "BATTERY"]),
  category("LAPTOP", "Dizüstü bilgisayar", 1, ["manufacturer", "series", "manufacturerPartNumber", "cpu", "gpu", "memory", "storage", "display", "os"], ["WORKLOAD", "PORTABILITY", "DISPLAY", "UPGRADEABILITY"]),
  category("TABLET", "Tablet", 1, ["manufacturer", "commercialModel", "manufacturerModelCode", "storage", "connectivity", "color", "regionalVariant"], ["OS_SUPPORT", "INPUT", "DISPLAY", "CELLULAR_BANDS"]),
  category("MONITOR", "Monitör", 1, ["manufacturer", "modelCode", "panelSize", "resolution", "refreshRate", "portConfiguration"], ["WORKLOAD", "MOTION", "COLOR", "ERGONOMICS"]),
  category("TELEVISION", "Televizyon", 1, ["manufacturer", "modelCode", "panelSize", "panelTechnology", "modelYear", "regionalVariant"], ["ROOM", "CONTENT", "PANEL", "PLATFORM_SUPPORT"]),
  category("E_READER", "E-kitap okuyucu", 1, ["manufacturer", "model", "generation", "storage", "connectivity", "bundleExclusion"], ["FORMAT_ECOSYSTEM", "DISPLAY", "WATER_RESISTANCE", "STORAGE"]),
  category("HEADPHONES", "Kulaklık", 2, ["manufacturer", "modelCode", "formFactor", "connectivity", "color", "bundleExclusion"], ["FIT", "NOISE_CONTROL", "MICROPHONE", "CODEC_COMPATIBILITY"]),
  category("PORTABLE_SPEAKER", "Taşınabilir hoparlör", 2, ["manufacturer", "modelCode", "sizeClass", "connectivity", "color"], ["OUTPUT_CONTEXT", "RUGGEDNESS", "BATTERY", "MULTI_SPEAKER"]),
  category("SOUNDBAR", "Soundbar", 2, ["manufacturer", "modelCode", "channelConfiguration", "includedSubwoofer", "rearSpeakerBundle"], ["ROOM", "TV_CONNECTIVITY", "SURROUND", "BUNDLE_TOPOLOGY"]),
  category("DIGITAL_CAMERA", "Dijital fotoğraf makinesi", 2, ["manufacturer", "modelCode", "mount", "bodyOrKit", "kitLens", "regionalVariant"], ["USE_CASE", "SENSOR", "AUTOFOCUS", "VIDEO", "LENS_ECOSYSTEM"]),
  category("PROJECTOR", "Projektör", 2, ["manufacturer", "modelCode", "nativeResolution", "lightSource", "regionalVariant"], ["THROW_GEOMETRY", "AMBIENT_LIGHT", "INPUT", "PLATFORM_SUPPORT"]),
  category("GAME_CONSOLE", "Oyun konsolu", 2, ["manufacturer", "platform", "hardwareRevision", "storage", "discCapability", "bundleExclusion"], ["GAME_ECOSYSTEM", "DISPLAY_COMPATIBILITY", "STORAGE", "SUBSCRIPTION_BOUNDARY"]),
  category("WIFI_ROUTER_MESH", "Wi-Fi router ve mesh sistemi", 3, ["manufacturer", "modelCode", "wifiGeneration", "unitCount", "regionalVariant"], ["DWELLING", "BACKHAUL", "CLIENT_LOAD", "ISP_COMPATIBILITY"]),
  category("NETWORK_ATTACHED_STORAGE", "Ağ depolama (NAS)", 3, ["manufacturer", "modelCode", "bayCount", "diskPopulation", "memoryConfiguration"], ["CAPACITY", "REDUNDANCY", "NETWORK", "DRIVE_COMPATIBILITY"]),
  category("EXTERNAL_STORAGE", "Harici depolama", 3, ["manufacturer", "modelCode", "mediaType", "capacity", "interface", "enclosureVariant"], ["WORKLOAD", "THROUGHPUT", "DURABILITY", "DEVICE_COMPATIBILITY"]),
  category("PRINTER", "Yazıcı", 3, ["manufacturer", "modelCode", "printTechnology", "colorCapability", "duplex", "region"], ["VOLUME", "MEDIA", "RUNNING_COST", "NETWORK", "CONSUMABLES"]),
  category("WEBCAM", "Web kamera", 3, ["manufacturer", "modelCode", "resolution", "frameRate", "fieldOfView", "bundleExclusion"], ["CALLING", "FRAMING", "LOW_LIGHT", "HOST_COMPATIBILITY"]),
  category("COMPUTER_AUDIO", "Masaüstü bilgisayar hoparlörü", 3, ["manufacturer", "modelCode", "channelConfiguration", "connectivity", "includedSubwoofer"], ["DESK_SPACE", "INPUT", "OUTPUT_CONTEXT", "POWER"]),
  category("SMARTWATCH", "Akıllı saat", 4, ["manufacturer", "model", "caseSize", "connectivity", "regionalVariant", "strapBundle"], ["PHONE_COMPATIBILITY", "HEALTH_LIMITATIONS", "BATTERY", "CELLULAR_SUPPORT"]),
  category("FITNESS_TRACKER", "Aktivite bilekliği", 4, ["manufacturer", "model", "size", "connectivity", "regionalVariant"], ["PHONE_COMPATIBILITY", "HEALTH_LIMITATIONS", "SENSORS", "BATTERY"]),
  category("HOME_SECURITY_CAMERA", "Ev güvenlik kamerası", 4, ["manufacturer", "modelCode", "indoorOutdoor", "powerMode", "unitCount", "regionalVariant"], ["PRIVACY", "STORAGE_SUBSCRIPTION", "INSTALLATION", "NETWORK"]),
  category("VIDEO_DOORBELL", "Görüntülü kapı zili", 4, ["manufacturer", "modelCode", "wiredBattery", "includedChime", "regionalVariant"], ["PRIVACY", "INSTALLATION", "STORAGE_SUBSCRIPTION", "DWELLING_COMPATIBILITY"]),
  category("SMART_HOME_HUB", "Akıllı ev merkezi", 4, ["manufacturer", "modelCode", "protocols", "regionalVariant", "bundleExclusion"], ["ECOSYSTEM", "PROTOCOL", "LOCAL_CLOUD", "PRIVACY"]),
  category("UNINTERRUPTIBLE_POWER_SUPPLY", "Kesintisiz güç kaynağı", 4, ["manufacturer", "modelCode", "topology", "vaRating", "wattRating", "outletVariant"], ["LOAD", "RUNTIME", "TOPOLOGY", "BATTERY_SERVICE", "ELECTRICAL_SAFETY"]),
]);

export const ELECTRONICS_ADMISSION_SEQUENCE = Object.freeze([
  "AMAZON_TR_EXACT_ACTIVE_VARIANT_DISCOVERY",
  "EXACT_IDENTITY_RESOLUTION",
  "TR_APPLICABILITY_VERIFICATION",
  "MINIMUM_EVIDENCE_GATE",
  "NON_AMAZON_TR_EXACT_PRODUCT_SECOND_PASS",
] as const);

export const ELECTRONICS_AUTHORITY_BOUNDARIES = Object.freeze({
  catalogMembership: "FROZEN_EXACT_PRODUCT_VARIANT_RELEASE",
  amazonRole: "PRIMARY_DISCOVERY_NOT_DECISION_AUTHORITY",
  internationalEvidenceRole: "TECHNICAL_GAP_FILL_ONLY_NOT_TR_APPLICABILITY",
  commerce: "L10_EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY",
  media: "EXISTING_GOVERNED_MEDIA_POLICY_EXACT_IDENTITY_JOIN_ONLY",
  manuals: "L9_ADVISOR_KNOWLEDGE_UNLESS_GOVERNED_PROMOTION",
  persona: "DERIVED_PLANNING_DECISION_USE_NONE",
  missingEvidence: "EXPLICIT_UNKNOWN_FAIL_CLOSED",
  activation: "FORBIDDEN_IN_BASELINE",
} as const);

export function validateElectronicsArchitectureBaseline(): readonly string[] {
  const issues: string[] = [];
  const ids = ELECTRONICS_CATEGORY_REGISTRY.map(item => item.categoryId);
  if (ids.length !== ELECTRONICS_CATEGORY_IDS.length || new Set(ids).size !== ids.length) issues.push("CATEGORY_REGISTRY_MISMATCH");
  if (ELECTRONICS_CATEGORY_IDS.some(id => !ids.includes(id))) issues.push("CATEGORY_MISSING");
  if (ELECTRONICS_CATEGORY_REGISTRY.some(item => item.readiness !== "CATEGORY_POLICY_REQUIRED" || item.identityDiscriminators.length < 3 || item.categoryPolicyRequired.length < 2)) issues.push("CATEGORY_POLICY_BOUNDARY_MISSING");
  if (new Set(ELECTRONICS_CATEGORY_REGISTRY.map(item => item.wave)).size !== 4) issues.push("WAVE_COVERAGE_MISSING");
  if (ELECTRONICS_AUTHORITY_BOUNDARIES.activation !== "FORBIDDEN_IN_BASELINE" || ELECTRONICS_AUTHORITY_BOUNDARIES.commerce !== "L10_EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY") issues.push("AUTHORITY_LEAKAGE");
  return Object.freeze(issues);
}
