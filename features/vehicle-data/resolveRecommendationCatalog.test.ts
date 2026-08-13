import { describe, expect, it } from "vitest";

import { configuredCarsCatalogMode, resolveRecommendationCatalog } from "@/features/vehicle-data/resolveRecommendationCatalog";

describe("resolveRecommendationCatalog", () => {
  it("defaults unknown configuration to the isolated fixture", () => {
    expect(configuredCarsCatalogMode(undefined)).toBe("fixture");
    expect(configuredCarsCatalogMode("unexpected")).toBe("fixture");
  });

  it("requires an explicit production setting", () => {
    expect(configuredCarsCatalogMode("production")).toBe("production");
    const catalog = resolveRecommendationCatalog("production", new Date("2026-08-13T12:00:00.000Z"));
    expect(catalog.cars).toHaveLength(5);
    expect(catalog.limitations).toEqual([]);
  });

  it("does not fall back to fixtures when campaign observations expire", () => {
    const catalog = resolveRecommendationCatalog("production", new Date("2026-09-01T00:00:00.000Z"));
    expect(catalog.cars).toHaveLength(2);
    expect(catalog.cars[0].model).toContain("Yaris");
    expect(catalog.limitations).toHaveLength(3);
  });
});
