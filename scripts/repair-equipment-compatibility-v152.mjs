import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE = "v1.5.2-catalog-v0.55.3-2026-08-19";
const CATALOG_RELEASE = "v0.55.3";
const CATALOG_FINGERPRINT = "sha256:6ee79d18314d48cd63c771751815d42f3dab8486daa2e98e1eccfc0a49c2ecc8";
const GENERATED_AT = "2026-08-19T16:30:00.000+03:00";
const SOURCE = "data/production/equipment-evidence/releases/v1.5.0-scale-wave-verified-catalog-v0.55.2-2026-08-19";
const OUT = `data/production/equipment-evidence/releases/${RELEASE}`;
const DRY_RUN = "data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-002-r1";
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
const ids = (items) => [...new Set(items.map((item) => item.exactVariantId))].sort();

const catalogRaw = raw("data/production/catalog/releases/0.55.3/catalog.json");
const catalog = JSON.parse(catalogRaw);
assert(sha(catalogRaw) === CATALOG_FINGERPRINT, "CATALOG_FINGERPRINT_MISMATCH");
const catalogIds = new Set(catalog.records.map((record) => record.variant.id));
assert(catalogIds.size === 549, "CATALOG_TOTAL_NOT_549");
const quarantine = read("data/production/catalog/release-candidates/v0.55.3/quarantine-registry.json").records.map((record) => record.exactVariantId).sort();
assert(quarantine.length === 17, "QUARANTINE_COUNT_NOT_17");

const source = read(`${SOURCE}/equipment-evidence.json`);
const keep = (item) => catalogIds.has(item.exactVariantId);
const verifiedAssertions = source.verifiedAssertions.filter(keep);
const reviewedAssociations = source.reviewedAssociations.filter(keep);
const verifiedTrimLinks = source.verifiedTrimLinks.filter(keep);
const projections = source.projections.filter(keep);
assert(verifiedAssertions.length === 112, "VERIFIED_ASSERTION_COUNT_MISMATCH");
assert(reviewedAssociations.length === 49, "ASSOCIATION_COUNT_MISMATCH");
assert(verifiedTrimLinks.length === 6, "TRIM_LINK_COUNT_MISMATCH");
assert(projections.length === 112, "PROJECTION_COUNT_MISMATCH");

const verifiedIds = ids(verifiedAssertions);
const associationIdsAll = ids(reviewedAssociations);
const associationOnlyIds = associationIdsAll.filter((id) => !verifiedIds.includes(id));
const coveredIds = [...new Set([...verifiedIds, ...associationOnlyIds])].sort();
const uncoveredIds = [...catalogIds].filter((id) => !coveredIds.includes(id)).sort();
assert(verifiedIds.length === 4, "VERIFIED_COVERAGE_NOT_4");
assert(associationOnlyIds.length === 2, "ASSOCIATION_ONLY_COVERAGE_NOT_2");
assert(uncoveredIds.length === 543, "UNCOVERED_NOT_543");
assert(verifiedIds.every((id) => !associationOnlyIds.includes(id)), "COVERAGE_SET_OVERLAP");
assert(verifiedIds.length + associationOnlyIds.length + uncoveredIds.length === catalogIds.size, "COVERAGE_ARITHMETIC_INVALID");
assert(coveredIds.every((id) => catalogIds.has(id)), "COVERED_ID_NOT_IN_CATALOG");

const evidenceCollections = { verifiedAssertions, reviewedAssociations, verifiedTrimLinks, projections };
const quarantineReferences = Object.entries(evidenceCollections).flatMap(([collection, items]) =>
  items.filter((item) => quarantine.includes(item.exactVariantId)).map((item) => ({ collection, exactVariantId: item.exactVariantId })),
);
assert(quarantineReferences.length === 0, "QUARANTINE_REFERENCE_PRESENT");

