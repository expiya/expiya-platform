import { describe, expect, it } from "vitest";

import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { PAID_COMPARISON_NET_KURUS, PAID_COMPARISON_PRICE_KURUS, PAID_COMPARISON_VAT_KURUS, PAID_COMPARISON_VAT_RATE_PERCENT } from "./contracts";
import { createPaidComparisonQuote } from "./createQuote";
import { assessPaidComparisonEligibility, listPaidComparisonAlternatives } from "./eligibility";

function variant(id: string, bodyStyle = "Hatchback", overrides: Partial<CatalogVariantSnapshot> = {}): CatalogVariantSnapshot {
  return {
    id,
    market: "TR",
    lifecycleStatus: "ON_SALE",
    brand: "Marka",
    model: id,
    trim: "Test",
    identityProvenance: [{ sourceId: "official", sourceUrl: "https://example.com", accessedAt: "2026-08-29T00:00:00.000Z" }],
    decisionFacts: {
      bodyStyle: { value: bodyStyle, confidence: "HIGH", provenance: [], catalogFingerprint: "fp", explanationAccess: "AUTHORITY_REQUIRED" },
      modelYear: { value: 2026, confidence: "HIGH", provenance: [], catalogFingerprint: "fp", explanationAccess: "AUTHORITY_REQUIRED" },
      powertrain: {
        fuelType: { value: "GASOLINE", confidence: "HIGH", provenance: [], catalogFingerprint: "fp", explanationAccess: "AUTHORITY_REQUIRED" },
        powerKw: { value: 100, confidence: "HIGH", provenance: [], catalogFingerprint: "fp", explanationAccess: "AUTHORITY_REQUIRED" },
        transmission: { value: "Otomatik", confidence: "HIGH", provenance: [], catalogFingerprint: "fp", explanationAccess: "AUTHORITY_REQUIRED" },
      },
      dimensions: {}, efficiency: {}, safetyFeatureCodes: [],
    },
    activeNewPrice: {
      id: `price-${id}`,
      vehicleVariantId: id,
      market: "TR",
      condition: "NEW",
      amountTry: 1_500_000,
      priceType: "LIST",
      consumerVisibility: "PUBLIC",
      realizationSafe: true,
      validFrom: "2026-08-01",
      taxTreatment: "INCLUDED",
      confidence: "HIGH",
      provenance: [{ sourceId: "official", sourceUrl: "https://example.com/price", accessedAt: "2026-08-29T00:00:00.000Z", extractionMethod: "MANUAL", confidence: "HIGH", limitations: [] }],
      catalogFingerprint: "fp",
    },
    ...overrides,
  };
}

describe("paid comparison quote", () => {
  it("pins the decision variant, two alternatives, catalog and KDV-included 349 TL price", () => {
    const quote = createPaidComparisonQuote({
      quoteId: "11111111-1111-4111-8111-111111111111",
      conversationId: "conversation",
      decisionId: "decision",
      approvedNeeds: [{ concept: "primaryUsage", summary: "Ana kullanım: şehir" }],
      decisionVariantId: "decision-car",
      alternativeVariantIds: ["alternative-1", "alternative-2"],
      variants: [variant("decision-car"), variant("alternative-1"), variant("alternative-2")],
      catalogReleaseVersion: "v1",
      catalogFingerprint: "fp",
      now: new Date("2026-08-29T10:00:00.000Z"),
    });

    expect(quote.amountKurus).toBe(PAID_COMPARISON_PRICE_KURUS);
    expect(PAID_COMPARISON_VAT_RATE_PERCENT).toBe(20);
    expect(PAID_COMPARISON_NET_KURUS).toBe(29_083);
    expect(PAID_COMPARISON_VAT_KURUS).toBe(5_817);
    expect(PAID_COMPARISON_NET_KURUS + PAID_COMPARISON_VAT_KURUS).toBe(quote.amountKurus);
    expect(quote.taxIncluded).toBe(true);
    expect(quote.vehicles).toEqual([
      { exactVariantId: "decision-car", role: "DECISION_CARD" },
      { exactVariantId: "alternative-1", role: "ALTERNATIVE_1" },
      { exactVariantId: "alternative-2", role: "ALTERNATIVE_2" },
    ]);
    expect(quote.catalogFingerprint).toBe("fp");
    expect(quote.approvedNeeds).toEqual([{ concept: "primaryUsage", summary: "Ana kullanım: şehir" }]);
    expect(quote.expiresAt).toBe("2026-08-29T10:30:00.000Z");
  });

  it("fails closed for a different comparison class", () => {
    const result = assessPaidComparisonEligibility({
      decisionVariantId: "decision-car",
      alternativeVariantIds: ["alternative-1", "suv"],
      variants: [variant("decision-car"), variant("alternative-1"), variant("suv", "SUV")],
    });
    expect(result).toEqual({ eligible: false, reason: "NOT_SAME_COMPARISON_CLASS", exactVariantId: "suv" });
  });

  it("fails closed for duplicate or non-public-price selections", () => {
    expect(assessPaidComparisonEligibility({
      decisionVariantId: "decision-car",
      alternativeVariantIds: ["alternative-1", "alternative-1"],
      variants: [variant("decision-car"), variant("alternative-1")],
    })).toEqual({ eligible: false, reason: "DUPLICATE_VARIANT" });

    expect(assessPaidComparisonEligibility({
      decisionVariantId: "decision-car",
      alternativeVariantIds: ["alternative-1", "alternative-2"],
      variants: [variant("decision-car"), variant("alternative-1"), variant("alternative-2", "Hatchback", { activeNewPrice: undefined })],
    })).toEqual({ eligible: false, reason: "PUBLIC_LIST_PRICE_REQUIRED", exactVariantId: "alternative-2" });
  });

  it("lists only eligible same-class alternatives ordered by price proximity", () => {
    const priced = (id: string, amountTry: number, bodyStyle = "Hatchback") => {
      const value = variant(id, bodyStyle);
      return { ...value, activeNewPrice: { ...value.activeNewPrice!, amountTry } };
    };
    const alternatives = listPaidComparisonAlternatives({
      decisionVariantId: "decision-car",
      variants: [
        priced("decision-car", 1_500_000),
        priced("far", 2_000_000),
        priced("near", 1_550_000),
        priced("suv", 1_500_000, "SUV"),
      ],
    });
    expect(alternatives.map((item) => item.id)).toEqual(["near", "far"]);
  });
});
