import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { stagedAlpineBatch01Records } from "@/data/production/alpineBatch01";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import { FIFTH_CATALOG_RELEASE_AS_OF, FIFTH_CATALOG_RELEASE_VERSION, createFifthReleaseManifest, createFifthReleasePayload, serializeCanonical, validateProductionCatalogRelease } from "@/features/vehicle-data/productionCatalogRelease";
import { alfaRomeoReleaseSourceRecords } from "@/scripts/generate-alfa-romeo-production-catalog-release";

export const alpineReleaseSourceRecords = [...alfaRomeoReleaseSourceRecords, ...stagedAlpineBatch01Records];
export const alpineReleaseDirectory = path.resolve("data/production/catalog/releases", `v${FIFTH_CATALOG_RELEASE_VERSION}`);

export async function generateAlpineProductionCatalogRelease(destinationDirectory = alpineReleaseDirectory) {
  const published = buildPublishedCatalog(alpineReleaseSourceRecords, new Date(FIFTH_CATALOG_RELEASE_AS_OF));
  if (published.rejected.length) throw new Error(`ALPINE RELEASE BLOCKED: ${JSON.stringify(published.rejected)}`);
  const payload = createFifthReleasePayload(published.records); const manifest = createFifthReleaseManifest(payload);
  const catalogBytes = serializeCanonical(payload); const manifestBytes = serializeCanonical(manifest);
  const errors = validateProductionCatalogRelease(payload, manifest, catalogBytes); if (errors.length) throw new Error(`Release validation failed: ${errors.join(",")}`);
  try { const [catalog, existingManifest] = await Promise.all([readFile(path.join(destinationDirectory, "catalog.json"), "utf8"), readFile(path.join(destinationDirectory, "manifest.json"), "utf8")]); if (catalog === catalogBytes && existingManifest === manifestBytes) return "already-exists" as const; throw new Error(`Immutable release v${FIFTH_CATALOG_RELEASE_VERSION} already exists with different content`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  await mkdir(path.dirname(destinationDirectory), { recursive: true }); const temp = await mkdtemp(path.join(tmpdir(), "expiya-alpine-catalog-release-"));
  try { await Promise.all([writeFile(path.join(temp, "catalog.json"), catalogBytes, { encoding: "utf8", flag: "wx" }), writeFile(path.join(temp, "manifest.json"), manifestBytes, { encoding: "utf8", flag: "wx" })]); await rename(temp, destinationDirectory); } catch (error) { await rm(temp, { recursive: true, force: true }); throw error; }
  return "created" as const;
}
if (import.meta.url === `file://${process.argv[1]}`) generateAlpineProductionCatalogRelease().then((result) => console.log(`Catalog release v${FIFTH_CATALOG_RELEASE_VERSION}: ${result}`));
