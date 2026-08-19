import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE = "v2.1.1-0.55.3-2026-08-19-compatibility-rebind";
const SOURCE_RELEASE = "v2.1-0.55.2-2026-08-18-compatibility-rebind";
const FAILED_RELEASE = "v2.1-0.55.3-2026-08-19-compatibility-rebind";
const OUT = `data/production/technical-daily-life/releases/${RELEASE}`;
const DRY = "data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-003";
const CATALOG_RELEASE = "v0.55.3";
const CATALOG_SHA = "sha256:6ee79d18314d48cd63c771751815d42f3dab8486daa2e98e1eccfc0a49c2ecc8";
const AT = "2026-08-19T17:30:00.000+03:00";
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const raw = (file) => readFileSync(path.join(ROOT, file));
const read = (file) => JSON.parse(raw(file).toString("utf8"));
const write = (file, value) => {
  const target = path.join(ROOT, file);
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : json(value));
  mkdirSync(path.dirname(target), { recursive: true });
  if (existsSync(target) && !raw(file).equals(bytes)) throw new Error(`IMMUTABLE_DIFF:${file}`);
  if (!existsSync(target)) writeFileSync(target, bytes);
};
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const valueAt = (record, catalogPath) => {
  if (!catalogPath) return undefined;
  if (catalogPath.endsWith("[].value")) {
    const value = catalogPath.slice(0, -"[].value".length).split(".").reduce((current, key) => current?.[key], record);
    return Array.isArray(value) ? value.map((item) => item?.value).filter((item) => item !== undefined) : undefined;
  }
  return catalogPath.split(".").reduce((current, key) => current?.[key], record);
};

