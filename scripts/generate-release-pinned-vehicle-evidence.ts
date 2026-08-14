import { createHash } from "node:crypto";
/* eslint-disable @typescript-eslint/no-explicit-any -- release generator validates untrusted JSON/CSV authority fields explicitly below */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./vehicle-evidence";

const ROOT = process.cwd();
const CATALOG_DIR = path.join(ROOT, "data/production/catalog/releases/v0.2.0");
const EVIDENCE_DIR = path.join(ROOT, "data/cars/vehicle_evidence/releases/v0.4.1");
const OLD_MAP = path.join(ROOT, "data/runtime/vehicle-candidate-identity-maps/v0.2.0/mapping.json");
const MAP_DIR = path.join(ROOT, "data/runtime/vehicle-candidate-identity-maps/v0.2.1");
const ARTIFACT_DIR = path.join(ROOT, "data/runtime/vehicle-evidence/v0.3.0");
const REPORT_DIR = path.join(ROOT, "outputs/catalog-vehicle-evidence-reconciliation-v020");
const CATALOG_HASH = "393b548307e9e117415a4c54bf0d3d8c3f734f33518ed5bd5cd37be5158c18ba";
const DATASET_HASH = "910507ec41cbb82a16a7b5ab31e37e0275c8d868a0c0baeb8275f0d29d18a7de";
const GENERATED_AT = "2026-08-15T00:00:00.000Z";
const sha256 = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

type Status = "VERIFIED_ONE_TO_ONE" | "UNMAPPED" | "INELIGIBLE" | "AMBIGUOUS";
const outcomes: Record<string, { configurationId: string | null; status: Status; reason: string }> = {
  "5d3538b1-c726-44f5-8160-41a64d33eb8e": { configurationId: null, status: "UNMAPPED", reason: "NO_EXACT_CONFIGURATION_IN_RELEASE" },
  "87e30119-f0d5-4c98-8324-cbd65156974b": { configurationId: "CFG-000036", status: "UNMAPPED", reason: "MODEL_ONLY_IDENTITY_FIELDS_DIFFER" },
  "a3728e65-51b2-447f-a6c3-a1f64db8a310": { configurationId: "CFG-000037", status: "VERIFIED_ONE_TO_ONE", reason: "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN" },
  "c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8": { configurationId: "CFG-000058", status: "UNMAPPED", reason: "RELATED_NAME_ONLY_MODEL_TRIM_POWER_DIFFER" },
  "4c22cb31-e980-4dc8-8525-c47363783d96": { configurationId: "CFG-000058", status: "UNMAPPED", reason: "RELATED_NAME_ONLY_MODEL_AND_TRIM_DIFFER" },
  "8af2278c-4168-4a1b-a915-6b72b9cd6f48": { configurationId: "CFG-000003", status: "UNMAPPED", reason: "MODEL_FAMILY_ONLY_TRIM_AND_POWERTRAIN_DIFFER" },
  "db2d6503-f10f-41a4-ad11-b2ca71e59d32": { configurationId: "CFG-000003", status: "UNMAPPED", reason: "MODEL_AND_POWERTRAIN_ONLY_TRIM_DIFFERS" },
  "1eb75421-a038-4679-977e-7cd4e4608863": { configurationId: "CFG-000001", status: "INELIGIBLE", reason: "EXACT_IDENTITY_CONFIGURATION_PROVISIONAL" },
  "62465336-2cfb-4ccd-b9a7-36467d63497f": { configurationId: "CFG-000055", status: "VERIFIED_ONE_TO_ONE", reason: "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN" },
  "f81b0873-f3a7-454a-9f34-4d5ad273708d": { configurationId: null, status: "UNMAPPED", reason: "NO_EXACT_CONFIGURATION_IN_RELEASE" },
  "e3248126-f374-44ff-9dbe-5378ab308a02": { configurationId: "CFG-000058", status: "VERIFIED_ONE_TO_ONE", reason: "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN" },
  "01a559dd-917f-4f49-a4cf-84fe78e9de40": { configurationId: "CFG-000054", status: "VERIFIED_ONE_TO_ONE", reason: "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN" },
  "06d935f4-6d33-4bc7-9e89-375b8db885df": { configurationId: "CFG-000063", status: "VERIFIED_ONE_TO_ONE", reason: "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN" },
};
const activeOrder = [
  ["RVC-PILOT-0001", "a3728e65-51b2-447f-a6c3-a1f64db8a310", "CFG-000037", "SRC-000050"],
  ["RVC-PILOT-0002", "62465336-2cfb-4ccd-b9a7-36467d63497f", "CFG-000055", "SRC-000065"],
  ["RVC-PILOT-0003", "e3248126-f374-44ff-9dbe-5378ab308a02", "CFG-000058", "SRC-000068"],
  ["RVC-PILOT-0004", "01a559dd-917f-4f49-a4cf-84fe78e9de40", "CFG-000054", "SRC-000064"],
  ["RVC-PILOT-0005", "06d935f4-6d33-4bc7-9e89-375b8db885df", "CFG-000063", "SRC-000073"],
] as const;

