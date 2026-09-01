import { describe, expect, it } from "vitest";
import { evaluateInventoryQuality } from "./data-quality/qualityPolicy";
const clean = { measuredAt: "2026-09-01", activeListings: 100, stalePriceListings: 0, staleStockListings: 0, requiredFieldMissingListings: 0, unresolvedDuplicateListings: 0, evidenceConflictListings: 0, misleadingVerifiedClaims: 0, invalidTaxonomyReferences: 0, soldStillPublicListings: 0 };
describe("used-cars inventory quality policy", () => {
  it("recognizes a clean snapshot without enabling publication", () => expect(evaluateInventoryQuality(clean)).toMatchObject({ healthy: true, newPublicationAllowed: false, automaticQualityWaiverAllowed: false }));
  it("stops on any misleading verification or sold listing", () => expect(evaluateInventoryQuality({ ...clean, misleadingVerifiedClaims: 1, soldStillPublicListings: 1 }).stopCodes).toEqual(expect.arrayContaining(["MISLEADING_VERIFICATION", "SOLD_STILL_PUBLIC"])));
  it("enforces freshness and conflict ratios", () => expect(evaluateInventoryQuality({ ...clean, stalePriceListings: 6, staleStockListings: 11, evidenceConflictListings: 3 }).healthy).toBe(false));
});
