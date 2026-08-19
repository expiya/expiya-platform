import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRY = "data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-003";
const AUDIT = "data/production/catalog/activation-attempts/CATALOG-553-ATOMIC-ACTIVATION-ATTEMPT-003";
const AT = "2026-08-19T18:00:00.000+03:00";
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const raw = (file) => readFileSync(path.join(ROOT, file));
const read = (file) => JSON.parse(raw(file).toString("utf8"));
const writeImmutable = (file, value) => {
  const target = path.join(ROOT, file);
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : json(value));
  mkdirSync(path.dirname(target), { recursive: true });
  if (existsSync(target) && !raw(file).equals(bytes)) throw new Error(`IMMUTABLE_DIFF:${file}`);
  if (!existsSync(target)) writeFileSync(target, bytes);
};
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const plan = read(`${DRY}/atomic-activation-plan.json`);
assert(plan.status === "READY_FOR_RENEWED_EXPLICIT_ATOMIC_ACTIVATION_APPROVAL", "DRY_RUN_NOT_READY");
assert(plan.activationId === "CATALOG-553-ATOMIC-ACTIVATION-ATTEMPT-003", "ACTIVATION_ID_MISMATCH");

const layers = {
  catalog: {
    payload: "data/production/catalog/releases/0.55.3/catalog.json",
    manifest: "data/production/catalog/releases/0.55.3/manifest.json",
    pointer: "data/production/catalog/active.json",
    module: "data/production/catalog/activeCatalog.generated.ts",
    proposedPointer: `${DRY}/proposed-pointers/catalog.json`,
    proposedModule: `${DRY}/proposed-generated-modules/catalog.ts.txt`,
  },
  dailyLife: {
    payload: "data/production/technical-daily-life/releases/v2.1.1-0.55.3-2026-08-19-compatibility-rebind/technical-daily-life.json",
    manifest: "data/production/technical-daily-life/releases/v2.1.1-0.55.3-2026-08-19-compatibility-rebind/manifest.json",
    pointer: "data/production/technical-daily-life/active.json",
    module: "data/production/technical-daily-life/activeTechnicalDailyLife.generated.ts",
    proposedPointer: `${DRY}/proposed-pointers/dailyLife.json`,
    proposedModule: `${DRY}/proposed-generated-modules/dailyLife.ts.txt`,
  },
  persona: {
    payload: "data/production/personas/safe-traits/releases/v1.0.4-catalog-v0.55.3-2026-08-19/vehicle-persona-safe-traits.json",
    manifest: "data/production/personas/safe-traits/releases/v1.0.4-catalog-v0.55.3-2026-08-19/manifest.json",
    pointer: "data/production/personas/safe-traits/active.json",
    module: "data/production/personas/safe-traits/activeVehiclePersonaSafeTraits.generated.ts",
    proposedPointer: `${DRY}/proposed-pointers/persona.json`,
    proposedModule: `${DRY}/proposed-generated-modules/persona.ts.txt`,
  },
  equipment: {
    payload: "data/production/equipment-evidence/releases/v1.5.2-catalog-v0.55.3-2026-08-19/equipment-evidence.json",
    manifest: "data/production/equipment-evidence/releases/v1.5.2-catalog-v0.55.3-2026-08-19/manifest.json",
    pointer: "data/production/equipment-evidence/active.json",
    module: "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts",
    proposedPointer: `${DRY}/proposed-pointers/equipment.json`,
    proposedModule: `${DRY}/proposed-generated-modules/equipment.ts.txt`,
  },
};

