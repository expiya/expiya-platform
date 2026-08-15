import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  validateProductionCatalogActivation,
  validateProductionCatalogRelease,
  type ProductionCatalogActivation,
  type ProductionCatalogReleaseManifest,
  type ProductionCatalogReleasePayload,
} from "@/features/vehicle-data/productionCatalogRelease";

async function main(): Promise<void> {
  const root = process.cwd();
  const activation = JSON.parse(await readFile(path.join(root, "data/production/catalog/active.json"), "utf8")) as ProductionCatalogActivation;
  const releaseDir = path.join(root, "data/production/catalog/releases", `v${activation.active_catalog_release_version}`);
  const payloadBytes = await readFile(path.join(releaseDir, "catalog.json"), "utf8");
  const payload = JSON.parse(payloadBytes) as ProductionCatalogReleasePayload;
  const manifest = JSON.parse(await readFile(path.join(releaseDir, "manifest.json"), "utf8")) as ProductionCatalogReleaseManifest;
  const errors = [
    ...validateProductionCatalogRelease(payload, manifest, payloadBytes),
    ...validateProductionCatalogActivation(activation, manifest),
  ];
  if (errors.length > 0) throw new Error(`ACTIVE_PRODUCTION_CATALOG_INVALID:${errors.join(",")}`);
  console.log(JSON.stringify({
    status: "PASS",
    market: activation.market,
    activeCatalogReleaseVersion: activation.active_catalog_release_version,
    recordCount: payload.records.length,
    catalogPayloadHash: activation.catalog_payload_hash,
    rollbackRelease: activation.rollback_release,
  }));
}

void main();