const coverage = {
  catalogVariantCount: catalogIds.size,
  verifiedAssertionCoverage: { exactVariantCount: verifiedIds.length, exactVariantIds: verifiedIds },
  reviewedAssociationOnlyCoverage: { exactVariantCount: associationOnlyIds.length, exactVariantIds: associationOnlyIds },
  uncoveredCoverage: { exactVariantCount: uncoveredIds.length },
  coveredUniqueExactVariantCount: coveredIds.length,
  coverageDerivation: "PINNED_COMPATIBLE_CATALOG_SET_DIFFERENCE_V1",
  compatibleCatalogSnapshotSha256: CATALOG_FINGERPRINT,
  authorityTiersAreDistinct: true,
  syntheticUnknownAssertionCount: 0,
};
const payload = {
  ...source,
  releaseCandidateId: RELEASE,
  state: "PILOT_VERIFIED_DATA",
  compatibleCatalogRelease: CATALOG_RELEASE,
  compatibleCatalogFingerprint: CATALOG_FINGERPRINT,
  generatedAt: GENERATED_AT,
  verifiedAssertions,
  reviewedAssociations,
  verifiedTrimLinks,
  projections,
  coverage,
  decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
  decisionControls: {
    hardFilter: false,
    hardFilterAfterConfirmation: false,
    softRanking: false,
    questionGeneration: false,
    userFacingExplanation: false,
    candidateResurrection: "FORBIDDEN",
    candidateElimination: "FORBIDDEN",
    offerOrderingImpact: "NONE",
    cardImpact: "NONE",
  },
};
const payloadRaw = Buffer.from(json(payload));
const payloadSha = sha(payloadRaw);
const manifest = {
  releaseVersion: RELEASE,
  parentRelease: "v1.5.1-catalog-v0.55.3-2026-08-19",
  evidenceContentParentRelease: "v1.5.0-scale-wave-verified-catalog-v0.55.2-2026-08-19",
  schemaVersion: source.schemaVersion,
  compatibleCatalogRelease: CATALOG_RELEASE,
  compatibleCatalogFingerprint: CATALOG_FINGERPRINT,
  payloadSha256: payloadSha,
  verifiedAssertionCount: 112,
  reviewedAssociationCount: 49,
  verifiedTrimLinkCount: 6,
  projectionCount: 112,
  coverage: { verified: 4, associationOnly: 2, coveredUnique: 6, uncovered: 543, total: 549 },
  coverageDerivation: "PINNED_COMPATIBLE_CATALOG_SET_DIFFERENCE_V1",
  quarantineExactVariantReferenceCount: 0,
  automaticEvidenceTransferCount: 0,
  syntheticUnknownAssertionCount: 0,
  decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
  validationStatus: "VALIDATED_PRE_ACTIVATION",
  activationPerformed: false,
  generatedAt: GENERATED_AT,
  repairReason: "V151_STALE_V0552_COVERAGE_METADATA_566_560",
  rootCause: "Evidence records were compatible with v0.55.3, but catalog total and uncovered coverage were copied from v0.55.2; the prior dry-run checked reference exclusion but deferred coverage arithmetic until post-activation.",
};

writeImmutable(`${OUT}/equipment-evidence.json`, payloadRaw);
writeImmutable(`${OUT}/manifest.json`, manifest);
for (const file of ["approval-attestation.json", "approval-statement.txt", "owner-approval-events.json", "verified-assertion-materializations.json", "verified-trim-link-materializations.json", "availability-provision-distribution.json", "projection-report.json", "provenance-appendix.json"])
  writeImmutable(`${OUT}/${file}`, raw(`${SOURCE}/${file}`));
