import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildCatalogSnapshot } from "./snapshot";
import { calculateCatalogDecisionFactCoverage } from "./coverage";

async function json(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(process.cwd(), relativePath), "utf8")) as unknown;
}

describe("V2 production catalog diagnostic boundary", () => {
  it("keeps v0.55.0 future-effective while the temporal patch is ready on August 16", async () => {
    const oldManifest = await json("data/production/catalog/releases/v0.55.0/manifest.json") as { catalog_payload_hash: string };
    const oldPointer = {
      market: "TR",
      state: "ACTIVE",
      active_catalog_release_version: "0.55.0",
      catalog_payload_hash: oldManifest.catalog_payload_hash,
      activated_at: "2026-08-18T23:00:00.000Z",
      activation_reference: "historical-v0.55.0-pointer-fixture",
      previous_active_release: "0.54.0",
      rollback_release: "0.54.0",
    };
    const oldCatalog = await json("data/production/catalog/releases/v0.55.0/catalog.json");
    const oldDecisionFacets = await json("data/production/catalog/releases/v0.55.0/decision-facets.json");
    expect(buildCatalogSnapshot({ pointer: oldPointer, manifest: oldManifest, catalog: oldCatalog, decisionFacets: oldDecisionFacets, now: new Date("2026-08-16T12:00:00.000Z") }))
      .toMatchObject({ status: "UNAVAILABLE", reason: "NOT_YET_EFFECTIVE" });

    const pointer = await json("data/production/catalog/active.json");
    const manifest = await json("data/production/catalog/releases/v0.55.1/manifest.json");
    const catalog = await json("data/production/catalog/releases/v0.55.1/catalog.json");
    const decisionFacets = await json("data/production/catalog/releases/v0.55.1/decision-facets.json");
    const effective = buildCatalogSnapshot({ pointer, manifest, catalog, decisionFacets, now: new Date("2026-08-16T19:33:14.000Z") });
    expect(effective.status).toBe("READY");
    if (effective.status !== "READY") return;
    expect({ brands: effective.snapshot.brandIndex.size, families: effective.snapshot.familyIndex.size, variants: effective.snapshot.variants.length }).toEqual({ brands: 50, families: 397, variants: 577 });
    const coverage = calculateCatalogDecisionFactCoverage(effective.snapshot);
    expect(coverage.totalVariants).toBe(577);
    expect(coverage.fields.bodyStyle).toBe(577);
    expect(coverage.fields.fuelType).toBe(577);
    expect(coverage.publicPriceObservations + coverage.internalEstimateObservations).toBeGreaterThan(0);
  });
});
