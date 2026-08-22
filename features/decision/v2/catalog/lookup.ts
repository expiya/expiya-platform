import { CATALOG_NORMALIZATION_POLICY, normalizeCatalogIdentity } from "./normalization";
import type { CatalogSnapshot, CatalogVariantSnapshot, ModelFamilyIndexEntry } from "./types";

export type CatalogLookupPurpose = "AVAILABILITY" | "SUITABILITY" | "COMPARISON" | "REFERENCE";
export type CatalogMatchGrade = "EXACT_VARIANT_ID" | "EXACT_BRAND_MODEL" | "EXACT_MODEL_UNIQUE" | "EXACT_BRAND" | "NORMALIZED_CANONICAL" | "POSSIBLE_TYPO" | "AMBIGUOUS" | "NOT_FOUND";
export interface CatalogModelLookupQuery { readonly rawText: string; readonly brand?: string; readonly model?: string; readonly exactVariantId?: string; readonly purpose: CatalogLookupPurpose }
interface LookupBase { readonly catalogFingerprint: string; readonly normalizationPolicyVersion: string; readonly lookupPurpose: CatalogLookupPurpose; readonly matchGrade: CatalogMatchGrade; readonly provenance: "CATALOG_VARIANT_ID" | "CATALOG_CANONICAL_IDENTITY" | "CATALOG_NORMALIZED_ALIAS" | "CATALOG_BRAND_INDEX" | "NO_CATALOG_MATCH" }
export type CatalogModelLookupResult =
  | (LookupBase & { readonly kind: "EXACT_VARIANT"; readonly variantId: string; readonly familyId: string; readonly canonicalBrand: string; readonly canonicalModel: string; readonly canonicalTrim: string; readonly lifecycleStatus: CatalogVariantSnapshot["lifecycleStatus"] })
  | (LookupBase & { readonly kind: "EXACT_MODEL_FAMILY"; readonly familyId: string; readonly variantIds: readonly string[]; readonly canonicalBrand: string; readonly canonicalModel: string; readonly lifecycleStatuses: readonly CatalogVariantSnapshot["lifecycleStatus"][] })
  | (LookupBase & { readonly kind: "BRAND"; readonly canonicalBrand: string; readonly familyIds: readonly string[] })
  | (LookupBase & { readonly kind: "POSSIBLE_TYPO"; readonly canonicalOptions: readonly string[]; readonly decisionAuthority: "NONE_CONFIRMATION_REQUIRED" })
  | (LookupBase & { readonly kind: "AMBIGUOUS"; readonly reason: "MODEL_NAME_MULTIPLE_BRANDS" | "ALIAS_COLLISION" | "MULTIPLE_VARIANTS"; readonly familyIds: readonly string[]; readonly variantIds: readonly string[]; readonly canonicalOptions: readonly string[] })
  | (LookupBase & { readonly kind: "NOT_FOUND"; readonly familyIds: readonly []; readonly variantIds: readonly [] });

function common(snapshot: CatalogSnapshot, query: CatalogModelLookupQuery) {
  return { catalogFingerprint: snapshot.authority.catalogFingerprint, normalizationPolicyVersion: CATALOG_NORMALIZATION_POLICY.version, lookupPurpose: query.purpose } as const;
}

function familyResult(snapshot: CatalogSnapshot, query: CatalogModelLookupQuery, family: ModelFamilyIndexEntry, grade: "EXACT_BRAND_MODEL" | "EXACT_MODEL_UNIQUE" | "NORMALIZED_CANONICAL"): CatalogModelLookupResult {
  return { ...common(snapshot, query), kind: "EXACT_MODEL_FAMILY", matchGrade: grade, provenance: grade === "NORMALIZED_CANONICAL" ? "CATALOG_NORMALIZED_ALIAS" : "CATALOG_CANONICAL_IDENTITY", familyId: family.familyId, variantIds: family.variantIds, canonicalBrand: family.canonicalBrand, canonicalModel: family.canonicalModel, lifecycleStatuses: Object.freeze([...new Set(family.variantIds.map((id) => snapshot.variantById.get(id)!.lifecycleStatus))].sort()) };
}

