import { describe, expect, it } from "vitest";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { buildPaidComparisonReportDraft } from "./reportDraft";

const provenance = [{ sourceId: "maker", sourceUrl: "https://maker.example/spec", accessedAt: "2026-08-29", extractionMethod: "DOCUMENT_IMPORT" as const, confidence: "HIGH" as const, limitations: [] }];
const sourced = <T,>(value: T) => ({ value, confidence: "HIGH" as const, provenance, catalogFingerprint: "sha256:test", explanationAccess: "AUTHORITY_REQUIRED" as const });
const variant = (id: string): CatalogVariantSnapshot => ({
  id, market: "TR", lifecycleStatus: "ON_SALE", brand: "Marka", model: "Model", trim: id,
  identityProvenance: provenance, activeNewPrice: { id: `p-${id}`, vehicleVariantId: id, market: "TR", condition: "NEW", amountTry: 1_000_000, priceType: "LIST", consumerVisibility: "PUBLIC", realizationSafe: true, validFrom: "2026-08-01", taxTreatment: "INCLUDED", confidence: "HIGH", provenance, catalogFingerprint: "sha256:test" },
  decisionFacts: { bodyStyle: sourced("SUV"), modelYear: sourced(2026), powertrain: { fuelType: sourced("GASOLINE"), powerKw: sourced(100), transmission: sourced("Automatic") }, dimensions: {}, efficiency: {}, safetyFeatureCodes: [] },
});

describe("buildPaidComparisonReportDraft", () => {
  it("keeps exact variants, sources and explicit missing facts", () => {
    const draft = buildPaidComparisonReportDraft({ catalogReleaseVersion: "1", catalogFingerprint: "sha256:test", generatedAt: "2026-08-29T10:00:00Z", variants: [variant("a"), variant("b"), variant("c")] });
    expect(draft.vehicles.map((item) => item.role)).toEqual(["DECISION_CARD", "ALTERNATIVE_1", "ALTERNATIVE_2"]);
    expect(draft.vehicles[0].facts.torqueNm).toMatchObject({ missing: true, value: null });
    expect(draft.vehicles[0].price.sources).toEqual(["https://maker.example/spec"]);
    expect(draft.vehicles.every((item) => item.salesActions.includes("REQUEST_OFFER"))).toBe(true);
  });
});
