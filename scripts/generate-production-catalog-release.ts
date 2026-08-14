import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import {
  CATALOG_BOOTSTRAP_INSTANT, FIRST_CATALOG_RELEASE_VERSION, createFirstReleaseManifest,
  createFirstReleasePayload, serializeCanonical, validateProductionCatalogRelease,
} from "@/features/vehicle-data/productionCatalogRelease";

export const releaseDirectory = path.resolve("data/production/catalog/releases", `v${FIRST_CATALOG_RELEASE_VERSION}`);

export async function generateFirstProductionCatalogRelease(
  destinationDirectory = releaseDirectory,
): Promise<"created" | "already-exists"> {
  const published = buildPublishedCatalog(pilotVehicleRecords, new Date(CATALOG_BOOTSTRAP_INSTANT));
  if (published.rejected.length > 0) throw new Error(`FIRST STAGED RELEASE BLOCKED: ${JSON.stringify(published.rejected)}`);
  const payload = createFirstReleasePayload(published.records);
  const manifest = createFirstReleaseManifest(payload);
  const catalogBytes = serializeCanonical(payload);
  const manifestBytes = serializeCanonical(manifest);
  const errors = validateProductionCatalogRelease(payload, manifest, catalogBytes);
  if (errors.length > 0) throw new Error(`Release validation failed: ${errors.join(",")}`);

  try {
    const [existingCatalog, existingManifest] = await Promise.all([
      readFile(path.join(destinationDirectory, "catalog.json"), "utf8"),
      readFile(path.join(destinationDirectory, "manifest.json"), "utf8"),
    ]);
    if (existingCatalog === catalogBytes && existingManifest === manifestBytes) return "already-exists";
    throw new Error(`Immutable release v${FIRST_CATALOG_RELEASE_VERSION} already exists with different content`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  await mkdir(path.dirname(destinationDirectory), { recursive: true });
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "expiya-catalog-release-"));
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
  return "created";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateFirstProductionCatalogRelease().then((result) => console.log(`Catalog release v${FIRST_CATALOG_RELEASE_VERSION}: ${result}`));
}
