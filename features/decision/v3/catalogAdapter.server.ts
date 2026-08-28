import activeCatalogPointer from "@/data/production/catalog/active.json";
import { activeCatalogManifest, activeCatalogPayload, activeDecisionFacetPayload } from "@/data/production/catalog/activeCatalog.generated";
import { buildCatalogSnapshot } from "../v2/catalog/snapshot";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import { getReviewedEquipmentAssociations, getVerifiedEquipmentAssertions } from "../../vehicle-data/equipmentEvidenceResolver";
import { vehiclePersonaSafeTraitReleaseSchema, selectOwnerApprovedSafePersonaSignals } from "../../vehicle-data/vehiclePersonaSafeTraits";
import { activeVehiclePersonaSafeTraitRelease } from "../../../data/production/personas/safe-traits/activeVehiclePersonaSafeTraits.generated";
import { activeDecisionPreferences } from "./ledger";
import type { PreferenceEvent } from "./types";
import { scoreV39PersonaPreference } from "./personaSoftRanking";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";
import { hasProvisionalOwnerManualEquipment } from "../../vehicle-data/ownerManualEvidenceProjection";
import { projectV3DecisionPreferences } from "./decisionInput";
import type { BudgetDecisionMode } from "./types";
import { EQUIPMENT_FEATURE_DEFINITIONS } from "../../vehicle-data/equipmentEvidencePolicy";
import type { EquipmentFeatureCode } from "@/types/equipmentEvidence";

export interface V3CatalogEvaluation { readonly initialCount: number; readonly candidateIds: readonly string[]; readonly variants: readonly CatalogVariantSnapshot[]; readonly appliedEquipment: readonly PreferenceEvent[]; readonly unsupportedEquipment: readonly PreferenceEvent[]; readonly catalogReleaseVersion: string; readonly catalogFingerprint: string }
export interface V3CatalogEntitySignals { readonly brands: readonly string[]; readonly models: readonly string[] }
type LoadedCatalog = ReturnType<typeof buildCatalogSnapshot>;
let cachedActiveCatalog: Promise<LoadedCatalog> | undefined;
const personaSignals = selectOwnerApprovedSafePersonaSignals(vehiclePersonaSafeTraitReleaseSchema.parse(activeVehiclePersonaSafeTraitRelease)).signals;
const personaTraitsByVariant = new Map<string, ReadonlySet<VehiclePersonaTrait>>();
let activeCatalogAuthority: { readonly release: string; readonly fingerprint: string } | undefined;
for (const signal of personaSignals) personaTraitsByVariant.set(signal.exactVariantId, new Set([...(personaTraitsByVariant.get(signal.exactVariantId) ?? []), signal.trait]));
export function getV3PersonaTraits(exactVariantId: string): ReadonlySet<VehiclePersonaTrait> {
  return personaTraitsByVariant.get(exactVariantId) ?? new Set<VehiclePersonaTrait>();
}
const loadV3ActiveCatalog = (now?: Date): Promise<LoadedCatalog> => {
  const load = () => Promise.resolve(buildCatalogSnapshot({ pointer: activeCatalogPointer, manifest: activeCatalogManifest, catalog: activeCatalogPayload, decisionFacets: activeDecisionFacetPayload, now: now ?? new Date(), enforceTemporalInvariant: true }));
  if (now) return load();
  cachedActiveCatalog ??= load();
  return cachedActiveCatalog;
};
export async function getV3MinimumCatalogPriceTry(now?: Date): Promise<number> {
  const loaded = await loadV3ActiveCatalog(now);
  if (loaded.status !== "READY") throw new TypeError(`V3_CATALOG_${loaded.reason}`);
  const prices = loaded.snapshot.variants.flatMap((variant) => variant.lifecycleStatus === "ON_SALE" && variant.activeNewPrice ? [variant.activeNewPrice.amountTry] : []);
  if (!prices.length) throw new TypeError("V3_CATALOG_MINIMUM_PRICE_UNAVAILABLE");
  return Math.min(...prices);
}
export type V34PriceAuthority = "VERIFIED" | "ESTIMATED" | "UNAVAILABLE";
export function v34PriceAuthority(variant: CatalogVariantSnapshot): V34PriceAuthority { return !variant.activeNewPrice ? "UNAVAILABLE" : variant.activeNewPrice.priceType === "ESTIMATE" || !variant.activeNewPrice.realizationSafe ? "ESTIMATED" : "VERIFIED"; }
export function v34MatchesBudget(variant: CatalogVariantSnapshot, ceilingTry: number): boolean {
  return variant.activeNewPrice ? variant.activeNewPrice.amountTry <= ceilingTry : true;
}