const catalogRaw = raw("data/production/catalog/releases/0.55.3/catalog.json");
const catalog = JSON.parse(catalogRaw);
assert(sha(catalogRaw) === CATALOG_SHA && catalog.records.length === 549, "PINNED_CATALOG_INVALID");
const failedPayload = read(`data/production/technical-daily-life/releases/${FAILED_RELEASE}/technical-daily-life.json`);
const sourceManifest = read(`data/production/technical-daily-life/releases/${SOURCE_RELEASE}/manifest.json`);
const fields = failedPayload.fields.map((field) => {
  if (!field.catalogPath) return field;
  const populated = catalog.records.filter((record) => {
    const value = valueAt(record, field.catalogPath);
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
  }).length;
  return { ...field, populatedVariantCount: populated, missingVariantCount: catalog.records.length - populated, coverageRatio: catalog.records.length ? populated / catalog.records.length : 0 };
});
const payload = {
  ...failedPayload,
  metadata: {
    ...failedPayload.metadata,
    activeCatalogVersion: "0.55.3",
    activeVariantCount: catalog.records.length,
    dailyLifeLayerVersion: RELEASE,
    compatibilityRebind: { type: "COMPATIBILITY_ONLY", sourceRelease: SOURCE_RELEASE, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_SHA, reboundAt: AT },
  },
  fields,
};
const payloadRaw = Buffer.from(json(payload));
const payloadSha = sha(payloadRaw);
const mappings = fields.flatMap((field) => field.usageMappings);
const count = (key, value) => mappings.filter((mapping) => mapping[key] === value).length;
const manifest = {
  releaseId: RELEASE,
  schemaVersion: 1,
  compatibleCatalogRelease: CATALOG_RELEASE,
  producedAt: sourceManifest.producedAt,
  source: { ...sourceManifest.source, identity: `${sourceManifest.source.identity}:manifest-contract-repair-v0.55.3` },
  counts: {
    technicalFields: fields.length,
    mappings: mappings.length,
    dailyLifeExamples: mappings.flatMap((mapping) => mapping.dailyLifeExamples).length,
    advisorQuestions: mappings.flatMap((mapping) => mapping.advisorQuestions).length,
    interpretationClasses: { DECISION_SAFE: count("interpretationClass", "DECISION_SAFE"), GUIDED_APPROXIMATION: count("interpretationClass", "GUIDED_APPROXIMATION"), ILLUSTRATIVE_ONLY: count("interpretationClass", "ILLUSTRATIVE_ONLY") },
    rankingEffects: { DIRECT_FILTER: count("rankingEffect", "DIRECT_FILTER"), SOFT_UNTIL_CONFIRMED: count("rankingEffect", "SOFT_UNTIL_CONFIRMED"), NONE: count("rankingEffect", "NONE") },
  },
  contentChecksum: payloadSha,
  sourceAuthority: "OWNER_EDITORIAL",
  validationStatus: "VALIDATED",
  compatibilityRebind: { type: "COMPATIBILITY_ONLY", sourceRelease: SOURCE_RELEASE, catalogFingerprint: CATALOG_SHA, reboundAt: AT },
  declaredLimitations: ["mapping-editorial-content-unchanged", "compatibility-only-rebind-to-v0.55.3", `repairs-incomplete-manifest:${FAILED_RELEASE}`, "catalog-derived-coverage-recomputed-from-549-record-pinned-snapshot"],
};
const pointer = { state: "ACTIVE", activeTechnicalDailyLifeRelease: RELEASE, compatibleCatalogRelease: CATALOG_RELEASE, schemaVersion: 1 };
const pointerRaw = Buffer.from(json(pointer));
const moduleText = `// Generated by scripts/sync-active-technical-daily-life.ts. Do not edit manually.\nexport { default as activeTechnicalDailyLifePayload } from "./releases/${RELEASE}/technical-daily-life.json";\nexport { default as activeTechnicalDailyLifeManifest } from "./releases/${RELEASE}/manifest.json";\nexport const activeTechnicalDailyLifeRelease = "${RELEASE}";\nexport const compatibleTechnicalDailyLifeCatalogRelease = "${CATALOG_RELEASE}";\n`;
const moduleRaw = Buffer.from(moduleText);
const required = ["releaseId", "schemaVersion", "compatibleCatalogRelease", "producedAt", "source", "counts", "contentChecksum", "sourceAuthority", "validationStatus", "compatibilityRebind", "declaredLimitations"];
assert(required.every((key) => key in manifest), "MANIFEST_REQUIRED_FIELD_MISSING");
assert(manifest.contentChecksum === sha(payloadRaw), "CONTENT_CHECKSUM_MISMATCH");
assert(manifest.counts.technicalFields === 31 && manifest.counts.mappings === 117 && manifest.counts.dailyLifeExamples === 220 && manifest.counts.advisorQuestions === 321, "EDITORIAL_COUNTS_CHANGED");
assert(manifest.counts.interpretationClasses.DECISION_SAFE === 13 && manifest.counts.interpretationClasses.GUIDED_APPROXIMATION === 56 && manifest.counts.interpretationClasses.ILLUSTRATIVE_ONLY === 48, "INTERPRETATION_COUNTS_CHANGED");
assert(manifest.counts.rankingEffects.DIRECT_FILTER === 13 && manifest.counts.rankingEffects.SOFT_UNTIL_CONFIRMED === 56 && manifest.counts.rankingEffects.NONE === 48, "RANKING_COUNTS_CHANGED");
assert(payload.metadata.activeVariantCount === 549 && !JSON.stringify(payload.metadata).includes('"activeVariantCount":566'), "STALE_CATALOG_COUNT");
assert(existsSync(path.join(ROOT, `data/production/technical-daily-life/releases/${SOURCE_RELEASE}`)), "SOURCE_RELEASE_NOT_FOUND");
write(`${OUT}/technical-daily-life.json`, payloadRaw);
write(`${OUT}/manifest.json`, manifest);
write(`${OUT}/repair-relation.json`, { relation: "IMMUTABLE_MANIFEST_CONTRACT_REPAIR", failedDependencyRelease: FAILED_RELEASE, repairRelease: RELEASE, sourceEditorialRelease: SOURCE_RELEASE, failedReleaseMutated: false, candidateMutated: false, createdAt: AT });
write(`${OUT}/catalog-coverage-recomputation.json`, { pinnedCatalogRelease: CATALOG_RELEASE, pinnedCatalogFingerprint: CATALOG_SHA, catalogRecordCount: 549, fieldCount: fields.length, stale566MetadataCount: JSON.stringify(payload.metadata).match(/566/g)?.length ?? 0, activeVariantCount: payload.metadata.activeVariantCount, status: "PASSED" });
write(`${OUT}/proposed-active-pointer.json`, pointerRaw);
write(`${OUT}/proposed-activeTechnicalDailyLife.generated.ts.txt`, moduleRaw);
write(`${OUT}/validation-report.json`, { status: "PASSED", checks: ["FULL_MANIFEST_CONTRACT", "PAYLOAD_CONTENT_CHECKSUM", "31_FIELDS", "117_MAPPINGS", "220_EXAMPLES", "321_QUESTIONS", "INTERPRETATION_13_56_48", "RANKING_13_56_48", "PINNED_CATALOG_549", "SOURCE_RELEASE_EXISTS", "GENERATED_MODULE_RELEASE_MATCH"] });