async function main() {
  const names = ["configurations", "generations", "models", "powertrains", "evidence_facts", "assertions"] as const;
  const [catalogBytes, catalogManifestBytes, evidenceManifestBytes, dictionaryBytes, oldMapBytes, ...csvBytes] = await Promise.all([
    readFile(path.join(CATALOG_DIR, "catalog.json"), "utf8"), readFile(path.join(CATALOG_DIR, "manifest.json"), "utf8"),
    readFile(path.join(EVIDENCE_DIR, "manifest.json"), "utf8"), readFile(path.join(EVIDENCE_DIR, "tables/data_dictionary.csv")), readFile(OLD_MAP, "utf8"),
    ...names.map((n) => readFile(path.join(EVIDENCE_DIR, `tables/${n}.csv`), "utf8")),
  ]);
  const catalog = JSON.parse(catalogBytes); const cm = JSON.parse(catalogManifestBytes); const em = JSON.parse(evidenceManifestBytes); const oldMap = JSON.parse(oldMapBytes);
  if (sha256(catalogBytes) !== CATALOG_HASH || cm.catalog_payload_hash !== `sha256:${CATALOG_HASH}` || cm.catalog_release_version !== "0.2.0" || cm.catalog_schema_version !== "0.1" || cm.record_count !== 13 || cm.approval?.state !== "APPROVED" || cm.staging?.state !== "STAGED") throw new Error("CATALOG_RELEASE_DRIFT");
  if (em.dataset_version !== "0.4.1" || em.schema_version !== "0.1" || em.master_sha256 !== DATASET_HASH || em.validator_status !== "PASS") throw new Error("VEHICLE_EVIDENCE_RELEASE_DRIFT");
  const tables = Object.fromEntries(names.map((n, i) => [n, parseCsv(csvBytes[i])]));
  const variants = new Map(catalog.records.map((r: any) => [r.variant.id, r.variant]));
  if (variants.size !== 13 || Object.keys(outcomes).length !== 13 || Object.keys(outcomes).some((id) => !variants.has(id))) throw new Error("CATALOG_MEMBERSHIP_DRIFT");
  const by = (rows: any[], key: string) => new Map(rows.map((r) => [r[key], r]));
  const configs = by(tables.configurations, "configuration_id"), generations = by(tables.generations, "generation_id"), models = by(tables.models, "model_id"), powertrains = by(tables.powertrains, "powertrain_id");
  const exactExpected: Record<string, any> = {
    "a3728e65-51b2-447f-a6c3-a1f64db8a310": ["Hyundai", "IONIQ 9", "SUV", "2026", "Progressive", "ELECTRIC", "BEV", "SINGLE_SPEED", "RWD"],
    "62465336-2cfb-4ccd-b9a7-36467d63497f": ["Renault", "Captur", "SUV", "2026", "techno", "PETROL", "MHEV", "DCT", "FWD"],
    "e3248126-f374-44ff-9dbe-5378ab308a02": ["Toyota", "Yaris Cross", "SUV", "2026", "Hybrid Dream", "PETROL", "HEV", "E_CVT", "FWD"],
    "01a559dd-917f-4f49-a4cf-84fe78e9de40": ["Opel", "Corsa", "HATCHBACK", "2026", "GS", "PETROL", "MHEV", "DCT", "FWD"],
    "06d935f4-6d33-4bc7-9e89-375b8db885df": ["BMW", "320i Sedan", "SEDAN", "2026", "M Sport", "PETROL", "NONE", "AUTOMATIC", "RWD"],
  };
  for (const [id, expected] of Object.entries(exactExpected)) {
    const outcome = outcomes[id], c = configs.get(outcome.configurationId), g = generations.get(c?.generation_id), m = models.get(g?.model_id), p = powertrains.get(c?.powertrain_id);
    const actual = [m?.brand, m?.model_name, m?.body_family, c?.model_year, c?.trim_name, p?.fuel_type, p?.electrification_type, p?.transmission_type, p?.drivetrain];
    if (c?.market !== "TR" || c?.configuration_status !== "VERIFIED" || JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`EXACT_IDENTITY_REVERIFICATION_FAILED:${id}:${JSON.stringify(actual)}`);
    const v: any = variants.get(id); if (v.market !== "TR" || String(v.modelYear.value) !== c.model_year) throw new Error(`CATALOG_IDENTITY_REVERIFICATION_FAILED:${id}`);
  }
  const records = activeOrder.map(([runtimeVehicleCandidateId, vehicleVariantId, configurationId, reviewReference]) => ({ runtimeVehicleCandidateId, vehicleVariantId, configurationId, mappingStatus: "VERIFIED_ONE_TO_ONE", mappingBasis: "EXACT_REVIEWED_CROSSWALK", reasonCode: "EXACT_MARKET_MODEL_YEAR_TRIM_POWERTRAIN", reviewReference }));
  if (JSON.stringify(oldMap.records) !== JSON.stringify(records)) throw new Error("RUNTIME_ID_REBINDING");
  const counts = { considered: 13, verifiedOneToOne: 5, unmapped: 7, ambiguous: 0, ineligible: 1 };
  const mapping: any = { mappingVersion: "0.2.1", catalogReleaseVersion: "0.2.0", catalogPayloadHash: CATALOG_HASH, catalogSchemaVersion: "0.1", catalogSourceRevision: cm.source_revision, vehicleEvidenceDatasetVersion: "0.4.1", vehicleEvidenceReleaseHash: DATASET_HASH, vehicleEvidenceSchemaVersion: "0.1", dictionaryRevision: "vehicle-evidence-0.4.1:data_dictionary.csv", dictionaryHash: sha256(dictionaryBytes), generatedAt: GENERATED_AT, validatorVersion: "vehicle-candidate-identity-map:v4", validatorStatus: "PASS", activationEligible: true, previousMappingRelease: "0.2.0", reviewReference: "vehicle-evidence-v0.4.1-compatible-pin-2026-08-15", counts, records };
  const mappingBytes = json(mapping), mappingHash = sha256(mappingBytes);
  const mappingManifest = { mappingVersion: "0.2.1", mappingHash, mappingPath: "data/runtime/vehicle-candidate-identity-maps/v0.2.1/mapping.json", catalogReleaseVersion: "0.2.0", catalogPayloadHash: CATALOG_HASH, catalogSchemaVersion: "0.1", datasetVersion: "0.4.1", datasetReleaseHash: DATASET_HASH, datasetSchemaVersion: "0.1", dictionaryRevision: mapping.dictionaryRevision, dictionaryHash: mapping.dictionaryHash, activeMappingCount: 5, statusCounts: counts, validator: { version: mapping.validatorVersion, status: "PASS" }, previousMappingRelease: "0.2.0", approvalReviewReference: mapping.reviewReference };
  const assertionsByFact = new Map<string, any[]>(); for (const a of tables.assertions) assertionsByFact.set(a.evidence_id, [...(assertionsByFact.get(a.evidence_id) ?? []), a]);
  const factsFor = (configurationId: string, key: string) => { const c = configs.get(configurationId); const subjects = new Set([configurationId, c.powertrain_id, c.generation_id]); return tables.evidence_facts.filter((f: any) => subjects.has(f.subject_id) && f.fact_key === key && f.evidence_state === "VERIFIED"); };
  const categoryCoverage: Record<string, any> = {};
  for (const key of ["cargo_volume_l", "ground_clearance_mm", "official_fuel_consumption_combined"]) categoryCoverage[key] = records.map((r) => ({ runtimeVehicleCandidateId: r.runtimeVehicleCandidateId, configurationId: r.configurationId, verifiedExact: factsFor(r.configurationId, key).some((f: any) => (assertionsByFact.get(f.fact_id) ?? []).some((a) => a.verification_status === "VERIFIED" && a.applicability_status === "EXACT")) }));
  const resolveFact = (configurationId: string, key: "seats" | "cargo_volume_l") => {
    const matches = factsFor(configurationId, key);
    if (matches.length > 1) throw new Error(`CONFLICTING_FACT:${configurationId}:${key}`);
    const f = matches[0];
    if (!f) return { status: "MISSING", assertionIds: [], sourceIds: [], limitations: [`${key.toUpperCase()}_EVIDENCE_UNKNOWN_IN_VEHICLE_EVIDENCE_V0.4.1`] };
    const assertions = (assertionsByFact.get(f.fact_id) ?? []).filter((a) => a.verification_status === "VERIFIED" && a.applicability_status === "EXACT");
    if (assertions.length === 0) return { status: "MISSING", assertionIds: [], sourceIds: [], limitations: [`${key.toUpperCase()}_EVIDENCE_NOT_EXACT_IN_VEHICLE_EVIDENCE_V0.4.1`] };
    const base = { status: "AVAILABLE", factId: f.fact_id, assertionIds: assertions.map((a) => a.assertion_id), sourceIds: [...new Set(assertions.map((a) => a.source_id))], scope: f.subject_type, evidenceState: "VERIFIED", applicability: "EXACT", unit: f.unit, measurementContext: f.measurement_context || undefined, limitations: [] };
    if (f.value_min || f.value_max) {
      const valueMin = Number(f.value_min), valueMax = Number(f.value_max);
      if (!Number.isFinite(valueMin) || !Number.isFinite(valueMax) || valueMin > valueMax || f.range_semantics !== "MIN_MAX") throw new Error(`MALFORMED_RANGE:${f.fact_id}`);
      return { ...base, valueMin, valueMax, rangeSemantics: f.range_semantics };
    }
    const value = Number(f.value); if (!Number.isFinite(value)) throw new Error(`MALFORMED_SCALAR:${f.fact_id}`);
    return { ...base, value };
  };
  const candidates = records.map((r) => ({ ...r, facts: { seats: resolveFact(r.configurationId, "seats"), cargo_volume_l: resolveFact(r.configurationId, "cargo_volume_l") } }));
  const artifact: any = { artifactVersion: "0.3.0", datasetVersion: "0.4.1", datasetReleaseHash: DATASET_HASH, schemaVersion: "0.1", mappingVersion: "0.2.1", mappingHash, dictionaryRevision: mapping.dictionaryRevision, dictionaryHash: mapping.dictionaryHash, productionCatalogRevision: cm.source_revision, generatedAt: GENERATED_AT, generatorVersion: "vehicle-evidence-runtime-artifact:v4", validationStatus: "PASS", evidenceValidator: { version: "vehicle-evidence:v0.4.1", status: "PASS" }, mappingValidator: { version: mapping.validatorVersion, status: "PASS" }, policy: { id: "cars.requirement-to-evidence", version: "0.1.0", migratedCategories: ["seats", "cargo_volume_l"] }, candidates, catalogReleaseVersion: "0.2.0", catalogPayloadHash: CATALOG_HASH, catalogSchemaVersion: "0.1" };
  const artifactBytes = json(artifact), artifactHash = sha256(artifactBytes);
  const artifactManifest = { artifactVersion: "0.3.0", artifactPath: "data/runtime/vehicle-evidence/v0.3.0/artifact.json", artifactSha256: artifactHash, mappingVersion: "0.2.1", mappingHash, mappingPath: mappingManifest.mappingPath, catalogReleaseVersion: "0.2.0", catalogPayloadHash: CATALOG_HASH, datasetVersion: "0.4.1", datasetReleaseHash: DATASET_HASH, dictionaryRevision: mapping.dictionaryRevision, dictionaryHash: mapping.dictionaryHash, migratedCategories: ["seats", "cargo_volume_l"], activeMappedCandidateCount: 5, seatsEvaluableCandidateCount: candidates.filter((c) => c.facts.seats.status === "AVAILABLE").length, cargoEvaluableCandidateCount: candidates.filter((c) => c.facts.cargo_volume_l.status === "AVAILABLE").length, validationStatus: "PASS", previousArtifactRelease: "0.2.0" };
  const reconciliation = [...variants.entries()].map(([id, v]: any) => { const o = outcomes[id]; const c = o.configurationId ? configs.get(o.configurationId) : undefined; const active = records.find((r) => r.vehicleVariantId === id); return { catalogVariantId: id, catalogVehicle: `${v.brand.value} ${v.model.value} ${v.trim.value}, MY${v.modelYear.value}`, candidateConfigurationId: o.configurationId, evidenceConfigurationStatus: c?.configuration_status ?? null, result: o.status, reason: o.reason, runtimeVehicleCandidateId: active?.runtimeVehicleCandidateId ?? null }; });
  const report: any = { reportVersion: "0.3.0", generatedAt: GENERATED_AT, result: "CARGO_RUNTIME_MIGRATION_VERIFIED", inputs: { catalogReleaseVersion: "0.2.0", catalogPayloadHash: CATALOG_HASH, datasetVersion: "0.4.1", datasetReleaseHash: DATASET_HASH }, metrics: { ...counts, seatsEvaluable: candidates.filter((c) => c.facts.seats.status === "AVAILABLE").length, seatsUnknown: candidates.filter((c) => c.facts.seats.status === "MISSING").length, cargoEvaluable: candidates.filter((c) => c.facts.cargo_volume_l.status === "AVAILABLE").length, cargoUnknown: candidates.filter((c) => c.facts.cargo_volume_l.status === "MISSING").length }, reconciliation, activeMappings: records, categoryCoverage, auditNotes: [{ code: "BMW_FUEL_CONSUMPTION_DISAGREEMENT", catalogVariantId: "06d935f4-6d33-4bc7-9e89-375b8db885df", catalogValueLPer100Km: 7.6, vehicleEvidenceValueLPer100Km: 7.3, disposition: "PRESERVED_NOT_MIGRATED_NON_BLOCKING_FOR_CARGO" }], mappingRelease: { version: "0.2.1", hash: mappingHash }, artifactRelease: { version: "0.3.0", hash: artifactHash } };
  const md = [`# Catalog v0.2.0 ↔ Vehicle Evidence v0.4.1 Cargo Runtime Migration`, "", "Result: **VERIFIED**", "", "| Catalog variant | Vehicle | Evidence configuration | Result | Reason | Runtime ID |", "|---|---|---|---|---|---|", ...reconciliation.map((r: any) => `| ${r.catalogVariantId} | ${r.catalogVehicle} | ${r.candidateConfigurationId ?? "—"} | ${r.result} | ${r.reason} | ${r.runtimeVehicleCandidateId ?? "—"} |`), "", "BMW audit note: catalog 7.6 L/100 km; Vehicle Evidence 7.3 L/100 km. Preserved without reconciliation; fuel consumption is not migrated.", ""].join("\n");
  await Promise.all([MAP_DIR, ARTIFACT_DIR, REPORT_DIR].map((d) => mkdir(d, { recursive: true })));
  await Promise.all([writeFile(path.join(MAP_DIR, "mapping.json"), mappingBytes), writeFile(path.join(MAP_DIR, "manifest.json"), json(mappingManifest)), writeFile(path.join(ARTIFACT_DIR, "artifact.json"), artifactBytes), writeFile(path.join(ARTIFACT_DIR, "manifest.json"), json(artifactManifest)), writeFile(path.join(REPORT_DIR, "RECONCILIATION_REPORT.json"), json(report)), writeFile(path.join(REPORT_DIR, "RECONCILIATION_REPORT.md"), md)]);
  console.log(JSON.stringify({ mappingVersion: "0.2.1", mappingHash, artifactVersion: "0.3.0", artifactHash, counts, seatsEvaluable: artifactManifest.seatsEvaluableCandidateCount, cargoEvaluable: artifactManifest.cargoEvaluableCandidateCount, categoryCoverage }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
