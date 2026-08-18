import { describe, expect, it } from "vitest";
import type { CatalogSnapshot } from "../catalog/types";
import { PRICE_AUTHORITY_POLICY_V1 } from "./policy";
import { projectRelativePriceSegments, projectRelativePriceSegmentsCached } from "./priceSegmentation";
import { loadProductionCatalogSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";

const provenance = [{ sourceId: "source", sourceUrl: "https://example.com", accessedAt: "2026-08-19T00:00:00.000Z", extractionMethod: "MANUAL" as const, confidence: "HIGH" as const, limitations: [] }];
const fact = <T,>(value: T) => ({ value, confidence: "HIGH" as const, provenance, catalogFingerprint: "catalog", explanationAccess: "AUTHORITY_REQUIRED" as const });
const variant = (index: number, estimate: boolean, bodyStyle = index <= 5 ? "Hatchback" : "Panel Van") => ({ id: `v${index}`, market: "TR" as const, lifecycleStatus: "ON_SALE" as const, brand: "Brand", model: `Model ${index}`, trim: "Trim", identityProvenance: provenance, decisionFacts: { bodyStyle: fact(bodyStyle), modelYear: fact(2026), powertrain: { fuelType: fact("GASOLINE" as const), powerKw: fact(100), transmission: fact("Automatic") }, dimensions: {}, efficiency: {}, safetyFeatureCodes: [] }, activeNewPrice: { id: `p${index}`, vehicleVariantId: `v${index}`, market: "TR" as const, condition: "NEW" as const, amountTry: index * 1_000_000, priceType: estimate ? "ESTIMATE" as const : "LIST" as const, consumerVisibility: estimate ? "INTERNAL_ONLY" as const : "PUBLIC" as const, realizationSafe: !estimate, ...(estimate ? { estimationMethod: "versioned-model" } : {}), validFrom: "2026-08-01T00:00:00.000Z", confidence: "HIGH" as const, provenance, catalogFingerprint: "catalog" } });

describe("relative price segmentation", () => {
  it("includes valid internal estimates while preserving their separate authority", () => {
    const variants = Array.from({ length: 10 }, (_, index) => variant(index + 1, index % 2 === 1));
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants } as unknown as CatalogSnapshot;
    const result = projectRelativePriceSegments({ snapshot, evaluationTime: "2026-08-19T00:00:00.000Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 });
    expect(result.projections).toHaveLength(10); expect(result.excludedVariantIds).toEqual([]);
    expect(result.projections.find((item) => item.exactVariantId === "v2")).toMatchObject({ sourceAuthority: "INTERNAL_ESTIMATE", globalCatalogPriceSegment: "LOWEST_20" });
    expect(result.projections.find((item) => item.exactVariantId === "v10")).toMatchObject({ sourceAuthority: "INTERNAL_ESTIMATE", globalCatalogPriceSegment: "HIGHEST_80_100" });
    expect(JSON.stringify(result)).not.toContain("amountTry");
  });

  it("computes comparable architecture cohorts independently of the global distribution", () => {
    const variants = Array.from({ length: 10 }, (_, index) => variant(index + 1, false));
    const result = projectRelativePriceSegments({ snapshot: { authority: { catalogFingerprint: "catalog" }, variants } as unknown as CatalogSnapshot, evaluationTime: "2026-08-19T00:00:00.000Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 });
    expect(result.projections.find((item) => item.exactVariantId === "v6")).toMatchObject({ globalCatalogPriceSegment: "MID_40_60", comparableCohortPriceSegment: "LOWEST_20", comparableCohortKey: "ENCLOSED_CARGO" });
  });

  it("never splits equal prices across percentile boundaries", () => {
    const variants = Array.from({ length: 10 }, (_, index) => ({ ...variant(index + 1, index % 2 === 0), activeNewPrice: { ...variant(index + 1, index % 2 === 0).activeNewPrice, amountTry: index < 3 ? 1_000_000 : index * 1_000_000 } }));
    const result = projectRelativePriceSegments({ snapshot: { authority: { catalogFingerprint: "catalog" }, variants } as unknown as CatalogSnapshot, evaluationTime: "2026-08-19T00:00:00.000Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 });
    expect(new Set(result.projections.filter((item) => ["v1", "v2", "v3"].includes(item.exactVariantId)).map((item) => item.globalCatalogPriceSegment))).toEqual(new Set(["LOWEST_20"]));
  });

  it("projects the real catalog without dropping internal estimates", async () => {
    const loaded = await loadProductionCatalogSnapshotForTest(new Date("2026-08-19T00:00:00.000Z")); expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const result = projectRelativePriceSegments({ snapshot: loaded.snapshot, evaluationTime: "2026-08-19T00:00:00.000Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 });
    const expectedInternalEstimates = loaded.snapshot.variants.filter((variant) => variant.activeNewPrice?.priceType === "ESTIMATE" && variant.activeNewPrice.consumerVisibility === "INTERNAL_ONLY").length;
    expect(result.projections.filter((item) => item.sourceAuthority === "INTERNAL_ESTIMATE")).toHaveLength(expectedInternalEstimates);
    expect(result.projections.every((item) => item.catalogFingerprint === loaded.snapshot.authority.catalogFingerprint)).toBe(true);
  });

  it("invalidates cached projections when catalog authority changes and preserves request-time trace", () => {
    const variants = Array.from({ length: 10 }, (_, index) => variant(index + 1, index % 2 === 0)); const snapshot = { authority: { catalogFingerprint: "catalog" }, variants } as unknown as CatalogSnapshot;
    const first = projectRelativePriceSegmentsCached({ snapshot, evaluationTime: "2026-08-19T00:00:00.000Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 });
    const sameWindow = projectRelativePriceSegmentsCached({ snapshot, evaluationTime: "2026-08-19T01:00:00.000Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 });
    expect(sameWindow.projections).toHaveLength(first.projections.length); expect(sameWindow.evaluationTime).toBe("2026-08-19T01:00:00.000Z"); expect(sameWindow.projections.every((projection) => projection.evaluationTime === sameWindow.evaluationTime)).toBe(true);
    const changed = projectRelativePriceSegmentsCached({ snapshot: { ...snapshot, authority: { ...snapshot.authority, catalogFingerprint: "different" } } as CatalogSnapshot, evaluationTime: "2026-08-19T01:00:00.000Z", priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 });
    expect(changed.catalogFingerprint).toBe("different"); expect(changed.projections).toEqual([]);
  });
});