function boundedEditDistance(left: string, right: string, maximum: number): number | undefined {
  if (Math.abs(left.length - right.length) > maximum) return undefined;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row]; let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const value = Math.min(current[column - 1]! + 1, previous[column]! + 1, previous[column - 1]! + (left[row - 1] === right[column - 1] ? 0 : 1));
      current.push(value); rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maximum) return undefined;
    previous = current;
  }
  return previous[right.length]! <= maximum ? previous[right.length] : undefined;
}

function possibleTypo(snapshot: CatalogSnapshot, query: CatalogModelLookupQuery, normalizedBrand: string | undefined, normalizedModel: string | undefined, normalizedRaw: string | undefined): CatalogModelLookupResult | undefined {
  const target = normalizedModel ?? normalizedRaw;
  if (!target || target.length < 4 || target.length > 64) return undefined;
  const candidates = snapshot.familyIndex.values().filter((family) => !normalizedBrand || family.normalizedBrand === normalizedBrand).flatMap((family) => {
    const identities = normalizedBrand ? [family.normalizedModel] : [family.normalizedModel, normalizeCatalogIdentity(`${family.canonicalBrand} ${family.canonicalModel}`)];
    const distance = Math.min(...identities.map((identity) => boundedEditDistance(target, identity, target.length >= 7 ? 2 : 1) ?? Number.POSITIVE_INFINITY));
    return Number.isFinite(distance) ? [{ family, distance }] : [];
  }).sort((left, right) => left.distance - right.distance || left.family.familyId.localeCompare(right.family.familyId));
  if (!candidates.length) return undefined;
  const closest = candidates.filter((candidate) => candidate.distance === candidates[0]!.distance).slice(0, 5);
  return { ...common(snapshot, query), kind: "POSSIBLE_TYPO", matchGrade: "POSSIBLE_TYPO", provenance: "NO_CATALOG_MATCH",
    canonicalOptions: Object.freeze(closest.map(({ family }) => `${family.canonicalBrand} ${family.canonicalModel}`).sort()), decisionAuthority: "NONE_CONFIRMATION_REQUIRED" };
}

