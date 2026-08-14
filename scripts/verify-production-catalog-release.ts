import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ProductionCatalogReleaseManifest, ProductionCatalogReleasePayload } from "@/features/vehicle-data/productionCatalogRelease";
import { FIRST_CATALOG_RELEASE_VERSION, validateProductionCatalogRelease } from "@/features/vehicle-data/productionCatalogRelease";

export async function verifyProductionCatalogRelease(directory = path.resolve("data/production/catalog/releases", `v${FIRST_CATALOG_RELEASE_VERSION}`)) {
  const [catalogBytes, manifestBytes] = await Promise.all([
    readFile(path.join(directory, "catalog.json"), "utf8"), readFile(path.join(directory, "manifest.json"), "utf8"),
  ]);
  const payload = JSON.parse(catalogBytes) as ProductionCatalogReleasePayload;
  const manifest = JSON.parse(manifestBytes) as ProductionCatalogReleaseManifest;
  const errors = validateProductionCatalogRelease(payload, manifest, catalogBytes);
  if (errors.length > 0) throw new Error(`Catalog release verification failed: ${errors.join(",")}`);
  return { version: manifest.catalog_release_version, hash: manifest.catalog_payload_hash, records: manifest.record_count };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const releaseIndex = process.argv.indexOf("--release");
  const release = releaseIndex >= 0 ? process.argv[releaseIndex + 1] : FIRST_CATALOG_RELEASE_VERSION;
  if (!release || !/^\d+\.\d+\.\d+$/.test(release)) throw new Error("INVALID_CATALOG_RELEASE_ARGUMENT");
  verifyProductionCatalogRelease(path.resolve("data/production/catalog/releases", `v${release}`))
    .then((result) => console.log(`Verified catalog release v${result.version}: ${result.records} records, ${result.hash}`));
}
