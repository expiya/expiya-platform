import { describe, expect, it } from "vitest";
import { CATALOG_PORTFOLIO_MATRIX, validateCatalogPortfolioMatrix } from "./catalogPortfolioMatrix.server";

describe("catalog portfolio taxonomy matrix", () => {
  it("is complete, proposal-only and internally deduplicated", () => {
    expect(validateCatalogPortfolioMatrix()).toEqual([]);
    expect(CATALOG_PORTFOLIO_MATRIX.areas).toHaveLength(20);
    expect(CATALOG_PORTFOLIO_MATRIX.runtimeActive).toBe(false);
  });

  it("reuses canonical owners across overlapping retail areas", () => {
    const areas = new Map(CATALOG_PORTFOLIO_MATRIX.areas.map(area => [area.amazonArea, area] as const));
    expect(areas.get("Computers")?.targetDepartmentId).toBe("ELECTRONICS");
    expect(areas.get("Video Games")?.targetDepartmentId).toBe("ELECTRONICS");
    expect(areas.get("Automotive")?.targetDepartmentId).toBe("CARS");
    expect(areas.get("Sporting Goods")?.overlapAliases).toContainEqual(expect.objectContaining({ canonicalCategoryId: "BICYCLE" }));
    expect(areas.get("Baby Products")?.overlapAliases).toContainEqual(expect.objectContaining({ canonicalCategoryId: "CHILD_CAR_SEAT" }));
  });

  it("does not manufacture catalogs for poor-fit areas", () => {
    const rejected = CATALOG_PORTFOLIO_MATRIX.areas.filter(area => area.disposition.startsWith("POOR_FIT"));
    expect(rejected.map(area => area.amazonArea).sort()).toEqual(["Apparel", "Beauty", "Books", "Gift Cards", "Grocery", "Health & Personal Care"].sort());
    expect(rejected.every(area => area.mgc.length === 0 && area.targetDepartmentId === null)).toBe(true);
  });
});
