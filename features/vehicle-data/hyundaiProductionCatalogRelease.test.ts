import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import { THIRD_CATALOG_RELEASE_AS_OF, createThirdReleaseManifest, createThirdReleasePayload, serializeCanonical, validateProductionCatalogRelease } from "@/features/vehicle-data/productionCatalogRelease";
import { generateHyundaiProductionCatalogRelease, hyundaiReleaseSourceRecords } from "@/scripts/generate-hyundai-production-catalog-release";
import { verifyProductionCatalogRelease } from "@/scripts/verify-production-catalog-release";
import activeCatalogPointer from "@/data/production/catalog/active.json";
import activeCatalogManifest from "@/data/production/catalog/releases/v0.12.0/manifest.json";
import { resolveRecommendationCatalog } from "@/features/vehicle-data/resolveRecommendationCatalog";
import { validateProductionCatalogActivation, type ProductionCatalogActivation, type ProductionCatalogReleaseManifest } from "@/features/vehicle-data/productionCatalogRelease";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("Hyundai catalog expansion release v0.3.0", () => {
  it("publishes 52 unique records and supersedes the conflicted TUCSON fact", () => {
    const published = buildPublishedCatalog(hyundaiReleaseSourceRecords, new Date(THIRD_CATALOG_RELEASE_AS_OF));
    expect(published.rejected).toEqual([]);
    const payload = createThirdReleasePayload(published.records);
    const manifest = createThirdReleaseManifest(payload);
    expect(payload.records).toHaveLength(52);
    expect(payload.records.filter(({ variant }) => variant.brand.value === "Hyundai")).toHaveLength(42);
    const tucson = payload.records.find(({ variant }) => variant.id === "5d3538b1-c726-44f5-8160-41a64d33eb8e");
    expect(tucson?.variant.powertrain.powerKw.value).toBe(132.4);
    expect(validateProductionCatalogRelease(payload, manifest, serializeCanonical(payload))).toEqual([]);
  });

  it("generates and verifies immutably", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "hyundai-release-test-")); roots.push(root);
    const destination = path.join(root, "v0.3.0");
    await expect(generateHyundaiProductionCatalogRelease(destination)).resolves.toBe("created");
    await expect(generateHyundaiProductionCatalogRelease(destination)).resolves.toBe("already-exists");
    await expect(verifyProductionCatalogRelease(destination)).resolves.toMatchObject({ version: "0.3.0", records: 52 });
  });

  it("remains present after the active catalog advances to the Citroën commercial release", () => {
    expect(validateProductionCatalogActivation(activeCatalogPointer as ProductionCatalogActivation, activeCatalogManifest as unknown as ProductionCatalogReleaseManifest)).toEqual([]);
    expect(resolveRecommendationCatalog("production", new Date("2026-09-01T01:00:00.000Z")).cars).toHaveLength(155);
  });
});
