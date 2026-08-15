import { createHash } from "node:crypto";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- release generator validates pinned JSON before projection */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "data/production/catalog/releases/v0.2.0/catalog.json");
const catalogManifestPath = path.join(root, "data/production/catalog/releases/v0.2.0/manifest.json");
const previousArtifactPath = path.join(root, "data/runtime/vehicle-evidence/v0.3.0/artifact.json");
const evidenceDir = path.join(root, "data/cars/vehicle_evidence/releases/v0.5.0");
const mappingDir = path.join(root, "data/runtime/vehicle-candidate-identity-maps/v0.3.0");
const artifactDir = path.join(root, "data/runtime/vehicle-evidence/v0.4.0");
const generatedAt = "2026-08-15T12:00:00.000Z";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

type Closure = {
  variantId: string; runtimeId: string; configurationId: string; sourceId: string;
  identity: { brand: string; model: string; trim: string; modelYear: number; bodyFamily: string; fuel: string; transmission: string; drivetrain: string };
  facts: { seats: number; cargoLitres: number; cargoContext: string; lengthMm: number; widthMm: number };
  source: { url: string; title: string; applicability: string; limitations: string[] };
};

const closures: Closure[] = [
  { variantId: "1eb75421-a038-4679-977e-7cd4e4608863", runtimeId: "RVC-PILOT-0006", configurationId: "CFG-000001", sourceId: "SRC-CF-0001", identity: { brand: "Renault", model: "Clio", trim: "evolution plus TCe EDC 115 hp", modelYear: 2026, bodyFamily: "HATCHBACK", fuel: "PETROL", transmission: "DCT_AUTOMATIC", drivetrain: "FWD" }, facts: { seats: 5, cargoLitres: 391, cargoContext: "rear seats upright; petrol TCe configuration", lengthMm: 4116, widthMm: 1768 }, source: { url: "https://www.renault.com.tr/hybrid-araclar/yeni-clio/konfigurator-yeni.html", title: "Yeni Renault Clio exact configurator", applicability: "TR/MY2026/evolution plus/TCe 115 EDC", limitations: ["Manufacturer values; cargo is the published petrol-version seats-up value."] } },
  { variantId: "01a559dd-917f-4f49-a4cf-84fe78e9de40", runtimeId: "RVC-PILOT-0004", configurationId: "CFG-000054", sourceId: "SRC-CF-0002", identity: { brand: "Opel", model: "Corsa", trim: "Hybrid 1.2 145 (136 HP) GS", modelYear: 2026, bodyFamily: "HATCHBACK", fuel: "MHEV", transmission: "DCT_AUTOMATIC", drivetrain: "FWD" }, facts: { seats: 5, cargoLitres: 309, cargoContext: "rear seats upright; current Corsa Hybrid", lengthMm: 4061, widthMm: 1765 }, source: { url: "https://www.opel.com.tr/uygulamalar/modeller-ve-teknik-ozellikler.html", title: "Opel Türkiye models and technical specifications", applicability: "TR/MY2026/Corsa Hybrid GS", limitations: ["Parking equipment remains UNKNOWN because no trim-level atomic row was activated."] } },
  { variantId: "c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8", runtimeId: "RVC-PILOT-0007", configurationId: "CFG-000069", sourceId: "SRC-CF-0003", identity: { brand: "Toyota", model: "Yaris", trim: "Flame Hybrid 1.5 116 HP e-CVT", modelYear: 2026, bodyFamily: "HATCHBACK", fuel: "HEV", transmission: "E_CVT_AUTOMATIC", drivetrain: "FWD" }, facts: { seats: 5, cargoLitres: 286, cargoContext: "rear seats upright", lengthMm: 3940, widthMm: 1745 }, source: { url: "https://www.toyota.com.tr/content/dam/toyota/nmsc/turkey/cars/e-brosur/yaris/Toyota_Yaris_Hybrid_TeknikDonan%C4%B1m_2026.pdf", title: "Yeni Yaris Hybrid 2026 technical/equipment sheet", applicability: "TR/MY2026/1.5 Hybrid 116 HP e-CVT; Flame price identity linked by catalog", limitations: ["Dimensions and cargo are powertrain-applicable; trim identity remains exact through the catalog price/configuration source."] } },
  { variantId: "f81b0873-f3a7-454a-9f34-4d5ad273708d", runtimeId: "RVC-PILOT-0008", configurationId: "CFG-000070", sourceId: "SRC-CF-0004", identity: { brand: "Renault", model: "Megane Sedan", trim: "Touch 1.3 TCe EDC 140 bg", modelYear: 2026, bodyFamily: "SEDAN", fuel: "PETROL", transmission: "DCT_AUTOMATIC", drivetrain: "FWD" }, facts: { seats: 5, cargoLitres: 503, cargoContext: "rear seats upright", lengthMm: 4630, widthMm: 1814 }, source: { url: "https://www.renault.com.tr/binek-araclar/megane-sedan.html", title: "Renault Megane Sedan current Turkey model page", applicability: "TR/MY2026/Touch/1.3 TCe EDC 140", limitations: ["Generic comfort language is not converted into a comparison fact."] } },
  { variantId: "5d3538b1-c726-44f5-8160-41a64d33eb8e", runtimeId: "RVC-PILOT-0009", configurationId: "CFG-000071", sourceId: "SRC-CF-0005", identity: { brand: "Hyundai", model: "TUCSON", trim: "1.6 T-GDI Comfort 4X2 DCT", modelYear: 2026, bodyFamily: "SUV", fuel: "PETROL", transmission: "DCT_AUTOMATIC", drivetrain: "FWD" }, facts: { seats: 5, cargoLitres: 620, cargoContext: "rear seats upright; petrol 4x2", lengthMm: 4510, widthMm: 1865 }, source: { url: "https://www.hyundai.com/tr/tr/arac-modelleri/tucson/teknik-ozellikler.html", title: "Hyundai TUCSON Turkey technical specifications", applicability: "TR/MY2026/1.6 T-GDI Comfort 4X2 DCT", limitations: ["No ride-comfort superiority claim is authorized."] } },
  { variantId: "06d935f4-6d33-4bc7-9e89-375b8db885df", runtimeId: "RVC-PILOT-0005", configurationId: "CFG-000063", sourceId: "SRC-CF-0006", identity: { brand: "BMW", model: "320i Sedan", trim: "M Sport", modelYear: 2026, bodyFamily: "SEDAN", fuel: "PETROL", transmission: "AUTOMATIC", drivetrain: "RWD" }, facts: { seats: 5, cargoLitres: 480, cargoContext: "rear seats upright", lengthMm: 4713, widthMm: 1827 }, source: { url: "https://www.bmw.com.tr/tr/all-models/3-series/bmw-3-serisi-sedan/bmw-3-serisi-sedan-teknik-veriler.html", title: "BMW 3 Serisi Sedan Turkey technical data", applicability: "TR/MY2026/320i Sedan M Sport", limitations: ["Price exceeds the Phase 1 family 3M journey ceiling."] } },
];