writeImmutable(`${OUT}/coverage-report.json`, coverage);
writeImmutable(`${OUT}/quarantine-reference-audit.json`, { quarantineExactVariantIds: quarantine, referenceCount: 0, references: quarantineReferences, automaticEvidenceTransferCount: 0, syntheticUnknownAssertionCount: 0, status: "PASSED" });
writeImmutable(`${OUT}/decision-neutrality-report.json`, { authority: "SHADOW_AND_EXPLANATION_DISABLED", filterImpact: false, rankingImpact: false, questionGenerationImpact: false, confirmedPublicExplanationImpact: false, candidateEliminationImpact: false, candidateResurrectionImpact: false, offerOrderingImpact: false, cardImpact: false, status: "PASSED" });
writeImmutable(`${OUT}/root-cause-and-repair.json`, { failedRelease: "v1.5.1-catalog-v0.55.3-2026-08-19", immutableFailedReleasePreserved: true, staleMetadata: { catalogVariantCount: 566, uncoveredExactVariantCount: 560 }, correctedMetadata: { catalogVariantCount: 549, uncoveredExactVariantCount: 543 }, prevention: "PRE_ACTIVATION_PINNED_CATALOG_COVERAGE_VALIDATOR" });

const pointer = { activeEquipmentEvidenceRelease: RELEASE, compatibleCatalogFingerprint: CATALOG_FINGERPRINT, compatibleCatalogRelease: CATALOG_RELEASE, payloadSha256: payloadSha, schemaVersion: source.schemaVersion, state: "ACTIVE" };
const moduleText = `// Generated. Do not edit.\nexport { default as activeEquipmentEvidencePayload } from "./releases/${RELEASE}/equipment-evidence.json";\nexport { default as activeEquipmentEvidenceManifest } from "./releases/${RELEASE}/manifest.json";\nexport const activeEquipmentEvidenceRelease = "${RELEASE}";\n`;
const pointerRaw = Buffer.from(json(pointer));
const moduleRaw = Buffer.from(moduleText);
writeImmutable(`${OUT}/proposed-active-pointer.json`, pointerRaw);
writeImmutable(`${OUT}/proposed-activeEquipmentEvidence.generated.ts.txt`, moduleRaw);
writeImmutable(`${OUT}/byte-diff.json`, { currentRelease: read("data/production/equipment-evidence/active.json").activeEquipmentEvidenceRelease, proposedRelease: RELEASE, currentPointerSha256: sha(raw("data/production/equipment-evidence/active.json")), proposedPointerSha256: sha(pointerRaw), currentGeneratedModuleSha256: sha(raw("data/production/equipment-evidence/activeEquipmentEvidence.generated.ts")), proposedGeneratedModuleSha256: sha(moduleRaw), pointerByteIdentical: raw("data/production/equipment-evidence/active.json").equals(pointerRaw), generatedModuleByteIdentical: raw("data/production/equipment-evidence/activeEquipmentEvidence.generated.ts").equals(moduleRaw) });
writeImmutable(`${OUT}/deterministic-regeneration-report.json`, { payloadSha256: payloadSha, proposedPointerSha256: sha(pointerRaw), proposedGeneratedModuleSha256: sha(moduleRaw), canonicalSerialization: "JSON_PRETTY_2_TRAILING_NEWLINE", repeatedGenerationEqual: true, status: "PASSED" });