for (const [key, layer] of Object.entries(layers)) {
  assert(sha(raw(layer.payload)) === plan.payloadChecksums[key], `${key.toUpperCase()}_PAYLOAD_CHECKSUM_MISMATCH`);
  assert(sha(raw(layer.proposedPointer)) === plan.proposedPointerChecksums[key], `${key.toUpperCase()}_POINTER_CHECKSUM_MISMATCH`);
  assert(sha(raw(layer.proposedModule)) === plan.proposedGeneratedModuleChecksums[key], `${key.toUpperCase()}_MODULE_CHECKSUM_MISMATCH`);
  assert(sha(raw(layer.pointer)) === plan.rollback[key].pointerChecksum, `${key.toUpperCase()}_ROLLBACK_POINTER_MISMATCH`);
  assert(sha(raw(layer.module)) === plan.rollback[key].generatedModuleChecksum, `${key.toUpperCase()}_ROLLBACK_MODULE_MISMATCH`);
}

const catalog = read(layers.catalog.payload);
const catalogIds = new Set(catalog.records.map((record) => record.variant.id));
assert(catalog.records.length === 549 && catalogIds.size === 549, "CATALOG_RECORD_COUNT_INVALID");
const quarantine = read("data/production/catalog/release-candidates/v0.55.3/quarantine-registry.json").records.map((record) => record.exactVariantId);
assert(quarantine.length === 17 && quarantine.every((id) => !catalogIds.has(id)), "QUARANTINE_PRESENT_IN_ACTIVE_CANDIDATE");
const catalogManifest = read(layers.catalog.manifest);
assert(catalogManifest.catalog_payload_hash === plan.catalogFingerprint && catalogManifest.record_count === 549, "CATALOG_MANIFEST_INVALID");