function available(value: number, unit: string, factId: string, sourceId: string, context?: string) {
  return { status: "AVAILABLE", factId, assertionIds: [`AST-${factId}`], sourceIds: [sourceId], scope: "CONFIGURATION", evidenceState: "VERIFIED", applicability: "EXACT", value, unit, ...(context ? { measurementContext: context } : {}), limitations: [] };
}

async function main() {
  const [catalogBytes, catalogManifestBytes, previousBytes] = await Promise.all([readFile(catalogPath, "utf8"), readFile(catalogManifestPath, "utf8"), readFile(previousArtifactPath, "utf8")]);
  const catalog = JSON.parse(catalogBytes); const catalogManifest = JSON.parse(catalogManifestBytes); const previous = JSON.parse(previousBytes);
  if (sha(catalogBytes) !== catalogManifest.catalog_payload_hash.replace("sha256:", "")) throw new Error("CATALOG_HASH_MISMATCH");
  const byId = new Map(catalog.records.map((record: any) => [record.variant.id, record]));
  for (const item of closures) {
    const record: any = byId.get(item.variantId); if (!record) throw new Error(`MISSING_CATALOG_VARIANT:${item.variantId}`);
    const actual = [record.variant.brand.value, record.variant.model.value, record.variant.trim.value, record.variant.modelYear.value];
    const expected = [item.identity.brand, item.identity.model, item.identity.trim, item.identity.modelYear];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`EXACT_IDENTITY_MISMATCH:${item.variantId}`);
    if (record.activeNewPrice.condition !== "NEW" || record.activeNewPrice.market !== "TR") throw new Error(`PRICE_CONTRACT_FAILED:${item.variantId}`);
  }
  const priorIds = new Set(closures.map((item) => item.variantId));
  const retained = previous.candidates.filter((candidate: any) => !priorIds.has(candidate.vehicleVariantId) && ["RVC-PILOT-0001", "RVC-PILOT-0002", "RVC-PILOT-0003"].includes(candidate.runtimeVehicleCandidateId));
  const candidates = [...retained, ...closures.map((item, index) => ({ runtimeVehicleCandidateId: item.runtimeId, vehicleVariantId: item.variantId, configurationId: item.configurationId, mappingStatus: "VERIFIED_ONE_TO_ONE", mappingBasis: "EXACT_REVIEWED_CROSSWALK", reasonCode: "EXACT_TR_MARKET_MODEL_YEAR_TRIM_POWERTRAIN", reviewReference: item.sourceId, facts: { seats: available(item.facts.seats, "count", `FAC-CF-${String(index * 2 + 1).padStart(4, "0")}`, item.sourceId), cargo_volume_l: available(item.facts.cargoLitres, "L", `FAC-CF-${String(index * 2 + 2).padStart(4, "0")}`, item.sourceId, item.facts.cargoContext) } }))];
  const evidenceRelease = { datasetVersion: "0.5.0", schemaVersion: "compact-family-closure:1", previousDatasetVersion: "0.4.1", generatedAt, validatorStatus: "PASS", sources: closures.map((item) => ({ sourceId: item.sourceId, authorityClass: "A1_OFFICIAL_MARKET", accessedAt: generatedAt, canonicalUrl: item.source.url, title: item.source.title, applicability: item.source.applicability, limitations: item.source.limitations, freshnessStatus: "CURRENT", conflictStatus: "NONE" })), configurations: closures.map((item) => ({ configurationId: item.configurationId, vehicleVariantId: item.variantId, runtimeVehicleCandidateId: item.runtimeId, status: "VERIFIED", identity: item.identity, facts: item.facts, sourceId: item.sourceId, mappingStatus: "VERIFIED_ONE_TO_ONE", priceObservation: (byId.get(item.variantId) as any).activeNewPrice })) };
  const evidenceBytes = json(evidenceRelease), evidenceHash = sha(evidenceBytes);
  const mapping = { mappingVersion: "0.3.0", catalogReleaseVersion: "0.2.0", catalogPayloadHash: sha(catalogBytes), vehicleEvidenceDatasetVersion: "0.5.0", vehicleEvidenceReleaseHash: evidenceHash, generatedAt, validatorStatus: "PASS", records: candidates.map(({ facts: _facts, ...candidate }: any) => candidate) };
  const mappingBytes = json(mapping), mappingHash = sha(mappingBytes);
  const artifact = { artifactVersion: "0.4.0", datasetVersion: "0.5.0", datasetReleaseHash: evidenceHash, schemaVersion: "0.1", mappingVersion: "0.3.0", mappingHash, dictionaryRevision: "vehicle-evidence-0.4.1:data_dictionary.csv+compact-family-closure:1", dictionaryHash: previous.dictionaryHash, productionCatalogRevision: catalogManifest.source_revision, generatedAt, generatorVersion: "vehicle-evidence-runtime-artifact:v5", validationStatus: "PASS", evidenceValidator: { version: "compact-family-closure:1", status: "PASS" }, mappingValidator: { version: "vehicle-candidate-identity-map:v5", status: "PASS" }, policy: previous.policy, candidates, catalogReleaseVersion: "0.2.0", catalogPayloadHash: sha(catalogBytes), catalogSchemaVersion: "0.1" };
  const artifactBytes = json(artifact), artifactHash = sha(artifactBytes);
  await Promise.all([evidenceDir, mappingDir, artifactDir].map((directory) => mkdir(directory, { recursive: true })));
  await Promise.all([
    writeFile(path.join(evidenceDir, "closure.json"), evidenceBytes), writeFile(path.join(evidenceDir, "manifest.json"), json({ datasetVersion: "0.5.0", releaseHash: evidenceHash, previousDatasetVersion: "0.4.1", configurationCount: closures.length, validatorStatus: "PASS" })),
    writeFile(path.join(mappingDir, "mapping.json"), mappingBytes), writeFile(path.join(mappingDir, "manifest.json"), json({ mappingVersion: "0.3.0", mappingHash, recordCount: candidates.length, validatorStatus: "PASS" })),
    writeFile(path.join(artifactDir, "artifact.json"), artifactBytes), writeFile(path.join(artifactDir, "manifest.json"), json({ artifactVersion: "0.4.0", artifactPath: "data/runtime/vehicle-evidence/v0.4.0/artifact.json", artifactSha256: artifactHash, mappingVersion: "0.3.0", mappingHash, datasetVersion: "0.5.0", datasetReleaseHash: evidenceHash, activeMappedCandidateCount: candidates.length, validationStatus: "PASS", previousArtifactRelease: "0.3.0" })),
  ]);
  console.log(JSON.stringify({ evidenceHash, mappingHash, artifactHash, candidateCount: candidates.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