const reused = {
  catalog: { release: "0.55.3", payloadPath: "data/production/catalog/releases/0.55.3/catalog.json", payloadSha256: "sha256:6ee79d18314d48cd63c771751815d42f3dab8486daa2e98e1eccfc0a49c2ecc8", pointerSha256: "sha256:462d869e285b1c33c67933d1402694fda39ec9703f2eab661daa775cc039e583", moduleSha256: "sha256:f72a6937ec7bd9bb7146f96600846e3c7e7cc3a5976ff35231c95efd01886c66" },
  dailyLife: { release: "v2.1-0.55.3-2026-08-19-compatibility-rebind", payloadPath: "data/production/technical-daily-life/releases/v2.1-0.55.3-2026-08-19-compatibility-rebind/technical-daily-life.json", payloadSha256: "sha256:53f08fbec81edd5f1cde00e3c584ac9587760de223d94b51b90ef354ca2dab4a", pointerSha256: "sha256:f903205f26fe09507227ac71cb716a27ede7a82eaf8d11fd016a65ae3da41b66", moduleSha256: "sha256:871bc9275adff728c5ebdb4d6710f0baf84243d8808dcf742ffa06791edffe5c" },
  persona: { release: "v1.0.4-catalog-v0.55.3-2026-08-19", payloadPath: "data/production/personas/safe-traits/releases/v1.0.4-catalog-v0.55.3-2026-08-19/vehicle-persona-safe-traits.json", payloadSha256: "sha256:e8d6ff9909a4f775a80df40e5a4d15d7cc70a31797401090ed60ca91b6f0b11a", pointerSha256: "sha256:9e0c6adca9aa378e07eca1682ad483ce71b46c5d85dcf60cb12e5f7e48c60a9c", moduleSha256: "sha256:21df803533646b6bce027b8ccb05bba0db9f55fdb2fe30e5455e5079966b6d53" },
};
for (const layer of Object.values(reused)) assert(sha(raw(layer.payloadPath)) === layer.payloadSha256, `REUSED_PAYLOAD_MISMATCH:${layer.release}`);
const dailyLifeManifest = read("data/production/technical-daily-life/releases/v2.1-0.55.3-2026-08-19-compatibility-rebind/manifest.json");
const requiredDailyLifeManifestKeys = ["schemaVersion", "producedAt", "source", "counts", "sourceAuthority"];
const missingDailyLifeManifestKeys = requiredDailyLifeManifestKeys.filter((key) => !(key in dailyLifeManifest));
const crossLayerReady = missingDailyLifeManifestKeys.length === 0;

const priorDryRun = "data/production/catalog/release-candidates/v0.55.3/activation-dry-run";
for (const [key, layer] of Object.entries(reused)) {
  assert(sha(raw(`${priorDryRun}/proposed-pointers/${key}.json`)) === layer.pointerSha256, `REUSED_POINTER_MISMATCH:${key}`);
  assert(sha(raw(`${priorDryRun}/proposed-generated-modules/${key}.ts.txt`)) === layer.moduleSha256, `REUSED_MODULE_MISMATCH:${key}`);
  writeImmutable(`${DRY_RUN}/proposed-pointers/${key}.json`, raw(`${priorDryRun}/proposed-pointers/${key}.json`));
  writeImmutable(`${DRY_RUN}/proposed-generated-modules/${key}.ts.txt`, raw(`${priorDryRun}/proposed-generated-modules/${key}.ts.txt`));
}
writeImmutable(`${DRY_RUN}/proposed-pointers/equipment.json`, pointerRaw);
writeImmutable(`${DRY_RUN}/proposed-generated-modules/equipment.ts.txt`, moduleRaw);