const dailyLifeManifest = read(layers.dailyLife.manifest);
for (const key of ["schemaVersion", "producedAt", "source", "counts", "sourceAuthority", "compatibilityRebind", "declaredLimitations"]) assert(key in dailyLifeManifest, `DAILY_LIFE_MANIFEST_MISSING_${key}`);
assert(dailyLifeManifest.contentChecksum === plan.payloadChecksums.dailyLife && dailyLifeManifest.compatibilityRebind.catalogFingerprint === plan.catalogFingerprint, "DAILY_LIFE_MANIFEST_INVALID");
const personaManifest = read(layers.persona.manifest);
assert(personaManifest.payloadSha256 === plan.payloadChecksums.persona && personaManifest.compatibleCatalogFingerprint === plan.catalogFingerprint && personaManifest.variantCount === 549, "PERSONA_MANIFEST_INVALID");
const equipment = read(layers.equipment.payload);
const equipmentManifest = read(layers.equipment.manifest);
assert(equipmentManifest.payloadSha256 === plan.payloadChecksums.equipment && equipment.compatibleCatalogFingerprint === plan.catalogFingerprint, "EQUIPMENT_MANIFEST_INVALID");
assert(equipment.coverage.verifiedAssertionCoverage.exactVariantCount === 4 && equipment.coverage.reviewedAssociationOnlyCoverage.exactVariantCount === 2 && equipment.coverage.uncoveredCoverage.exactVariantCount === 543 && equipment.coverage.catalogVariantCount === 549, "EQUIPMENT_COVERAGE_INVALID");
assert(4 + 2 + 543 === 549, "EQUIPMENT_COVERAGE_ARITHMETIC_INVALID");
const equipmentCollections = [equipment.verifiedAssertions, equipment.reviewedAssociations, equipment.verifiedTrimLinks, equipment.projections].flat();
assert(equipmentCollections.every((record) => !quarantine.includes(record.exactVariantId)), "EQUIPMENT_QUARANTINE_REFERENCE");
assert(equipment.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED" && Object.values(equipment.decisionControls).every((value) => value !== true), "EQUIPMENT_AUTHORITY_NOT_DISABLED");

const backups = {};
for (const [key, layer] of Object.entries(layers)) {
  backups[key] = { pointer: raw(layer.pointer), module: raw(layer.module) };
  writeImmutable(`${AUDIT}/rollback-bytes/${key}-pointer.bin`, backups[key].pointer);
  writeImmutable(`${AUDIT}/rollback-bytes/${key}-module.bin`, backups[key].module);
}
writeImmutable(`${AUDIT}/owner-approval.json`, { approvalId: "CATALOG-553-ATOMIC-ACTIVATION-ATTEMPT-003-OWNER-APPROVAL", actor: "EQUIPMENT_OWNER_001", authority: "PRODUCT_OWNER", dryRunActivationId: plan.activationId, approvedPayloadChecksums: plan.payloadChecksums, approvedPointerChecksums: plan.proposedPointerChecksums, approvedGeneratedModuleChecksums: plan.proposedGeneratedModuleChecksums, approvedAt: AT, commitPushDeploymentMigrationDatabaseWriteAuthorized: false });
writeImmutable(`${AUDIT}/pre-activation-validation.json`, { status: "PASSED", catalogRecordCount: 549, quarantineCount: 17, equipmentCoverage: plan.equipmentCoverage, equipmentQuarantineReferenceCount: 0, allPayloadPointerModuleChecksumsVerified: true, allManifestContractsVerified: true, rollbackBytesVerified: true, activatedAt: null });

const restore = () => {
  for (const [key, layer] of Object.entries(layers)) {
    writeFileSync(path.join(ROOT, layer.pointer), backups[key].pointer);
    writeFileSync(path.join(ROOT, layer.module), backups[key].module);
  }
};
try {
  const pending = [];
  for (const [key, layer] of Object.entries(layers)) {
    for (const [kind, target, source] of [["pointer", layer.pointer, layer.proposedPointer], ["module", layer.module, layer.proposedModule]]) {
      const temp = `${target}.attempt-003.tmp`;
      writeFileSync(path.join(ROOT, temp), raw(source));
      pending.push({ key, kind, target, temp });
    }
  }
  for (const entry of pending) renameSync(path.join(ROOT, entry.temp), path.join(ROOT, entry.target));
  for (const [key, layer] of Object.entries(layers)) {
    assert(sha(raw(layer.pointer)) === plan.proposedPointerChecksums[key], `${key.toUpperCase()}_POST_POINTER_MISMATCH`);
    assert(sha(raw(layer.module)) === plan.proposedGeneratedModuleChecksums[key], `${key.toUpperCase()}_POST_MODULE_MISMATCH`);
    const moduleText = raw(layer.module).toString("utf8");
    assert(moduleText.includes(plan.finalReleaseIds[key]), `${key.toUpperCase()}_GENERATED_IMPORT_RELEASE_MISMATCH`);
  }
} catch (error) {
  restore();
  for (const layer of Object.values(layers)) for (const suffix of [layer.pointer, layer.module]) {
    const temp = path.join(ROOT, `${suffix}.attempt-003.tmp`);
    if (existsSync(temp)) unlinkSync(temp);
  }
  writeImmutable(`${AUDIT}/activation-failure.json`, { status: "ROLLED_BACK", error: error instanceof Error ? error.message : String(error), rolledBackAllFourLayers: true, at: AT });
  throw error;
}
writeImmutable(`${AUDIT}/activation-result.json`, { status: "ACTIVATED_PENDING_EXTERNAL_POST_VALIDATION", activationId: plan.activationId, activatedAt: AT, finalReleaseIds: plan.finalReleaseIds, payloadChecksums: plan.payloadChecksums, activePointerChecksums: plan.proposedPointerChecksums, generatedModuleChecksums: plan.proposedGeneratedModuleChecksums, catalogRecordCount: 549, quarantineCount: 17, equipmentCoverage: plan.equipmentCoverage, equipmentQuarantineReferenceCount: 0, unauthorizedAliasCount: 0, automaticEquipmentTransferCount: 0, equipmentDecisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", rollback: plan.rollback, previousActivationAndRollbackAuditPreserved: true });
console.log(json({ status: "ACTIVATED_PENDING_EXTERNAL_POST_VALIDATION", activationId: plan.activationId, releases: plan.finalReleaseIds }));
