import { createHash } from "node:crypto";

import type {
  BrandIndex, BrandIndexEntry, CatalogDiagnostic, CatalogVariantSnapshot, ImmutableIndex,
  ModelAlias, ModelFamilyIndex, ModelFamilyIndexEntry,
} from "./types";
import { normalizeCatalogIdentity } from "./normalization";

class ImmutableIndexImpl<K, V> implements ImmutableIndex<K, V> {
  readonly #map: Map<K, V>;
  constructor(entries: readonly (readonly [K, V])[]) { this.#map = new Map(entries); Object.freeze(this); }
  get size(): number { return this.#map.size; }
  get(key: K): V | undefined { return this.#map.get(key); }
  has(key: K): boolean { return this.#map.has(key); }
  values(): readonly V[] { return Object.freeze([...this.#map.values()]); }
  entries(): readonly (readonly [K, V])[] { return Object.freeze([...this.#map.entries()].map((entry) => Object.freeze(entry))); }
}

export function createImmutableIndex<K, V>(entries: readonly (readonly [K, V])[]): ImmutableIndex<K, V> {
  return new ImmutableIndexImpl(entries);
}

function familyId(normalizedBrand: string, normalizedModel: string): string {
  const digest = createHash("sha256").update(`cars-family-v1\0${normalizedBrand}\0${normalizedModel}`, "utf8").digest("hex").slice(0, 24);
  return `family-${digest}`;
}

function aliases(brand: string, model: string): readonly ModelAlias[] {
  const values: ModelAlias[] = [
    { value: brand, normalizedValue: normalizeCatalogIdentity(brand), provenance: "CANONICAL_BRAND" },
    { value: model, normalizedValue: normalizeCatalogIdentity(model), provenance: "CANONICAL_MODEL" },
    { value: `${brand} ${model}`, normalizedValue: normalizeCatalogIdentity(`${brand} ${model}`), provenance: "CANONICAL_BRAND_MODEL" },
  ];
  return Object.freeze(values);
}

export function buildModelFamilyIndexes(variants: readonly CatalogVariantSnapshot[]): {
  readonly familyIndex: ModelFamilyIndex; readonly brandIndex: BrandIndex; readonly diagnostics: readonly CatalogDiagnostic[];
} {
  const groups = new Map<string, CatalogVariantSnapshot[]>();
  for (const variant of variants) {
    const key = `${normalizeCatalogIdentity(variant.brand)}\0${normalizeCatalogIdentity(variant.model)}`;
    groups.set(key, [...(groups.get(key) ?? []), variant]);
  }
  const diagnostics: CatalogDiagnostic[] = [];
  const ids = new Map<string, string>();
  const families: ModelFamilyIndexEntry[] = [];
  for (const [key, members] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "en"))) {
    const [normalizedBrand, normalizedModel] = key.split("\0") as [string, string];
    const id = familyId(normalizedBrand, normalizedModel);
    const prior = ids.get(id);
    if (prior && prior !== key) diagnostics.push({ code: "FAMILY_ID_COLLISION", reference: id });
    ids.set(id, key);
    const canonicalBrand = members[0]!.brand;
    const canonicalModel = members[0]!.model;
    if (new Set(members.map((member) => `${member.brand}\0${member.model}`)).size > 1) {
      diagnostics.push({ code: "NORMALIZATION_COLLISION", reference: id });
    }
    families.push(Object.freeze({
      familyId: id, canonicalBrand, canonicalModel, normalizedBrand, normalizedModel,
      variantIds: Object.freeze([...new Set(members.map((member) => member.id))].sort()), aliases: aliases(canonicalBrand, canonicalModel),
    }));
  }
  const familyIndex = createImmutableIndex(families.map((family) => [family.familyId, family] as const));
  const brands = new Map<string, BrandIndexEntry>();
  for (const family of families) {
    const existing = brands.get(family.normalizedBrand);
    brands.set(family.normalizedBrand, Object.freeze({
      canonicalBrand: existing?.canonicalBrand ?? family.canonicalBrand, normalizedBrand: family.normalizedBrand,
      familyIds: Object.freeze([...(existing?.familyIds ?? []), family.familyId].sort()),
    }));
  }
  return { familyIndex, brandIndex: createImmutableIndex([...brands.entries()].sort(([left], [right]) => left.localeCompare(right, "en"))), diagnostics: Object.freeze(diagnostics) };
}
