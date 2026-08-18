import { describe, expect, it } from "vitest";

import { configuredCarsCatalogMode, resolveRecommendationCatalog, resolveRecommendationCatalogFromRepository } from "@/features/vehicle-data/resolveRecommendationCatalog";
import activeCatalog from "@/data/production/catalog/active.json";
import activeManifest from "@/data/production/catalog/releases/v0.55.2/manifest.json";
import quarantineRegistry from "@/data/production/catalog/releases/v0.55.2/quarantine-registry.json";

describe("resolveRecommendationCatalog", () => {
  it("defaults unknown configuration to the isolated fixture", () => {
    expect(configuredCarsCatalogMode(undefined)).toBe("fixture");
    expect(configuredCarsCatalogMode("unexpected")).toBe("fixture");
  });

  it("requires an explicit production setting", () => {
    expect(configuredCarsCatalogMode("production")).toBe("production");
    const catalog = resolveRecommendationCatalog("production", new Date("2026-08-18T23:00:00.000Z"));
    expect(catalog.cars).toHaveLength(activeManifest.publishable_record_count);
    expect(catalog.cars).toHaveLength(566);
    expect(activeCatalog.rollback_release).toBe(activeCatalog.previous_active_release);
    const activeIds = new Set(catalog.cars.map(({ id }) => id));
    expect(quarantineRegistry.records).toHaveLength(11);
    for (const entry of quarantineRegistry.records) expect(activeIds.has(entry.exactVariantId)).toBe(false);
    expect(catalog.limitations).toEqual([]);
  });

  it("keeps variants in production when price end dates pass", () => {
    const catalog = resolveRecommendationCatalog("production", new Date("2026-09-01T00:00:00.000Z"));
    expect(catalog.cars).toHaveLength(activeManifest.publishable_record_count);
    expect(catalog.cars.some(({ model }) => model.includes("Yaris Cross"))).toBe(true);
    expect(catalog.limitations).toEqual([]);
  });

  it("uses the database repository for production without fixture fallback", async () => {
    const repository = { readPublishedCatalog: async () => ({
      mode: "production" as const, cars: [], identities: [], limitations: ["DATABASE_EMPTY"],
    }) };
    await expect(resolveRecommendationCatalogFromRepository("production", repository))
      .resolves.toEqual({ mode: "production", cars: [], identities: [], limitations: ["DATABASE_EMPTY"] });
  });

  it("propagates production database failures", async () => {
    const repository = { readPublishedCatalog: async () => { throw new Error("database unavailable"); } };
    await expect(resolveRecommendationCatalogFromRepository("production", repository))
      .rejects.toThrow("database unavailable");
  });
});
