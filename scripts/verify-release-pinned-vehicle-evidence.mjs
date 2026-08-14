import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const readJson = async (f) => { const bytes = await readFile(path.resolve(f)); return { bytes, value: JSON.parse(bytes) }; };
const catalog = await readJson("data/production/catalog/releases/v0.2.0/catalog.json");
const cm = (await readJson("data/production/catalog/releases/v0.2.0/manifest.json")).value;
const em = (await readJson("data/cars/vehicle_evidence/releases/v0.4.1/manifest.json")).value;
const mapping = await readJson("data/runtime/vehicle-candidate-identity-maps/v0.2.1/mapping.json");
const mm = (await readJson("data/runtime/vehicle-candidate-identity-maps/v0.2.1/manifest.json")).value;
const artifact = await readJson("data/runtime/vehicle-evidence/v0.3.0/artifact.json");
const am = (await readJson("data/runtime/vehicle-evidence/v0.3.0/manifest.json")).value;
const dictionaryHash = hash(await readFile("data/cars/vehicle_evidence/releases/v0.4.1/tables/data_dictionary.csv"));
function verifyPins(a, m) {
  if (m.catalogReleaseVersion !== cm.catalog_release_version || m.catalogPayloadHash !== hash(catalog.bytes)) throw new Error("CATALOG_PIN_MISMATCH");
  if (m.vehicleEvidenceDatasetVersion !== em.dataset_version || m.vehicleEvidenceReleaseHash !== em.master_sha256) throw new Error("DATASET_PIN_MISMATCH");
  if (m.dictionaryHash !== dictionaryHash || a.dictionaryHash !== dictionaryHash) throw new Error("DICTIONARY_PIN_MISMATCH");
  if (a.catalogReleaseVersion !== m.catalogReleaseVersion || a.catalogPayloadHash !== m.catalogPayloadHash) throw new Error("ARTIFACT_CATALOG_PIN_MISMATCH");
  if (a.mappingVersion !== m.mappingVersion || a.mappingHash !== hash(mapping.bytes)) throw new Error("ARTIFACT_MAPPING_PIN_MISMATCH");
}
if (hash(catalog.bytes) !== "393b548307e9e117415a4c54bf0d3d8c3f734f33518ed5bd5cd37be5158c18ba" || hash(mapping.bytes) !== mm.mappingHash || hash(artifact.bytes) !== am.artifactSha256) throw new Error("RELEASE_HASH_MISMATCH");
if (mapping.value.records.length !== 5 || mapping.value.counts.ambiguous !== 0 || mapping.value.records.some((r) => r.mappingStatus !== "VERIFIED_ONE_TO_ONE")) throw new Error("MAPPING_NOT_ACTIVATION_ELIGIBLE");
for (const key of ["runtimeVehicleCandidateId", "vehicleVariantId", "configurationId"]) if (new Set(mapping.value.records.map((r) => r[key])).size !== 5) throw new Error(`DUPLICATE_${key}`);
const catalogIds = new Set(catalog.value.records.map((r) => r.variant.id));
if (mapping.value.records.some((r) => !catalogIds.has(r.vehicleVariantId))) throw new Error("CATALOG_RELEASE_ORPHAN");
if (artifact.value.candidates.length !== 5 || artifact.value.policy.migratedCategories.join() !== "seats,cargo_volume_l" || artifact.value.candidates.some((r) => !mapping.value.records.some((m) => m.runtimeVehicleCandidateId === r.runtimeVehicleCandidateId && m.vehicleVariantId === r.vehicleVariantId && m.configurationId === r.configurationId))) throw new Error("ARTIFACT_MEMBERSHIP_OR_SCOPE_MISMATCH");
verifyPins(artifact.value, mapping.value);
const oldMapping = (await readJson("data/runtime/vehicle-candidate-identity-maps/v0.2.0/mapping.json")).value;
if (JSON.stringify(mapping.value.records) !== JSON.stringify(oldMapping.records)) throw new Error("RUNTIME_ID_REBINDING");
const attempts = [
  () => verifyPins(artifact.value, { ...mapping.value, catalogReleaseVersion: "0.1.0" }),
  () => verifyPins(artifact.value, oldMapping),
  () => verifyPins({ ...artifact.value, mappingVersion: "0.1.0", mappingHash: oldMapping.mappingHash }, mapping.value),
  () => verifyPins({ ...artifact.value, catalogReleaseVersion: "0.1.0" }, mapping.value),
  () => verifyPins(artifact.value, { ...mapping.value, vehicleEvidenceReleaseHash: "0".repeat(64) }),
  () => verifyPins({ ...artifact.value, dictionaryHash: "0".repeat(64) }, mapping.value),
];
for (const attempt of attempts) { let failed = false; try { attempt(); } catch { failed = true; } if (!failed) throw new Error("MIXED_REVISION_COMBINATION_ACCEPTED"); }
console.log(`Release-pinned Vehicle Evidence verified: mapping=${mapping.value.mappingVersion}/${hash(mapping.bytes)} artifact=${artifact.value.artifactVersion}/${hash(artifact.bytes)}; mappings=5 ambiguous=0 duplicates=0 orphans=0 mixed-revision-failures=${attempts.length}`);
