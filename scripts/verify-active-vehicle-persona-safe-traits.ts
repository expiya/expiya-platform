import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildModelFamilyIndexes } from "@/features/decision/v2/catalog/familyIndex";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { loadActiveVehiclePersonaSafeTraits } from "@/features/vehicle-data/vehiclePersonaSafeTraits.server";

async function main(): Promise<void> {
  const root = process.cwd();
  const pointer = JSON.parse(await readFile(path.join(root, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string; catalog_payload_hash: string };
  const catalog = JSON.parse(await readFile(path.join(root, `data/production/catalog/releases/v${pointer.active_catalog_release_version}/catalog.json`), "utf8")) as { records: { variant: { id: string; brand: { value: string }; model: { value: string } } }[] };
  const variants = catalog.records.map(({ variant }) => ({ id: variant.id, brand: variant.brand.value, model: variant.model.value })) as CatalogVariantSnapshot[];
  const families = buildModelFamilyIndexes(variants).familyIndex.values();
  const result = await loadActiveVehiclePersonaSafeTraits({
    repositoryRoot: root, catalogRelease: `v${pointer.active_catalog_release_version}`, catalogFingerprint: pointer.catalog_payload_hash,
    catalogVariantIds: variants.map((variant) => variant.id), catalogFamilies: families.map((family) => ({ familyId: family.familyId, variantIds: family.variantIds })),
  });
  if (result.status !== "READY") throw new Error(`ACTIVE_SAFE_PERSONA_INVALID:${result.errors.join(",")}`);
  console.log(JSON.stringify({ status: "PASS", releaseVersion: result.release.releaseVersion, familyCount: result.release.families.length, variantCount: result.release.variants.length, payloadSha256: result.manifest.payloadSha256 }));
}
void main();