const EQUIPMENT_FACT_CODES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  REAR_VIEW_CAMERA: ["REAR_CAMERA"], SURROUND_VIEW_CAMERA_360: ["SURROUND_VIEW_CAMERA"],
  PARKING_SENSORS: ["FRONT_REAR_PARK_SENSORS", "FRONT_REAR_SIDE_PARK_SENSORS"], AUTOMATIC_PARK_ASSIST: ["PARK_ASSIST"],
  ADAPTIVE_CRUISE_CONTROL: ["ADAPTIVE_CRUISE_CONTROL", "ACC", "ICC"], BLIND_SPOT_MONITOR: ["BLIND_SPOT_WARNING"], ISOFIX_REAR_OUTER: ["ISOFIX"],
});

export type V35EquipmentMatchAuthority = "VERIFIED" | "UNVERIFIED" | "NO_MATCH";
export function v35EquipmentMatchAuthority(variant: CatalogVariantSnapshot, featureCode: string): V35EquipmentMatchAuthority {
  const accepted = EQUIPMENT_FACT_CODES[featureCode] ?? [featureCode];
  const catalogFact = variant.decisionFacts.safetyFeatureCodes.find((fact) => accepted.includes(fact.value));
  if (catalogFact) return catalogFact.confidence === "HIGH" ? "VERIFIED" : "UNVERIFIED";
  const assertion = getVerifiedEquipmentAssertions(variant.id).find((item) => item.featureCode === featureCode);
  if (assertion?.availabilityStatus === "NOT_AVAILABLE") return "NO_MATCH";
  if (assertion?.verificationState === "VERIFIED" && assertion.standardOrOptional === "STANDARD") return "VERIFIED";
  if (assertion) return "UNVERIFIED";
  if (activeCatalogAuthority && hasProvisionalOwnerManualEquipment({ variant, featureCode, catalogRelease: activeCatalogAuthority.release, catalogFingerprint: activeCatalogAuthority.fingerprint })) return "UNVERIFIED";
  const reviewed = getReviewedEquipmentAssociations({ exactVariantId: variant.id, featureCode: featureCode as Parameters<typeof getReviewedEquipmentAssociations>[0] extends { featureCode?: infer T } ? T : never }).length > 0;
  return reviewed ? "UNVERIFIED" : "NO_MATCH";
}

export function v35EquipmentSelectionWarning(variant: CatalogVariantSnapshot, ledger: readonly PreferenceEvent[]): string | undefined {
  const equipment = activeDecisionPreferences(ledger).filter((item) => item.field === "equipmentFeature");
  return equipment.some((item) => v35EquipmentMatchAuthority(variant, String(item.normalizedValue)) === "UNVERIFIED")
    ? "Uyarı: Bu seçimde kullanılan donanım bilgisinin Türkiye'deki bu varyant için doğrulanması gerekir; satın alma öncesinde güncel donanım listesini teyit edin."
    : undefined;
}

function matches(variant: CatalogVariantSnapshot, preference: PreferenceEvent): boolean {
  if (preference.field === "bodyStyle") { const accepted = Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]; return accepted.some((value) => variant.decisionFacts.bodyStyle.value.toUpperCase().includes(String(value).toUpperCase())); }
  if (preference.field === "fuelType") { const accepted = Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]; return accepted.includes(variant.decisionFacts.powertrain.fuelType.value); }
  if (preference.field === "transmission") { const value = variant.decisionFacts.powertrain.transmission.value.toLocaleLowerCase("en-US"); return preference.normalizedValue === "MANUAL" ? /manual/u.test(value) : /automatic|dct|dsg|cvt|e-cvt|steptronic/u.test(value); }
  if (preference.field === "brand") { const accepted = Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]; return accepted.some((value) => variant.brand.localeCompare(String(value), "tr", { sensitivity: "base" }) === 0); }
  if (preference.field === "model") { const accepted = Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]; return accepted.some((value) => variant.model.localeCompare(String(value), "tr", { sensitivity: "base" }) === 0); }
  if (preference.field === "seats") return (variant.decisionFacts.dimensions.seats?.value ?? 0) >= Number(preference.normalizedValue);
  if (preference.field === "price") return v34MatchesBudget(variant, Number(preference.normalizedValue));
  if (preference.field === "equipmentFeature") return v35EquipmentMatchAuthority(variant, String(preference.normalizedValue)) !== "NO_MATCH";
  if (preference.field === "usagePurpose") return preference.normalizedValue === "COMMERCIAL" ? variant.decisionFacts.vehicleUseClass?.value === "LIGHT_COMMERCIAL" : true;
  return true;
}