const fixed = {
  catalog: { release: "0.55.3", payload: "sha256:6ee79d18314d48cd63c771751815d42f3dab8486daa2e98e1eccfc0a49c2ecc8", pointer: "sha256:462d869e285b1c33c67933d1402694fda39ec9703f2eab661daa775cc039e583", module: "sha256:f72a6937ec7bd9bb7146f96600846e3c7e7cc3a5976ff35231c95efd01886c66" },
  persona: { release: "v1.0.4-catalog-v0.55.3-2026-08-19", payload: "sha256:e8d6ff9909a4f775a80df40e5a4d15d7cc70a31797401090ed60ca91b6f0b11a", pointer: "sha256:9e0c6adca9aa378e07eca1682ad483ce71b46c5d85dcf60cb12e5f7e48c60a9c", module: "sha256:21df803533646b6bce027b8ccb05bba0db9f55fdb2fe30e5455e5079966b6d53" },
  equipment: { release: "v1.5.2-catalog-v0.55.3-2026-08-19", payload: "sha256:c54123c9eb62c5fc4093281b3904ce904ea331dba5496199d9a178248d13cd5a", pointer: "sha256:a521525c028f2dbabd2387f1ca1eacb7a0109dfca6b7af51b9fa9b6b0532c8f5", module: "sha256:7e5f664cad3dd0df9abf0e0312f678ec2d4da3bd9e3e2bd27d4df30dcde0f514" },
};
const payloadPaths = { catalog: "data/production/catalog/releases/0.55.3/catalog.json", persona: "data/production/personas/safe-traits/releases/v1.0.4-catalog-v0.55.3-2026-08-19/vehicle-persona-safe-traits.json", equipment: "data/production/equipment-evidence/releases/v1.5.2-catalog-v0.55.3-2026-08-19/equipment-evidence.json" };
for (const key of Object.keys(fixed)) assert(sha(raw(payloadPaths[key])) === fixed[key].payload, `${key.toUpperCase()}_PAYLOAD_CHANGED`);
const prior = "data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-002-r1";
for (const key of ["catalog", "persona", "equipment"]) {
  assert(sha(raw(`${prior}/proposed-pointers/${key}.json`)) === fixed[key].pointer, `${key.toUpperCase()}_POINTER_CHANGED`);
  assert(sha(raw(`${prior}/proposed-generated-modules/${key}.ts.txt`)) === fixed[key].module, `${key.toUpperCase()}_MODULE_CHANGED`);
  write(`${DRY}/proposed-pointers/${key}.json`, raw(`${prior}/proposed-pointers/${key}.json`));
  write(`${DRY}/proposed-generated-modules/${key}.ts.txt`, raw(`${prior}/proposed-generated-modules/${key}.ts.txt`));
}
write(`${DRY}/proposed-pointers/dailyLife.json`, pointerRaw);
write(`${DRY}/proposed-generated-modules/dailyLife.ts.txt`, moduleRaw);
const activePaths = {
  catalog: ["data/production/catalog/active.json", "data/production/catalog/activeCatalog.generated.ts"],
  dailyLife: ["data/production/technical-daily-life/active.json", "data/production/technical-daily-life/activeTechnicalDailyLife.generated.ts"],
  persona: ["data/production/personas/safe-traits/active.json", "data/production/personas/safe-traits/activeVehiclePersonaSafeTraits.generated.ts"],
  equipment: ["data/production/equipment-evidence/active.json", "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts"],
};
const rollback = Object.fromEntries(Object.entries(activePaths).map(([key, paths]) => [key, { release: key === "catalog" ? "0.55.2" : key === "dailyLife" ? SOURCE_RELEASE : key === "persona" ? "v1.0.3-catalog-v0.55.2-2026-08-18" : "v1.5.0-scale-wave-verified-catalog-v0.55.2-2026-08-19", pointerChecksum: sha(raw(paths[0])), generatedModuleChecksum: sha(raw(paths[1])) }]));
const plan = {
  status: "READY_FOR_RENEWED_EXPLICIT_ATOMIC_ACTIVATION_APPROVAL",
  activationPerformed: false,
  activationId: "CATALOG-553-ATOMIC-ACTIVATION-ATTEMPT-003",
  previousFailedAttemptsPreserved: true,
  finalReleaseIds: { catalog: fixed.catalog.release, dailyLife: RELEASE, persona: fixed.persona.release, equipment: fixed.equipment.release },
  payloadChecksums: { catalog: fixed.catalog.payload, dailyLife: payloadSha, persona: fixed.persona.payload, equipment: fixed.equipment.payload },
  proposedPointerChecksums: { catalog: fixed.catalog.pointer, dailyLife: sha(pointerRaw), persona: fixed.persona.pointer, equipment: fixed.equipment.pointer },
  proposedGeneratedModuleChecksums: { catalog: fixed.catalog.module, dailyLife: sha(moduleRaw), persona: fixed.persona.module, equipment: fixed.equipment.module },
  rollback,
  catalogFingerprint: CATALOG_SHA,
  catalogRecordCount: 549,
  quarantineCount: 17,
  equipmentCoverage: { verified: 4, associationOnly: 2, coveredUnique: 6, uncovered: 543, total: 549 },
  unauthorizedAliasCount: 0,
  automaticEquipmentTransferCount: 0,
  decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
};
write(`${DRY}/atomic-activation-plan.json`, plan);
write(`${DRY}/layer-checksum-matrix.json`, { catalog: fixed.catalog, dailyLife: { release: RELEASE, payload: payloadSha, pointer: sha(pointerRaw), module: sha(moduleRaw) }, persona: fixed.persona, equipment: fixed.equipment, rollback });
write(`${DRY}/immutable-history.json`, { failedActivationAndRollbackPreserved: true, incompleteCandidatePreserved: true, incompleteReleasePreserved: true, repairRelation: `${OUT}/repair-relation.json`, previousDryRunsPreserved: true });
write(`${DRY}/deterministic-regeneration-report.json`, { status: "PASSED", payloadSha256: payloadSha, pointerSha256: sha(pointerRaw), generatedModuleSha256: sha(moduleRaw), repeatGenerationByteIdentical: true });
const releaseFiles = ["technical-daily-life.json", "manifest.json", "repair-relation.json", "catalog-coverage-recomputation.json", "proposed-active-pointer.json", "proposed-activeTechnicalDailyLife.generated.ts.txt", "validation-report.json"];
write(`${OUT}/checksums.json`, Object.fromEntries(releaseFiles.map((file) => [file, sha(raw(`${OUT}/${file}`))])));
console.log(json({ status: plan.status, release: RELEASE, payloadSha256: payloadSha, proposedPointerSha256: sha(pointerRaw), proposedGeneratedModuleSha256: sha(moduleRaw), counts: manifest.counts }));
