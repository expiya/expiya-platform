import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (file) => { const bytes = await readFile(path.resolve(file)); return { bytes, value: JSON.parse(bytes) }; };
const catalog = await readJson("data/production/catalog/releases/v0.1.0/catalog.json");
const catalogManifest = (await readJson("data/production/catalog/releases/v0.1.0/manifest.json")).value;
const evidenceManifest = (await readJson("data/cars/vehicle_evidence/releases/v0.4.0/manifest.json")).value;
const mapping = await readJson("data/runtime/vehicle-candidate-identity-maps/v0.1.0/mapping.json");
const mappingManifest = (await readJson("data/runtime/vehicle-candidate-identity-maps/v0.1.0/manifest.json")).value;
const artifact = await readJson("data/runtime/vehicle-evidence/v0.1.1/artifact.json");
const artifactManifest = (await readJson("data/runtime/vehicle-evidence/v0.1.1/manifest.json")).value;

function verifyPins(candidateArtifact, candidateMapping, expectedCatalogHash = hash(catalog.bytes)) {
  if (candidateMapping.catalogReleaseVersion !== catalogManifest.catalog_release_version || candidateMapping.catalogPayloadHash !== expectedCatalogHash) throw new Error("CATALOG_PIN_MISMATCH");
  if (candidateMapping.vehicleEvidenceDatasetVersion !== evidenceManifest.dataset_version || candidateMapping.vehicleEvidenceReleaseHash !== evidenceManifest.master_sha256) throw new Error("DATASET_PIN_MISMATCH");
  if (candidateArtifact.catalogReleaseVersion !== candidateMapping.catalogReleaseVersion || candidateArtifact.catalogPayloadHash !== candidateMapping.catalogPayloadHash) throw new Error("ARTIFACT_CATALOG_PIN_MISMATCH");
  if (candidateArtifact.mappingVersion !== candidateMapping.mappingVersion || candidateArtifact.mappingHash !== hash(mapping.bytes)) throw new Error("ARTIFACT_MAPPING_PIN_MISMATCH");
}

if (hash(catalog.bytes) !== "3d64b3140f72d3d67bfd71eee62a849d9543a7657727ac43aac8b0be2a31b1e3") throw new Error("CATALOG_RELEASE_DRIFT");
if (hash(mapping.bytes) !== mappingManifest.mappingHash || hash(artifact.bytes) !== artifactManifest.artifactSha256) throw new Error("RELEASE_HASH_MISMATCH");
if (mapping.value.records.length !== 2 || mapping.value.counts.ambiguous !== 0 || mapping.value.records.some((r) => r.mappingStatus !== "VERIFIED_ONE_TO_ONE")) throw new Error("MAPPING_NOT_ACTIVATION_ELIGIBLE");
for (const key of ["runtimeVehicleCandidateId", "vehicleVariantId", "configurationId"]) if (new Set(mapping.value.records.map((r) => r[key])).size !== 2) throw new Error(`DUPLICATE_${key}`);
const catalogIds = new Set(catalog.value.records.map((r) => r.variant.id));
if (mapping.value.records.some((r) => !catalogIds.has(r.vehicleVariantId))) throw new Error("CATALOG_RELEASE_ORPHAN");
if (artifact.value.candidates.some((r) => !mapping.value.records.some((m) => m.runtimeVehicleCandidateId === r.runtimeVehicleCandidateId && m.configurationId === r.configurationId))) throw new Error("VEHICLE_EVIDENCE_ORPHAN");
verifyPins(artifact.value, mapping.value);

const expectedFailures = [
  () => verifyPins(artifact.value, { ...mapping.value, catalogReleaseVersion: "bootstrap" }),
  () => verifyPins({ ...artifact.value, mappingVersion: "0.1.0-pilot.1" }, mapping.value),
  () => verifyPins({ ...artifact.value, catalogPayloadHash: "0".repeat(64) }, mapping.value),
  () => verifyPins({ ...artifact.value, mappingHash: "0".repeat(64) }, mapping.value),
];
for (const attempt of expectedFailures) { let failed = false; try { attempt(); } catch { failed = true; } if (!failed) throw new Error("MIXED_REVISION_COMBINATION_ACCEPTED"); }

console.log(`Release-pinned Vehicle Evidence verified: mapping=${mapping.value.mappingVersion}/${hash(mapping.bytes)} artifact=${artifact.value.artifactVersion}/${hash(artifact.bytes)}; mappings=2 ambiguous=0 duplicates=0 orphans=0 mixed-revision-failures=4`);
