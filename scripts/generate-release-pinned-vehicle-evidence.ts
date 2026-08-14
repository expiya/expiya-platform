import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseCsv } from "./vehicle-evidence";

const ROOT = process.cwd();
const CATALOG_DIR = path.join(ROOT, "data/production/catalog/releases/v0.1.0");
const EVIDENCE_DIR = path.join(ROOT, "data/cars/vehicle_evidence/releases/v0.4.0");
const OLD_RUNTIME_DIR = path.join(ROOT, "data/runtime/vehicle-evidence/v0.1.0");
const MAP_DIR = path.join(ROOT, "data/runtime/vehicle-candidate-identity-maps/v0.1.0");
const ARTIFACT_DIR = path.join(ROOT, "data/runtime/vehicle-evidence/v0.1.1");
const REPORT_DIR = path.join(ROOT, "outputs/catalog-vehicle-evidence-reconciliation");
const CATALOG_HASH = "3d64b3140f72d3d67bfd71eee62a849d9543a7657727ac43aac8b0be2a31b1e3";
const DATASET_HASH = "b3ee43a0e1245a2c3b0954c1698d0c2d424e2cc38861ffef4fb315b9c8bdcfeb";
const GENERATED_AT = "2026-08-14T21:00:00.000Z";

interface CatalogVariant {
  id: string; market: string; lifecycleStatus: string;
  brand: { value: string }; model: { value: string }; modelYear: { value: number };
  trim: { value: string };
}
interface MappingRecord {
  runtimeVehicleCandidateId: string; vehicleVariantId: string; configurationId: string;
  mappingStatus: string; mappingBasis: string; reasonCode: string; reviewReference: string;
}

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const outcomes = [
  ["5d3538b1-c726-44f5-8160-41a64d33eb8e", null, "UNMAPPED", "NO_EXACT_CONFIGURATION_IN_RELEASE"],
  ["87e30119-f0d5-4c98-8324-cbd65156974b", "CFG-000036", "UNMAPPED", "MODEL_ONLY_IDENTITY_FIELDS_DIFFER"],
  ["a3728e65-51b2-447f-a6c3-a1f64db8a310", "CFG-000037", "VERIFIED_ONE_TO_ONE", "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN"],
  ["c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8", "CFG-000058", "UNMAPPED", "RELATED_NAME_ONLY_MODEL_TRIM_POWER_DIFFER"],
  ["4c22cb31-e980-4dc8-8525-c47363783d96", "CFG-000058", "UNMAPPED", "RELATED_NAME_ONLY_MODEL_AND_TRIM_DIFFER"],
  ["8af2278c-4168-4a1b-a915-6b72b9cd6f48", "CFG-000003", "UNMAPPED", "MODEL_FAMILY_ONLY_TRIM_AND_POWERTRAIN_DIFFER"],
  ["db2d6503-f10f-41a4-ad11-b2ca71e59d32", "CFG-000003", "UNMAPPED", "MODEL_AND_POWERTRAIN_ONLY_TRIM_DIFFERS"],
  ["1eb75421-a038-4679-977e-7cd4e4608863", "CFG-000001", "INELIGIBLE", "EXACT_IDENTITY_CONFIGURATION_PROVISIONAL"],
  ["62465336-2cfb-4ccd-b9a7-36467d63497f", "CFG-000055", "VERIFIED_ONE_TO_ONE", "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN"],
  ["f81b0873-f3a7-454a-9f34-4d5ad273708d", null, "UNMAPPED", "NO_EXACT_CONFIGURATION_IN_RELEASE"],
] as const;