export function lookupCatalogModel(snapshot: CatalogSnapshot, query: CatalogModelLookupQuery): CatalogModelLookupResult {
  if (query.exactVariantId) {
    const variant = snapshot.variantById.get(query.exactVariantId);
    if (variant) {
      const family = snapshot.familyIndex.values().find((entry) => entry.variantIds.includes(variant.id))!;
      return { ...common(snapshot, query), kind: "EXACT_VARIANT", matchGrade: "EXACT_VARIANT_ID", provenance: "CATALOG_VARIANT_ID", variantId: variant.id, familyId: family.familyId, canonicalBrand: variant.brand, canonicalModel: variant.model, canonicalTrim: variant.trim, lifecycleStatus: variant.lifecycleStatus };
    }
    return { ...common(snapshot, query), kind: "NOT_FOUND", matchGrade: "NOT_FOUND", provenance: "NO_CATALOG_MATCH", familyIds: [], variantIds: [] };
  }
  let brand: string | undefined;
  let model: string | undefined;
  try { brand = query.brand ? normalizeCatalogIdentity(query.brand) : undefined; model = query.model ? normalizeCatalogIdentity(query.model) : undefined; } catch { /* fail to not-found */ }
  const families = snapshot.familyIndex.values();
  if (brand && model) {
    const match = families.find((family) => family.normalizedBrand === brand && family.normalizedModel === model);
    if (match) return familyResult(snapshot, query, match, "EXACT_BRAND_MODEL");
  }
  if (model) {
    const matches = families.filter((family) => family.normalizedModel === model);
    if (matches.length === 1) return familyResult(snapshot, query, matches[0]!, "EXACT_MODEL_UNIQUE");
    if (matches.length > 1) return { ...common(snapshot, query), kind: "AMBIGUOUS", matchGrade: "AMBIGUOUS", provenance: "CATALOG_NORMALIZED_ALIAS", reason: "MODEL_NAME_MULTIPLE_BRANDS", familyIds: Object.freeze(matches.map((match) => match.familyId).sort()), variantIds: [], canonicalOptions: Object.freeze(matches.map((match) => `${match.canonicalBrand} ${match.canonicalModel}`).sort()) };
  }
  if (brand && !model) {
    const match = snapshot.brandIndex.get(brand);
    if (match) return { ...common(snapshot, query), kind: "BRAND", matchGrade: "EXACT_BRAND", provenance: "CATALOG_BRAND_INDEX", canonicalBrand: match.canonicalBrand, familyIds: match.familyIds };
  }
  let raw: string | undefined;
  try { raw = normalizeCatalogIdentity(query.rawText); } catch { /* fail to not-found */ }
  if (raw) {
    const combined = families.filter((family) => normalizeCatalogIdentity(`${family.canonicalBrand} ${family.canonicalModel}`) === raw);
    if (combined.length === 1) return familyResult(snapshot, query, combined[0]!, "NORMALIZED_CANONICAL");
    const modelMatches = families.filter((family) => family.normalizedModel === raw);
    if (modelMatches.length === 1) return familyResult(snapshot, query, modelMatches[0]!, "EXACT_MODEL_UNIQUE");
    if (modelMatches.length > 1) return { ...common(snapshot, query), kind: "AMBIGUOUS", matchGrade: "AMBIGUOUS", provenance: "CATALOG_NORMALIZED_ALIAS", reason: "MODEL_NAME_MULTIPLE_BRANDS", familyIds: Object.freeze(modelMatches.map((match) => match.familyId).sort()), variantIds: [], canonicalOptions: Object.freeze(modelMatches.map((match) => `${match.canonicalBrand} ${match.canonicalModel}`).sort()) };
    const brandMatch = snapshot.brandIndex.get(raw);
    if (brandMatch) return { ...common(snapshot, query), kind: "BRAND", matchGrade: "EXACT_BRAND", provenance: "CATALOG_BRAND_INDEX", canonicalBrand: brandMatch.canonicalBrand, familyIds: brandMatch.familyIds };
    const variants = snapshot.variants.filter((variant) => normalizeCatalogIdentity(`${variant.brand} ${variant.model} ${variant.trim}`) === raw);
    if (variants.length === 1) {
      const variant = variants[0]!; const family = families.find((entry) => entry.variantIds.includes(variant.id))!;
      return { ...common(snapshot, query), kind: "EXACT_VARIANT", matchGrade: "NORMALIZED_CANONICAL", provenance: "CATALOG_NORMALIZED_ALIAS", variantId: variant.id, familyId: family.familyId, canonicalBrand: variant.brand, canonicalModel: variant.model, canonicalTrim: variant.trim, lifecycleStatus: variant.lifecycleStatus };
    }
    if (variants.length > 1) return { ...common(snapshot, query), kind: "AMBIGUOUS", matchGrade: "AMBIGUOUS", provenance: "CATALOG_NORMALIZED_ALIAS", reason: "MULTIPLE_VARIANTS", familyIds: [], variantIds: Object.freeze(variants.map((variant) => variant.id).sort()), canonicalOptions: Object.freeze(variants.map((variant) => `${variant.brand} ${variant.model} ${variant.trim}`).sort()) };
  }
  return possibleTypo(snapshot, query, brand, model, raw) ?? { ...common(snapshot, query), kind: "NOT_FOUND", matchGrade: "NOT_FOUND", provenance: "NO_CATALOG_MATCH", familyIds: [], variantIds: [] };
}
