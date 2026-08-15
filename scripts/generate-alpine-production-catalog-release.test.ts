import { mkdtemp, rm } from "node:fs/promises"; import { tmpdir } from "node:os"; import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import { FIFTH_CATALOG_RELEASE_AS_OF, createFifthReleaseManifest, createFifthReleasePayload, serializeCanonical, validateProductionCatalogRelease } from "@/features/vehicle-data/productionCatalogRelease";
import { alpineReleaseSourceRecords, generateAlpineProductionCatalogRelease } from "@/scripts/generate-alpine-production-catalog-release";
import { verifyProductionCatalogRelease } from "@/scripts/verify-production-catalog-release";
const roots: string[] = []; afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
describe("Alpine production catalog release v0.5.0", () => {
  it("publishes 58 records with two Alpine additions and valid lineage", () => { const published = buildPublishedCatalog(alpineReleaseSourceRecords, new Date(FIFTH_CATALOG_RELEASE_AS_OF)); expect(published.rejected).toEqual([]); const payload = createFifthReleasePayload(published.records); const manifest = createFifthReleaseManifest(payload); expect(payload.records).toHaveLength(58); expect(payload.records.filter(({ variant }) => variant.brand.value === "Alpine")).toHaveLength(2); expect(manifest).toMatchObject({ catalog_release_version: "0.5.0", previous_release: "0.4.0" }); expect(validateProductionCatalogRelease(payload, manifest, serializeCanonical(payload))).toEqual([]); });
  it("generates an immutable reproducible release", async () => { const root = await mkdtemp(path.join(tmpdir(), "alpine-release-test-")); roots.push(root); const destination = path.join(root, "v0.5.0"); await expect(generateAlpineProductionCatalogRelease(destination)).resolves.toBe("created"); await expect(generateAlpineProductionCatalogRelease(destination)).resolves.toBe("already-exists"); await expect(verifyProductionCatalogRelease(destination)).resolves.toMatchObject({ version: "0.5.0", records: 58 }); });
});