const normalizedForEntityMatch = (value: string) => ` ${value.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/\p{M}+/gu, "").replace(/ı/gu, "i").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/gu, " ").trim()} `;

export async function resolveV3CatalogEntities(message: string, now?: Date): Promise<V3CatalogEntitySignals> {
  const loaded = await loadV3ActiveCatalog(now);
  if (loaded.status !== "READY") return { brands: [], models: [] };
  const haystack = normalizedForEntityMatch(message);
  const mentioned = (value: string) => haystack.includes(normalizedForEntityMatch(value));
  const variants = loaded.snapshot.variants;
  const exactModels = [...new Set(variants.filter((item) => mentioned(item.model) && (!/^\d+(?:[.-]\d+)*$/u.test(item.model) || mentioned(item.brand))).map((item) => item.model))];
  const modelMentioned = (model: string, brand: string) => {
    if (/^\d+(?:[.-]\d+)*$/u.test(model)) return mentioned(brand) && mentioned(model);
    const normalized = normalizedForEntityMatch(model).trim();
    if (mentioned(model)) return true;
    const tokens = normalized.split(" ");
    const series = haystack.match(/\s(\d)\s+serisi\s/u)?.[1];
    if (series && new RegExp(`^${series}\\d`, "iu").test(normalized)) return true;
    if (!/\d/u.test(tokens[0] ?? "")) {
      return false;
    }
    for (let length = tokens.length - 1; length >= 1; length -= 1) {
      const prefix = tokens.slice(0, length).join(" ");
      if (prefix.length >= 2 && haystack.includes(` ${prefix} `)) return true;
    }
    return false;
  };
  const exactWithCargoFamilies = exactModels.flatMap((exact) => [exact, ...variants.map((item) => item.model).filter((model) => normalizedForEntityMatch(model).trim().startsWith(`${normalizedForEntityMatch(exact).trim()} cargo`))]);
  const models = exactModels.length ? [...new Set(exactWithCargoFamilies)] : [...new Set(variants.filter((item) => modelMentioned(item.model, item.brand)).map((item) => item.model))];
  return {
    brands: [...new Set(loaded.snapshot.variants.map((item) => item.brand).filter(mentioned))],
    models,
  };
}

export async function evaluateV3Catalog(ledger: readonly PreferenceEvent[], now?: Date, budgetMode: BudgetDecisionMode = "NEEDS_ONLY"): Promise<V3CatalogEvaluation> {
  const loaded = await loadV3ActiveCatalog(now);
  if (loaded.status !== "READY") throw new TypeError(`V3_CATALOG_${loaded.reason}`);
  activeCatalogAuthority = { release: loaded.snapshot.authority.releaseVersion, fingerprint: loaded.snapshot.authority.catalogFingerprint };
  const onSale = loaded.snapshot.variants.filter((variant) => variant.lifecycleStatus === "ON_SALE");
  const requested = projectV3DecisionPreferences(ledger, budgetMode).filter((item) => item.decisionUse === "HARD_FILTER");
  let variants = onSale.filter((variant) => requested.every((preference) => matches(variant, preference)));
  const appliedEquipment: PreferenceEvent[] = [];
  const unsupportedEquipment: PreferenceEvent[] = [];
  for (const preference of activeDecisionPreferences(ledger).filter((item) => item.field === "equipmentFeature" && item.decisionUse === "HARD_FILTER")) {
    const verified = variants.filter((variant) => v35EquipmentMatchAuthority(variant, String(preference.normalizedValue)) === "VERIFIED");
    if (verified.length > 0) { variants = verified; appliedEquipment.push(preference); }
    else unsupportedEquipment.push(preference);
  }
  return { initialCount: loaded.snapshot.variants.length, candidateIds: variants.map((item) => item.id), variants, appliedEquipment, unsupportedEquipment, catalogReleaseVersion: loaded.snapshot.authority.releaseVersion, catalogFingerprint: loaded.snapshot.authority.catalogFingerprint };
}