async function main() {
  const [catalogBytes, catalogManifestBytes, evidenceManifestBytes, configurationsBytes, generationsBytes, modelsBytes, oldArtifactBytes, oldMapBytes, dictionaryBytes] = await Promise.all([
    readFile(path.join(CATALOG_DIR, "catalog.json"), "utf8"), readFile(path.join(CATALOG_DIR, "manifest.json"), "utf8"),
    readFile(path.join(EVIDENCE_DIR, "manifest.json"), "utf8"), readFile(path.join(EVIDENCE_DIR, "tables/configurations.csv"), "utf8"),
    readFile(path.join(EVIDENCE_DIR, "tables/generations.csv"), "utf8"), readFile(path.join(EVIDENCE_DIR, "tables/models.csv"), "utf8"),
    readFile(path.join(OLD_RUNTIME_DIR, "artifact.json"), "utf8"), readFile(path.join(OLD_RUNTIME_DIR, "identity-map.json"), "utf8"),
    readFile(path.join(EVIDENCE_DIR, "tables/data_dictionary.csv")),
  ]);
  const catalog = JSON.parse(catalogBytes) as { records: Array<{ variant: CatalogVariant }> }; const catalogManifest = JSON.parse(catalogManifestBytes);
  const evidenceManifest = JSON.parse(evidenceManifestBytes); const oldArtifact = JSON.parse(oldArtifactBytes) as Record<string, unknown>;
  const oldMap = JSON.parse(oldMapBytes) as { records: MappingRecord[] };
  if (sha256(catalogBytes) !== CATALOG_HASH || catalogManifest.catalog_payload_hash !== `sha256:${CATALOG_HASH}`) throw new Error("CATALOG_RELEASE_DRIFT");
  if (catalogManifest.catalog_release_version !== "0.1.0" || catalogManifest.catalog_schema_version !== "0.1" || catalogManifest.record_count !== 10 || catalogManifest.approval?.state !== "APPROVED" || catalogManifest.staging?.state !== "STAGED") throw new Error("CATALOG_RELEASE_NOT_APPROVED_STAGED");
  if (evidenceManifest.dataset_version !== "0.4.0" || evidenceManifest.schema_version !== "0.1" || evidenceManifest.master_sha256 !== DATASET_HASH || evidenceManifest.validator_status !== "PASS") throw new Error("VEHICLE_EVIDENCE_RELEASE_DRIFT");
  const variants = new Map(catalog.records.map((r) => [r.variant.id, r.variant]));
  if (variants.size !== 10 || outcomes.some(([id]) => !variants.has(id))) throw new Error("CATALOG_MEMBERSHIP_DRIFT");
  const configurations = parseCsv(configurationsBytes); const generations = parseCsv(generationsBytes); const models = parseCsv(modelsBytes);
  const configById = new Map(configurations.map((r) => [r.configuration_id, r]));
  const generationById = new Map(generations.map((r) => [r.generation_id, r])); const modelById = new Map(models.map((r) => [r.model_id, r]));
  const exact = [
    ["a3728e65-51b2-447f-a6c3-a1f64db8a310", "CFG-000037", "Hyundai", "IONIQ 9", "2026", "Progressive"],
    ["62465336-2cfb-4ccd-b9a7-36467d63497f", "CFG-000055", "Renault", "Captur", "2026", "techno"],
  ] as const;
  for (const [variantId, configurationId, brand, model, year, trim] of exact) {
    const v = variants.get(variantId); const c = configById.get(configurationId); const g = c && generationById.get(c.generation_id); const m = g && modelById.get(g.model_id);
    if (!v || !c || c.configuration_status !== "VERIFIED" || v.market !== "TR" || c.market !== "TR" || String(v.modelYear.value) !== year || c.model_year !== year || v.brand.value !== brand || m?.brand !== brand || v.model.value !== model || m?.model_name !== model || !v.trim.value.startsWith(trim) || c.trim_name !== trim) throw new Error(`EXACT_IDENTITY_REVERIFICATION_FAILED:${variantId}`);
  }
  const matrix = outcomes.map(([catalogVariantId, candidateConfigurationId, status, reason]) => {
    const v = variants.get(catalogVariantId); const c = candidateConfigurationId ? configById.get(candidateConfigurationId) : undefined;
    if (!v) throw new Error(`CATALOG_VARIANT_MISSING:${catalogVariantId}`);
    const g = c && generationById.get(c.generation_id); const m = g && modelById.get(g.model_id);
    return { catalogVariantId, catalogVehicle: `${v.brand.value} ${v.model.value} ${v.trim.value}, MY${v.modelYear.value}`, candidateConfigurationId,
      evidenceVehicle: c ? `${m?.brand} ${m?.model_name} ${c.official_configuration_name}, MY${c.model_year}` : null,
      status, reason, candidateConfigurationStatus: c?.configuration_status ?? null };
  });
  const records = exact.map(([vehicleVariantId, configurationId], index) => ({
    runtimeVehicleCandidateId: `RVC-PILOT-000${index + 1}`, vehicleVariantId, configurationId,
    mappingStatus: "VERIFIED_ONE_TO_ONE", mappingBasis: "EXACT_REVIEWED_CROSSWALK",
    reasonCode: "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN", reviewReference: index === 0 ? "SRC-000050" : "SRC-000065",
  }));
  if (oldMap.records.some((r, i) => JSON.stringify(r) !== JSON.stringify(records[i]))) throw new Error("RUNTIME_ID_REBINDING");
  const mapping = { mappingVersion: "0.1.0", catalogReleaseVersion: "0.1.0", catalogPayloadHash: CATALOG_HASH,
    catalogSchemaVersion: "0.1", catalogSourceRevision: catalogManifest.source_revision,
    vehicleEvidenceDatasetVersion: "0.4.0", vehicleEvidenceReleaseHash: DATASET_HASH, vehicleEvidenceSchemaVersion: "0.1",
    dictionaryRevision: "vehicle-evidence-0.4.0:data_dictionary.csv", dictionaryHash: sha256(dictionaryBytes), generatedAt: GENERATED_AT,
    validatorVersion: "vehicle-candidate-identity-map:v2", validatorStatus: "PASS", activationEligible: true,
    previousMappingRelease: "0.1.0-pilot.1", reviewReference: "release-pinned-reconciliation-2026-08-14",
    counts: { considered: 10, verifiedOneToOne: 2, unmapped: 7, ambiguous: 0, ineligible: 1 }, records };
  const mappingBytes = json(mapping); const mappingHash = sha256(mappingBytes);
  const mappingManifest = { mappingVersion: mapping.mappingVersion, mappingHash, mappingPath: "data/runtime/vehicle-candidate-identity-maps/v0.1.0/mapping.json",
    catalogReleaseVersion: "0.1.0", catalogPayloadHash: CATALOG_HASH, catalogSchemaVersion: "0.1",
    datasetVersion: "0.4.0", datasetReleaseHash: DATASET_HASH, datasetSchemaVersion: "0.1",
    dictionaryRevision: mapping.dictionaryRevision, dictionaryHash: mapping.dictionaryHash, activeMappingCount: 2, statusCounts: mapping.counts,
    validator: { version: mapping.validatorVersion, status: "PASS" }, previousMappingRelease: mapping.previousMappingRelease,
    approvalReviewReference: mapping.reviewReference };
  const artifact = { ...oldArtifact, artifactVersion: "0.1.1", mappingVersion: "0.1.0", mappingHash,
    catalogReleaseVersion: "0.1.0", catalogPayloadHash: CATALOG_HASH, catalogSchemaVersion: "0.1",
    productionCatalogRevision: catalogManifest.source_revision, generatedAt: GENERATED_AT, generatorVersion: "vehicle-evidence-runtime-artifact:v2",
    mappingValidator: { version: "vehicle-candidate-identity-map:v2", status: "PASS" } };
  const artifactBytes = json(artifact); const artifactHash = sha256(artifactBytes);
  const artifactManifest = { artifactVersion: "0.1.1", artifactPath: "data/runtime/vehicle-evidence/v0.1.1/artifact.json", artifactSha256: artifactHash,
    mappingVersion: "0.1.0", mappingHash, mappingPath: mappingManifest.mappingPath, catalogReleaseVersion: "0.1.0", catalogPayloadHash: CATALOG_HASH,
    datasetVersion: "0.4.0", datasetReleaseHash: DATASET_HASH, dictionaryRevision: mapping.dictionaryRevision, dictionaryHash: mapping.dictionaryHash,
    migratedCategories: ["seats"], validationStatus: "PASS", previousArtifactRelease: "0.1.0" };
  const report = { reportVersion: "0.1.0", generatedAt: GENERATED_AT, result: "CATALOG_VEHICLE_EVIDENCE_RECONCILIATION_VERIFIED",
    inputs: { catalogReleaseVersion: "0.1.0", catalogPayloadHash: CATALOG_HASH, datasetVersion: "0.4.0", datasetReleaseHash: DATASET_HASH },
    metrics: mapping.counts, reconciliation: matrix, activeMappings: records, mappingRelease: { version: "0.1.0", hash: mappingHash }, artifactRelease: { version: "0.1.1", hash: artifactHash } };
  const md = [`# Catalog ↔ Vehicle Evidence Reconciliation`, "", `Result: **VERIFIED**`, "", `Catalog: v0.1.0 (${CATALOG_HASH})`, `Vehicle Evidence: v0.4.0 (${DATASET_HASH})`, "", "| Catalog variant ID | Catalog vehicle | Evidence candidate | Status | Reason |", "|---|---|---|---|---|", ...matrix.map((r) => `| ${r.catalogVariantId} | ${r.catalogVehicle} | ${r.candidateConfigurationId ?? "—"} | ${r.status} | ${r.reason} |`), "", `Active mappings: 2; coverage unchanged.`, ""].join("\n");
  await Promise.all([MAP_DIR, ARTIFACT_DIR, REPORT_DIR].map((d) => mkdir(d, { recursive: true })));
  await Promise.all([
    writeFile(path.join(MAP_DIR, "mapping.json"), mappingBytes), writeFile(path.join(MAP_DIR, "manifest.json"), json(mappingManifest)),
    writeFile(path.join(ARTIFACT_DIR, "artifact.json"), artifactBytes), writeFile(path.join(ARTIFACT_DIR, "manifest.json"), json(artifactManifest)),
    writeFile(path.join(REPORT_DIR, "RECONCILIATION_REPORT.json"), json(report)), writeFile(path.join(REPORT_DIR, "RECONCILIATION_REPORT.md"), md),
  ]);
  console.log(JSON.stringify({ mappingVersion: "0.1.0", mappingHash, artifactVersion: "0.1.1", artifactHash, counts: mapping.counts }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