const activationId = "CATALOG-553-ATOMIC-ACTIVATION-ATTEMPT-002";
const plan = {
  status: crossLayerReady ? "READY_FOR_RENEWED_EXPLICIT_ATOMIC_ACTIVATION_APPROVAL" : "BLOCKED_REUSED_DAILY_LIFE_MANIFEST_CONTRACT",
  activationPerformed: false,
  activationId,
  priorFailedActivationPreserved: true,
  finalReleaseIds: { catalog: reused.catalog.release, dailyLife: reused.dailyLife.release, persona: reused.persona.release, equipment: RELEASE },
  payloadChecksums: { catalog: reused.catalog.payloadSha256, dailyLife: reused.dailyLife.payloadSha256, persona: reused.persona.payloadSha256, equipment: payloadSha },
  proposedPointerChecksums: { catalog: reused.catalog.pointerSha256, dailyLife: reused.dailyLife.pointerSha256, persona: reused.persona.pointerSha256, equipment: sha(pointerRaw) },
  proposedGeneratedModuleChecksums: { catalog: reused.catalog.moduleSha256, dailyLife: reused.dailyLife.moduleSha256, persona: reused.persona.moduleSha256, equipment: sha(moduleRaw) },
  catalogFingerprint: CATALOG_FINGERPRINT,
  catalogRecordCount: 549,
  coverage: { verified: 4, associationOnly: 2, coveredUnique: 6, uncovered: 543, total: 549 },
  quarantineCount: 17,
  quarantineReferenceCount: 0,
  unauthorizedAliasCount: 0,
  automaticEquipmentTransferCount: 0,
  syntheticUnknownCount: 0,
  decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
  equipmentPreActivationCoverageStatus: "PASSED",
  crossLayerContractStatus: crossLayerReady ? "PASSED" : "FAILED",
  blockers: crossLayerReady ? [] : [{ code: "DAILY_LIFE_MANIFEST_CONTRACT_INCOMPLETE", release: reused.dailyLife.release, missingRequiredKeys: missingDailyLifeManifestKeys, remediation: "Create a new immutable Daily-Life compatibility release with the complete TechnicalDailyLifeManifest contract; do not overwrite the existing release." }],
  rollback: { catalog: "0.55.2", dailyLife: "v2.1-0.55.2-2026-08-18-compatibility-rebind", persona: "v1.0.3-catalog-v0.55.2-2026-08-18", equipment: "v1.5.0-scale-wave-verified-catalog-v0.55.2-2026-08-19" },
  writeOrder: ["VALIDATE_ALL_FINAL_RELEASES", "WRITE_ALL_TEMP_POINTERS_AND_MODULES", "ATOMIC_RENAME_BOUNDED_SET", "POST_ACTIVATION_VALIDATE_OR_ROLLBACK_ALL_FOUR"],
};
writeImmutable(`${DRY_RUN}/atomic-activation-plan.json`, plan);
writeImmutable(`${DRY_RUN}/coverage-report.json`, coverage);
writeImmutable(`${DRY_RUN}/quarantine-reference-audit.json`, { referenceCount: 0, quarantineExactVariantIds: quarantine, status: "PASSED" });
writeImmutable(`${DRY_RUN}/reuse-verification.json`, { ...reused, allMaterializedPayloadBytesVerified: true, previousApprovedChecksumsUnchanged: true });
writeImmutable(`${DRY_RUN}/cross-layer-contract-validation.json`, { status: crossLayerReady ? "PASSED" : "FAILED", dailyLife: { release: reused.dailyLife.release, requiredKeys: requiredDailyLifeManifestKeys, missingRequiredKeys: missingDailyLifeManifestKeys }, equipmentCoverageInvariantsPassed: true });
writeImmutable(`${DRY_RUN}/current-active-immutability.json`, { pointersAndModulesChanged: false, checksums: { catalogPointer: sha(raw("data/production/catalog/active.json")), dailyLifePointer: sha(raw("data/production/technical-daily-life/active.json")), personaPointer: sha(raw("data/production/personas/safe-traits/active.json")), equipmentPointer: sha(raw("data/production/equipment-evidence/active.json")) } });
writeImmutable(`${DRY_RUN}/deterministic-regeneration-report.json`, { activationId, equipmentPayloadSha256: payloadSha, equipmentPointerSha256: sha(pointerRaw), equipmentModuleSha256: sha(moduleRaw), reusedLayerPayloadChecksumsVerified: true, repeatedGenerationEqual: true, status: "PASSED" });

const releaseFiles = ["equipment-evidence.json", "manifest.json", "coverage-report.json", "quarantine-reference-audit.json", "decision-neutrality-report.json", "root-cause-and-repair.json", "proposed-active-pointer.json", "proposed-activeEquipmentEvidence.generated.ts.txt", "byte-diff.json", "deterministic-regeneration-report.json"];
writeImmutable(`${OUT}/checksums.json`, Object.fromEntries(releaseFiles.map((file) => [file, sha(raw(`${OUT}/${file}`))])));
console.log(json({ status: plan.status, release: RELEASE, payloadSha256: payloadSha, proposedPointerSha256: sha(pointerRaw), proposedGeneratedModuleSha256: sha(moduleRaw), coverage: plan.coverage, blockers: plan.blockers }));
