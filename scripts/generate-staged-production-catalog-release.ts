import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { stagedCatalogBatch01Records } from "@/data/production/stagedCatalogBatch01";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import {
  SECOND_CATALOG_RELEASE_AS_OF, SECOND_CATALOG_RELEASE_VERSION, createSecondReleaseManifest,
  createSecondReleasePayload, serializeCanonical, validateProductionCatalogRelease,
} from "@/features/vehicle-data/productionCatalogRelease";

export const stagedReleaseDirectory = path.resolve("data/production/catalog/releases", `v${SECOND_CATALOG_RELEASE_VERSION}`);

export async function generateStagedProductionCatalogRelease(destinationDirectory = stagedReleaseDirectory) {
  const records = [...pilotVehicleRecords, ...stagedCatalogBatch01Records];
  const published = buildPublishedCatalog(records, new Date(SECOND_CATALOG_RELEASE_AS_OF));
  if (published.rejected.length > 0) throw new Error(`STAGED RELEASE BLOCKED: ${JSON.stringify(published.rejected)}`);
  const payload = createSecondReleasePayload(published.records);
  const manifest = createSecondReleaseManifest(payload);
  const catalogBytes = serializeCanonical(payload);
  const manifestBytes = serializeCanonical(manifest);
  const errors = validateProductionCatalogRelease(payload, manifest, catalogBytes);
  if (errors.length > 0) throw new Error(`Release validation failed: ${errors.join(",")}`);

  try {
    const [existingCatalog, existingManifest] = await Promise.all([
      readFile(path.join(destinationDirectory, "catalog.json"), "utf8"),
      readFile(path.join(destinationDirectory, "manifest.json"), "utf8"),
    ]);
    if (existingCatalog === catalogBytes && existingManifest === manifestBytes) return "already-exists" as const;
    throw new Error(`Immutable release v${SECOND_CATALOG_RELEASE_VERSION} already exists with different content`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  await mkdir(path.dirname(destinationDirectory), { recursive: true });
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "expiya-staged-catalog-release-"));
  try {
    await Promise.all([
      writeFile(path.join(temporaryDirectory, "catalog.json"), catalogBytes, { encoding: "utf8", flag: "wx" }),
      writeFile(path.join(temporaryDirectory, "manifest.json"), manifestBytes, { encoding: "utf8", flag: "wx" }),
    ]);
    await rename(temporaryDirectory, destinationDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  return "created" as const;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateStagedProductionCatalogRelease().then((result) => console.log(`Catalog release v${SECOND_CATALOG_RELEASE_VERSION}: ${result}`));
}
