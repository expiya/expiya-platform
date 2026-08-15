import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import { FOURTH_CATALOG_RELEASE_AS_OF, createFourthReleaseManifest, createFourthReleasePayload, serializeCanonical, validateProductionCatalogRelease } from "@/features/vehicle-data/productionCatalogRelease";
import { alfaRomeoReleaseSourceRecords, generateAlfaRomeoProductionCatalogRelease } from "@/scripts/generate-alfa-romeo-production-catalog-release";
import { verifyProductionCatalogRelease } from "@/scripts/verify-production-catalog-release";

const temporaryRoots: string[] = [];
afterEach(async () => Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("Alfa Romeo production catalog release v0.4.0", () => {
  it("publishes 56 records with four Alfa Romeo additions and valid lineage", () => {
    const published = buildPublishedCatalog(alfaRomeoReleaseSourceRecords, new Date(FOURTH_CATALOG_RELEASE_AS_OF));
    expect(published.rejected).toEqual([]);
    const payload = createFourthReleasePayload(published.records);
    const manifest = createFourthReleaseManifest(payload);
    expect(payload.records).toHaveLength(56);
    expect(payload.records.filter(({ variant }) => variant.brand.value === "Alfa Romeo")).toHaveLength(4);
    expect(manifest).toMatchObject({ catalog_release_version: "0.4.0", previous_release: "0.3.0" });
    expect(validateProductionCatalogRelease(payload, manifest, serializeCanonical(payload))).toEqual([]);
  });

  it("generates an immutable, reproducible release", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "alfa-romeo-release-test-"));
    temporaryRoots.push(root);
    const destination = path.join(root, "v0.4.0");
    await expect(generateAlfaRomeoProductionCatalogRelease(destination)).resolves.toBe("created");
    await expect(generateAlfaRomeoProductionCatalogRelease(destination)).resolves.toBe("already-exists");
    await expect(verifyProductionCatalogRelease(destination)).resolves.toMatchObject({ version: "0.4.0", records: 56 });
  });
});
