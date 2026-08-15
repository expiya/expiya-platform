import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { stagedHyundaiBatch01Records } from "@/data/production/hyundaiBatch01";
import { stagedHyundaiBatch01ElectrifiedRecords } from "@/data/production/hyundaiBatch01Electrified";
import { CORRECTED_TUCSON_VARIANT_ID, stagedHyundaiBatch01TucsonRecords } from "@/data/production/hyundaiBatch01Tucson";
import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { stagedCatalogBatch01Records } from "@/data/production/stagedCatalogBatch01";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import { THIRD_CATALOG_RELEASE_AS_OF, THIRD_CATALOG_RELEASE_VERSION, createThirdReleaseManifest, createThirdReleasePayload, serializeCanonical, validateProductionCatalogRelease } from "@/features/vehicle-data/productionCatalogRelease";

const refreshedIds = new Set([CORRECTED_TUCSON_VARIANT_ID, "87e30119-f0d5-4c98-8324-cbd65156974b", "a3728e65-51b2-447f-a6c3-a1f64db8a310"]);
export const hyundaiReleaseSourceRecords = [
  ...pilotVehicleRecords.filter((record) => !refreshedIds.has(record.identity.id)),
  ...stagedCatalogBatch01Records,
  ...stagedHyundaiBatch01Records,
  ...stagedHyundaiBatch01ElectrifiedRecords,
  ...stagedHyundaiBatch01TucsonRecords,
];

export const hyundaiReleaseDirectory = path.resolve("data/production/catalog/releases", `v${THIRD_CATALOG_RELEASE_VERSION}`);

export async function generateHyundaiProductionCatalogRelease(destinationDirectory = hyundaiReleaseDirectory) {
  const published = buildPublishedCatalog(hyundaiReleaseSourceRecords, new Date(THIRD_CATALOG_RELEASE_AS_OF));
  if (published.rejected.length > 0) throw new Error(`HYUNDAI RELEASE BLOCKED: ${JSON.stringify(published.rejected)}`);
  const payload = createThirdReleasePayload(published.records);
  const manifest = createThirdReleaseManifest(payload);
  const catalogBytes = serializeCanonical(payload);
  const manifestBytes = serializeCanonical(manifest);
  const errors = validateProductionCatalogRelease(payload, manifest, catalogBytes);
  if (errors.length > 0) throw new Error(`Release validation failed: ${errors.join(",")}`);
  try {
    const [existingCatalog, existingManifest] = await Promise.all([readFile(path.join(destinationDirectory, "catalog.json"), "utf8"), readFile(path.join(destinationDirectory, "manifest.json"), "utf8")]);
    if (existingCatalog === catalogBytes && existingManifest === manifestBytes) return "already-exists" as const;
    throw new Error(`Immutable release v${THIRD_CATALOG_RELEASE_VERSION} already exists with different content`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(path.dirname(destinationDirectory), { recursive: true });
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "expiya-hyundai-catalog-release-"));
  try {
    await Promise.all([writeFile(path.join(temporaryDirectory, "catalog.json"), catalogBytes, { encoding: "utf8", flag: "wx" }), writeFile(path.join(temporaryDirectory, "manifest.json"), manifestBytes, { encoding: "utf8", flag: "wx" })]);
    await rename(temporaryDirectory, destinationDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  return "created" as const;
}

if (import.meta.url === `file://${process.argv[1]}`) generateHyundaiProductionCatalogRelease().then((result) => console.log(`Catalog release v${THIRD_CATALOG_RELEASE_VERSION}: ${result}`));