export interface V3EquipmentQuestionPlan { readonly key: string; readonly featureCodes: readonly EquipmentFeatureCode[]; readonly text: string }
export function planV3VerifiedEquipmentQuestion(variants: readonly CatalogVariantSnapshot[], askedKeys: readonly string[], usage?: string): V3EquipmentQuestionPlan | undefined {
  if (variants.length < 2) return undefined;
  const alreadyAsked = new Set(askedKeys.flatMap((key) => key.startsWith("verifiedEquipment:") ? key.slice("verifiedEquipment:".length).split("|") : []));
  const categoryOrder: Readonly<Record<string, readonly string[]>> = {
    URBAN_DAILY: ["PARKING", "ACCESS", "ADAS", "CONNECTIVITY"],
    FAMILY: ["OCCUPANT_SAFETY", "CABIN_COMFORT", "ACCESS", "ADAS"],
    LONG_DISTANCE: ["ADAS", "CABIN_COMFORT", "LIGHTING"],
    COMMERCIAL: ["ACCESS", "PARKING", "ADAS"],
    CORPORATE_TRAVEL: ["CABIN_COMFORT", "ADAS", "PARKING", "CONNECTIVITY"],
    PASSENGER_TRANSPORT: ["ACCESS", "OCCUPANT_SAFETY", "CABIN_COMFORT", "ADAS"],
    MIXED_ROAD: ["OFF_ROAD", "ACCESS", "PARKING", "ADAS"],
  };
  const orderedCategories = categoryOrder[usage ?? ""];
  const allowed = orderedCategories ? new Set(orderedCategories) : undefined;
  const options = EQUIPMENT_FEATURE_DEFINITIONS.flatMap((definition) => {
    if (alreadyAsked.has(definition.featureCode) || (allowed && !allowed.has(definition.category))) return [];
    const count = variants.filter((variant) => v35EquipmentMatchAuthority(variant, definition.featureCode) === "VERIFIED").length;
    if (count === 0 || count === variants.length) return [];
    return [{ code: definition.featureCode, label: definition.labelTr.toLocaleLowerCase("tr-TR"), category: definition.category, split: Math.min(count, variants.length - count) }];
  }).sort((a, b) => (orderedCategories?.indexOf(a.category) ?? 0) - (orderedCategories?.indexOf(b.category) ?? 0) || b.split - a.split || a.code.localeCompare(b.code)).slice(0, 3);
  if (!options.length) return undefined;
  const featureCodes = options.map((item) => item.code);
  const labels = options.map((item) => item.label);
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} veya ${labels.at(-1)}`;
  return { key: `verifiedEquipment:${featureCodes.join("|")}`, featureCodes, text: `Bu seçenekleri gerçekten ayıran donanımlardan hangisi senin için vazgeçilmez: ${list}; yoksa bu gruptakilerden hiçbiri şart değil mi?` };
}

export function rankV3Candidates(variants: readonly CatalogVariantSnapshot[], ledger: readonly PreferenceEvent[], budgetMode: BudgetDecisionMode = "NEEDS_ONLY"): readonly CatalogVariantSnapshot[] {
  return [...variants].sort((a, b) => scoreV3Candidate(b, ledger, budgetMode) - scoreV3Candidate(a, ledger, budgetMode) || a.id.localeCompare(b.id));
}

export function scoreV3Candidate(variant: CatalogVariantSnapshot, ledger: readonly PreferenceEvent[], budgetMode: BudgetDecisionMode = "NEEDS_ONLY"): number {
  const preferences = projectV3DecisionPreferences(ledger, budgetMode).filter((preference) => preference.concept !== "budgetMax" && preference.concept !== "budgetTarget");
  return preferences.reduce((total, preference) => {
    if (preference.concept === "performance") return total + variant.decisionFacts.powertrain.powerKw.value / 100;
    if (preference.concept === "valueEconomy") return total - (variant.activeNewPrice?.amountTry ?? 99_000_000) / 10_000_000;
    if (preference.concept === "longDistanceComfort") return total + (variant.decisionFacts.bodyStyle.value.toUpperCase().includes("SUV") ? 2 : 0);
    if (preference.concept === "brandPreference" && preference.decisionUse === "SOFT_RANK") { const accepted = Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]; return total + (accepted.some((value) => variant.brand.localeCompare(String(value), "tr", { sensitivity: "base" }) === 0) ? 10 : 0); }
    if (preference.concept === "modelPreference" && preference.decisionUse === "SOFT_RANK") { const accepted = Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]; return total + (accepted.some((value) => variant.model.localeCompare(String(value), "tr", { sensitivity: "base" }) === 0) ? 12 : 0); }
    if (preference.concept === "brandModelPreference") { const needle = String(preference.normalizedValue).toLocaleLowerCase("tr"); return total + (`${variant.brand} ${variant.model}`.toLocaleLowerCase("tr").split(/\s+/u).some((part) => part.length > 2 && needle.includes(part)) ? 10 : 0); }
    return total;
  }, scoreV39PersonaPreference(personaTraitsByVariant.get(variant.id) ?? new Set<VehiclePersonaTrait>(), preferences));
}
