import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { stagedAlfaRomeoBatch01Records } from "@/data/production/alfaRomeoBatch01";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import { FOURTH_CATALOG_RELEASE_AS_OF, FOURTH_CATALOG_RELEASE_VERSION, createFourthReleaseManifest, createFourthReleasePayload, serializeCanonical, validateProductionCatalogRelease } from "@/features/vehicle-data/productionCatalogRelease";
import { hyundaiReleaseSourceRecords } from "@/scripts/generate-hyundai-production-catalog-release";

export const alfaRomeoReleaseSourceRecords = [...hyundaiReleaseSourceRecords, ...stagedAlfaRomeoBatch01Records];
export const alfaRomeoReleaseDirectory = path.resolve("data/production/catalog/releases", `v${FOURTH_CATALOG_RELEASE_VERSION}`);

export async function generateAlfaRomeoProductionCatalogRelease(destinationDirectory = alfaRomeoReleaseDirectory) {
  const published = buildPublishedCatalog(alfaRomeoReleaseSourceRecords, new Date(FOURTH_CATALOG_RELEASE_AS_OF));
  if (published.rejected.length > 0) throw new Error(`ALFA ROMEO RELEASE BLOCKED: ${JSON.stringify(published.rejected)}`);
  const payload = createFourthReleasePayload(published.records);
  const manifest = createFourthReleaseManifest(payload);
  const catalogBytes = serializeCanonical(payload);
  const manifestBytes = serializeCanonical(manifest);
  const errors = validateProductionCatalogRelease(payload, manifest, catalogBytes);
  if (errors.length > 0) throw new Error(`Release validation failed: ${errors.join(",")}`);
  try {
    const [existingCatalog, existingManifest] = await Promise.all([readFile(path.join(destinationDirectory, "catalog.json"), "utf8"), readFile(path.join(destinationDirectory, "manifest.json"), "utf8")]);
    if (existingCatalog === catalogBytes && existingManifest === manifestBytes) return "already-exists" as const;
    throw new Error(`Immutable release v${FOURTH_CATALOG_RELEASE_VERSION} already exists with different content`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(path.dirname(destinationDirectory), { recursive: true });
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "expiya-alfa-romeo-catalog-release-"));
  try {
    await Promise.all([writeFile(path.join(temporaryDirectory, "catalog.json"), catalogBytes, { encoding: "utf8", flag: "wx" }), writeFile(path.join(temporaryDirectory, "manifest.json"), manifestBytes, { encoding: "utf8", flag: "wx" })]);
    await rename(temporaryDirectory, destinationDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  return "created" as const;
}

if (import.meta.url === `file://${process.argv[1]}`) generateAlfaRomeoProductionCatalogRelease().then((result) => console.log(`Catalog release v${FOURTH_CATALOG_RELEASE_VERSION}: ${result}`));
