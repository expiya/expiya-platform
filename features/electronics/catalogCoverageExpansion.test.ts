import { describe, expect, it } from "vitest";
import {
  uniqueAsinCount,
  validateListingObservations,
  type AmazonListingObservation,
} from "./catalogCoverageExpansion";

const row: AmazonListingObservation = {
  categoryId: "HEADPHONES",
  query: "kulaklık",
  page: 1,
  asin: "B0FKN8GTGS",
  canonicalUrl: "https://www.amazon.com.tr/dp/B0FKN8GTGS",
  title: "HUAWEI FreeBuds 7i Siyah",
  observedAt: "2026-09-06T00:00:00.000Z",
  sponsored: true,
  availability: "PRICE_OBSERVED",
  priceDisplay: "3.714,20 TL",
  seller: null,
  fulfilment: null,
  disposition: "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE",
  reason: "Amazon is discovery only; exact identity remains pending.",
};

describe("catalog coverage expansion boundary", () => {
  it("accepts canonical discovery observations and deduplicates ASIN coverage", () => {
    expect(validateListingObservations([row])).toEqual([]);
    expect(uniqueAsinCount([row, { ...row, query: "Huawei FreeBuds" }])).toBe(1);
  });

  it("rejects Amazon-only product admission", () => {
    expect(validateListingObservations([{ ...row, disposition: "ADMITTED_EXACT" }])).toContain(
      "LISTING_CANNOT_SELF_AUTHORIZE_PRODUCT:B0FKN8GTGS",
    );
  });
});
