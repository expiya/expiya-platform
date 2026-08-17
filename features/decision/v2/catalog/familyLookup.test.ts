import { describe, expect, it } from "vitest";

import { buildModelFamilyIndexes } from "./familyIndex";
import { lookupCatalogModel } from "./lookup";
import { authorizeMentionsFromCatalogLookup } from "./mentionAuthorization";
import { normalizeCatalogIdentity } from "./normalization";
import { buildCatalogSnapshot } from "./snapshot";
import { release, variant } from "./testFixtures.testSupport";
import type { CatalogFact, CatalogSnapshot, CatalogVariantSnapshot } from "./types";

const provenance = [{ sourceId: "source", sourceUrl: "https://example.com", accessedAt: "2026-08-18T23:00:00.000Z", extractionMethod: "MANUAL" as const, confidence: "HIGH" as const, limitations: [] }];
function indexedVariant(id: string, brand: string, model: string, trim: string): CatalogVariantSnapshot {
  const fact = <T,>(value: T): CatalogFact<T> => ({ value, confidence: "HIGH", provenance, catalogFingerprint: "sha256:test", explanationAccess: "AUTHORITY_REQUIRED" });
  return { id, market: "TR", lifecycleStatus: "ON_SALE", brand, model, trim, identityProvenance: [], decisionFacts: {
    bodyStyle: fact("Generic"), modelYear: fact(2026), powertrain: { fuelType: fact("GASOLINE"), powerKw: fact(100), transmission: fact("Automatic") },
    dimensions: {}, efficiency: {}, safetyFeatureCodes: [],
  } };
}

function snapshot(records = [
  variant("variant-a", "Brand Alpha", "Model 10", "Base"),
  variant("variant-b", "Brand Alpha", "Model 10", "Plus"),
  variant("variant-c", "Brand Beta", "Shared 30", "Base"),
  variant("variant-d", "Brand Gamma", "Shared 30", "Base"),
]): CatalogSnapshot {
  const fixture = release("1.2.3", records);
  const result = buildCatalogSnapshot({ ...fixture, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") });
  if (result.status !== "READY") throw new Error(JSON.stringify(result));
  return result.snapshot;
}

describe("V2 model family index and deterministic lookup", () => {
  it("builds the same family index regardless of trim or variant order", () => {
    const first: CatalogVariantSnapshot[] = [
      indexedVariant("a", "Brand Alpha", "Model 10", "Base"),
      indexedVariant("b", "Brand Alpha", "Model 10", "Plus"),
    ];
    const changedTrim = first.map((item) => ({ ...item, trim: `${item.trim} Changed` })).reverse();
    expect(buildModelFamilyIndexes(first).familyIndex.values().map((entry) => entry.familyId)).toEqual(buildModelFamilyIndexes(changedTrim).familyIndex.values().map((entry) => entry.familyId));
    expect(buildModelFamilyIndexes(first).familyIndex.values()[0]?.variantIds).toEqual(["a", "b"]);
  });

  it("normalizes Turkish/ASCII forms while preserving distinct numbers", () => {
    expect(normalizeCatalogIdentity(" Çığ ÖŞÜ ")).toBe(normalizeCatalogIdentity("cig osu"));
    expect(normalizeCatalogIdentity("Model 3")).not.toBe(normalizeCatalogIdentity("Model 30"));
    expect(normalizeCatalogIdentity("Model 30")).not.toBe(normalizeCatalogIdentity("Model 300"));
  });

  it("reports normalization collisions instead of silently hiding them", () => {
    const variants: CatalogVariantSnapshot[] = [
      indexedVariant("a", "Çağ", "Özel", "A"),
      indexedVariant("b", "Cag", "Ozel", "B"),
    ];
    expect(buildModelFamilyIndexes(variants).diagnostics).toContainEqual(expect.objectContaining({ code: "NORMALIZATION_COLLISION" }));
  });

  it("resolves brand+model, unique model, brand-only, and exact variant ID", () => {
    const catalog = snapshot();
    expect(lookupCatalogModel(catalog, { rawText: "", brand: "Brand Alpha", model: "Model 10", purpose: "AVAILABILITY" }).kind).toBe("EXACT_MODEL_FAMILY");
    expect(lookupCatalogModel(catalog, { rawText: "Model 10", model: "Model 10", purpose: "REFERENCE" })).toMatchObject({ kind: "EXACT_MODEL_FAMILY", matchGrade: "EXACT_MODEL_UNIQUE" });
    expect(lookupCatalogModel(catalog, { rawText: "Brand Alpha", brand: "Brand Alpha", purpose: "REFERENCE" }).kind).toBe("BRAND");
    expect(lookupCatalogModel(catalog, { rawText: "", exactVariantId: "variant-a", purpose: "SUITABILITY" })).toMatchObject({ kind: "EXACT_VARIANT", matchGrade: "EXACT_VARIANT_ID", lifecycleStatus: "ON_SALE" });
  });

  it("returns ambiguity for shared model names without selecting the first", () => {
    const result = lookupCatalogModel(snapshot(), { rawText: "Shared 30", model: "Shared 30", purpose: "COMPARISON" });
    expect(result).toMatchObject({ kind: "AMBIGUOUS", matchGrade: "AMBIGUOUS", reason: "MODEL_NAME_MULTIPLE_BRANDS" });
    if (result.kind === "AMBIGUOUS") expect(result.familyIds).toHaveLength(2);
  });

  it("returns not-found for unknown, substring, fuzzy, and unknown variant queries", () => {
    const catalog = snapshot();
    expect(lookupCatalogModel(catalog, { rawText: "Unknown 90", purpose: "REFERENCE" }).kind).toBe("NOT_FOUND");
    expect(lookupCatalogModel(catalog, { rawText: "Model", purpose: "REFERENCE" }).kind).toBe("NOT_FOUND");
    expect(lookupCatalogModel(catalog, { rawText: "Modle 10", purpose: "REFERENCE" }).kind).toBe("NOT_FOUND");
    expect(lookupCatalogModel(catalog, { rawText: "", exactVariantId: "missing", purpose: "REFERENCE" }).kind).toBe("NOT_FOUND");
  });

  it("preserves catalog provenance and grants mention but never reveal or offer authority", () => {
    const catalog = snapshot();
    const result = lookupCatalogModel(catalog, { rawText: "Model 10", model: "Model 10", purpose: "REFERENCE" });
    expect(result.catalogFingerprint).toBe(catalog.authority.catalogFingerprint);
    const authorization = authorizeMentionsFromCatalogLookup(result);
    expect(authorization.mentionableCandidateIds).toEqual(["variant-a", "variant-b"]);
    expect(authorization.revealableCandidateIds).toEqual([]);
    expect(authorization.offerAuthorization).toBeNull();
    const notFound = authorizeMentionsFromCatalogLookup(lookupCatalogModel(catalog, { rawText: "Unknown", purpose: "REFERENCE" }));
    expect(notFound.mentionableCandidateIds).toEqual([]);
  });

  it("authorizes only disambiguation families for ambiguous lookup", () => {
    const authorization = authorizeMentionsFromCatalogLookup(lookupCatalogModel(snapshot(), { rawText: "Shared 30", model: "Shared 30", purpose: "REFERENCE" }));
    expect(authorization.mentionableCandidateIds).toEqual([]);
    expect(authorization.disambiguationFamilyIds).toHaveLength(2);
  });
});
