import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildModelFamilyIndexes } from "@/features/decision/v2/catalog/familyIndex";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { validateVehiclePersonaSafeTraitRelease, vehiclePersonaSafeTraitManifestSchema, vehiclePersonaSafeTraitPointerSchema, vehiclePersonaSafeTraitReleaseSchema } from "@/features/vehicle-data/vehiclePersonaSafeTraits";

const VERSION = "v1.0.1-catalog-v0.55.0-2026-08-16";
async function main() {
  const root = process.cwd(); const base = path.join(root, "data/production/personas/safe-traits"); const releaseRoot = path.join(base, "releases", VERSION);
  const rawPayload = await readFile(path.join(releaseRoot, "vehicle-persona-safe-traits.json"), "utf8"); const release = vehiclePersonaSafeTraitReleaseSchema.parse(JSON.parse(rawPayload)); const manifest = vehiclePersonaSafeTraitManifestSchema.parse(JSON.parse(await readFile(path.join(releaseRoot, "manifest.json"), "utf8")));
  const catalogPointer = JSON.parse(await readFile(path.join(root, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string; catalog_payload_hash: string };
  const catalog = JSON.parse(await readFile(path.join(root, "data/production/catalog/releases/v0.55.0/catalog.json"), "utf8")) as { records: { variant: { id: string; brand: { value: string }; model: { value: string } } }[] };
  const variants = catalog.records.map(({ variant }) => ({ id: variant.id, brand: variant.brand.value, model: variant.model.value })) as CatalogVariantSnapshot[]; const families = buildModelFamilyIndexes(variants).familyIndex.values().map((family) => ({ familyId: family.familyId, variantIds: family.variantIds }));
  const pointer = vehiclePersonaSafeTraitPointerSchema.parse({ state: "ACTIVE", activeReleaseVersion: VERSION, compatibleCatalogRelease: `v${catalogPointer.active_catalog_release_version}`, compatibleCatalogFingerprint: catalogPointer.catalog_payload_hash, payloadSha256: manifest.payloadSha256, schemaVersion: "1.1.0" });
  const errors = validateVehiclePersonaSafeTraitRelease({ release, manifest, pointer, rawPayload, catalogRelease: `v${catalogPointer.active_catalog_release_version}`, catalogFingerprint: catalogPointer.catalog_payload_hash, catalogVariantIds: variants.map((variant) => variant.id), catalogFamilies: families });
  if (errors.length) throw new Error(`APPROVED_RELEASE_ACTIVATION_BLOCKED:${errors.join(",")}`);
  await writeFile(path.join(base, "active.json"), `${JSON.stringify(pointer, null, 2)}\n`, "utf8"); console.log(JSON.stringify({ status: "ACTIVATED", version: VERSION, payloadSha256: manifest.payloadSha256 }));
}
void main();
