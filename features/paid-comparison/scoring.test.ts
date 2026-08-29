import { describe, expect, it } from "vitest";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { scorePaidComparison } from "./scoring";

const provenance = [{ sourceId: "official", sourceUrl: "https://example.com", accessedAt: "2026-08-29", extractionMethod: "MANUAL" as const, confidence: "HIGH" as const, limitations: [] }];
const fact = <T,>(value: T) => ({ value, confidence: "HIGH" as const, provenance, catalogFingerprint: "fp", explanationAccess: "AUTHORITY_REQUIRED" as const });
function variant(id: string, price: number, fuel: "GASOLINE" | "BEV", seats?: number): CatalogVariantSnapshot {
  return { id, market: "TR", lifecycleStatus: "ON_SALE", brand: "B", model: id, trim: "T", identityProvenance: provenance, decisionFacts: { bodyStyle: fact("SUV"), modelYear: fact(2026), powertrain: { fuelType: fact(fuel), powerKw: fact(100), transmission: fact("Otomatik") }, dimensions: { seats: seats ? fact(seats) : undefined }, efficiency: {}, safetyFeatureCodes: [] }, activeNewPrice: { id: `p-${id}`, vehicleVariantId: id, market: "TR", condition: "NEW", amountTry: price, priceType: "LIST", consumerVisibility: "PUBLIC", realizationSafe: true, validFrom: "2026-08-01", taxTreatment: "INCLUDED", confidence: "HIGH", provenance, catalogFingerprint: "fp" } };
}

describe("paid comparison scoring", () => {
  it("uses only measurable approved needs with equal transparent weighting", () => {
    const result = scorePaidComparison({ approvedNeeds: [
      { concept: "budgetMax", summary: "Kesin bütçe: 1,5 milyon", value: 1_500_000 },
      { concept: "fuelType", summary: "Yakıt: elektrikli", value: "BEV" },
      { concept: "primaryUsage", summary: "Ana kullanım: şehir", value: "URBAN_DAILY" },
    ], variants: [variant("decision", 1_400_000, "GASOLINE"), variant("electric", 1_500_000, "BEV"), variant("over", 1_600_000, "BEV")] });
    expect(result.scores.map((item) => item.score)).toEqual([50, 100, 50]);
    expect(result.leaders).toEqual(["electric"]);
    expect(result.unscoredNeeds).toEqual([expect.objectContaining({ concept: "primaryUsage" })]);
    expect(result.conclusion).toMatch(/bir alternatif daha yüksek/u);
  });

  it("does not penalize missing common facts or invent a score", () => {
    const result = scorePaidComparison({ approvedNeeds: [{ concept: "minimumSeats", summary: "En az 5 kişi", value: 5 }], variants: [variant("a", 1, "GASOLINE", 5), variant("b", 1, "GASOLINE"), variant("c", 1, "GASOLINE", 5)] });
    expect(result.scores.every((item) => item.score === null)).toBe(true);
    expect(result.conclusion).toMatch(/sayısal bir kazanan üretilmedi/u);
  });
});
