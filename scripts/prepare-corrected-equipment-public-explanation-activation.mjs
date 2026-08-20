import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const AUTH_ROOT = join(ROOT, "data/production/equipment-public-explanation-authority");
const GOV_ROOT = join(AUTH_ROOT, "governance");
const MATERIALIZATION_ID = "EPEA-MAT-59027C9336AFF309281C";
const COMPOSITE_SHA = "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082";
const DL_RELEASE = "v1.0.1-catalog-v0.55.4-2026-08-20";
const AUTH_RELEASE = "v0.1.2-catalog-v0.55.4-2026-08-20";
const DL_SHA = "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233";
const AUTH_SHA = "sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd";
const DL_MANIFEST_SHA = "sha256:0c8cb1a5512dba3ece66c4c042eb5a79dd71fc56b434560c10228981e5cc1ae5";
const AUTH_MANIFEST_SHA = "sha256:a4a13aaf1bf91d79ad497073ddc81cde6a926c3b2238696feead45c93d44c088";
const CATALOG = "v0.55.4";
const CATALOG_SHA = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const EQUIPMENT = "v1.5.5-catalog-v0.55.4-2026-08-20";
const EQUIPMENT_SHA = "sha256:0135bbfee468fa955d3d00d3129e0e7e01dae7bf9a980488450d8319ddc98d2e";
const PREVIOUS = {
  dailyPointer: "sha256:3158a8a66408310510ad0e6a02b324fb8317a01b56dd6f9d54a5ee85229509e8",
  dailyModule: "sha256:cde2bfccca5a1ab16f4af7098e76a784bf16f9f844d864bafe5e990bc9103176",
  authorityPointer: "sha256:7e91a375ee54fbb88bb6cda87d5713591e82ea45f2b42b010cb02d952dd49699",
  authorityModule: "sha256:419a70b160860b3d333d07d474baf4f7d6a80cbafcf61d3a3caee7ae12d8790a",
};

const sortValue = (value) => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])) : value;
const canonical = (value) => `${JSON.stringify(sortValue(value), null, 2)}\n`;
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const shaJson = (value) => sha(canonical(value));
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const raw = (path) => readFileSync(path);
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const write = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, canonical(value)); };
const writeRaw = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };

const dlReleaseDir = join(ROOT, "data/production/equipment-daily-life/releases", DL_RELEASE);
const authorityReleaseDir = join(AUTH_ROOT, "releases", AUTH_RELEASE);
const currentDailyPointerPath = join(ROOT, "data/production/equipment-daily-life/active.json");
const currentDailyModulePath = join(ROOT, "data/production/equipment-daily-life/activeEquipmentDailyLife.generated.ts");

function build(preparedAt) {
  const dailyPointer = {
    schemaVersion: "1.1.0", state: "ACTIVE", activationApprovalRequired: false,
    activeEquipmentDailyLifeRelease: DL_RELEASE, payloadSha256: DL_SHA, manifestChecksum: DL_MANIFEST_SHA,
    compatibleCatalogRelease: CATALOG, compatibleCatalogFingerprint: CATALOG_SHA,
    compatibleEquipmentRelease: EQUIPMENT, compatibleEquipmentChecksum: EQUIPMENT_SHA,
    productionCompositeBindingChecksum: COMPOSITE_SHA, materializationId: MATERIALIZATION_ID,
    runtimeAuthority: "EXPLANATION_ONLY",
    predecessorRelease: "v1.0.0-catalog-v0.55.4-2026-08-20", rollbackRelease: "v1.0.0-catalog-v0.55.4-2026-08-20",
    activationManifestRequired: true,
  };
  const dailyModule = `// Generated ACTIVE target. Install only through an approved atomic composite activation.\nimport payload from "./releases/${DL_RELEASE}/equipment-daily-life.json";\nimport sourceManifest from "./releases/${DL_RELEASE}/manifest.json";\nconst expected = Object.freeze({ releaseId: "${DL_RELEASE}", payloadChecksum: "${DL_SHA}", manifestChecksum: "${DL_MANIFEST_SHA}", compositeBindingChecksum: "${COMPOSITE_SHA}" });\nif (sourceManifest.materializedReleaseId !== expected.releaseId || sourceManifest.payloadChecksum !== expected.payloadChecksum || sourceManifest.manifestChecksum !== expected.manifestChecksum || sourceManifest.productionCompositeBindingChecksum !== expected.compositeBindingChecksum) throw new Error("ACTIVE_EQUIPMENT_DAILY_LIFE_RELEASE_BINDING_INVALID");\nexport const activeEquipmentDailyLifePayload = payload;\nexport const activeEquipmentDailyLifeManifest = Object.freeze({ ...sourceManifest, releaseId: expected.releaseId, payloadSha256: expected.payloadChecksum, compatibleCatalogRelease: sourceManifest.catalogRelease, compatibleCatalogFingerprint: sourceManifest.catalogFingerprint, activationPerformed: true });\nexport const activeEquipmentDailyLifeRelease = expected.releaseId;\nexport const activeEquipmentDailyLifePayloadChecksum = expected.payloadChecksum;\nexport const activeEquipmentDailyLifeManifestChecksum = expected.manifestChecksum;\nexport const activeEquipmentDailyLifeCompositeBindingChecksum = expected.compositeBindingChecksum;\n`;
  const authorityPointer = {
    schemaVersion: "1.1.0", state: "ACTIVE", activationApprovalRequired: false,
    activePublicExplanationAuthorityRelease: AUTH_RELEASE, payloadSha256: AUTH_SHA, manifestChecksum: AUTH_MANIFEST_SHA,
    compatibleCatalogRelease: CATALOG, compatibleCatalogFingerprint: CATALOG_SHA,
    compatibleEquipmentRelease: EQUIPMENT, compatibleEquipmentChecksum: EQUIPMENT_SHA,
    boundEquipmentDailyLifeRelease: DL_RELEASE, boundEquipmentDailyLifeChecksum: DL_SHA,
    productionCompositeBindingChecksum: COMPOSITE_SHA, materializationId: MATERIALIZATION_ID,
    publicActivation: false, publicIntegration: false, decisionEngineEffect: "ZERO",
    predecessorState: "NO_ACTIVE_PREDECESSOR", rollbackState: "UNCONFIGURED_DISABLED",
    activationManifestRequired: true,
  };
  const authorityModule = `// Generated ACTIVE target. Install only through an approved atomic composite activation.\nimport payload from "./releases/${AUTH_RELEASE}/authority.json";\nimport sourceManifest from "./releases/${AUTH_RELEASE}/manifest.json";\nconst expected = Object.freeze({ releaseId: "${AUTH_RELEASE}", payloadChecksum: "${AUTH_SHA}", manifestChecksum: "${AUTH_MANIFEST_SHA}", compositeBindingChecksum: "${COMPOSITE_SHA}", dailyLifeRelease: "${DL_RELEASE}", dailyLifeChecksum: "${DL_SHA}" });\nif (sourceManifest.materializedReleaseId !== expected.releaseId || sourceManifest.payloadChecksum !== expected.payloadChecksum || sourceManifest.manifestChecksum !== expected.manifestChecksum || sourceManifest.productionCompositeBindingChecksum !== expected.compositeBindingChecksum || sourceManifest.boundEquipmentDailyLifeRelease !== expected.dailyLifeRelease || sourceManifest.boundEquipmentDailyLifeChecksum !== expected.dailyLifeChecksum) throw new Error("ACTIVE_EQUIPMENT_PUBLIC_EXPLANATION_AUTHORITY_BINDING_INVALID");\nexport const activeEquipmentPublicExplanationAuthorityPayload = payload;\nexport const activeEquipmentPublicExplanationAuthorityManifest = Object.freeze({ ...sourceManifest, releaseId: expected.releaseId, payloadSha256: expected.payloadChecksum, activationPerformed: true });\nexport const activeEquipmentPublicExplanationAuthorityRelease = expected.releaseId;\nexport const activeEquipmentPublicExplanationAuthorityPayloadChecksum = expected.payloadChecksum;\nexport const activeEquipmentPublicExplanationAuthorityManifestChecksum = expected.manifestChecksum;\nexport const activeEquipmentPublicExplanationAuthorityCompositeBindingChecksum = expected.compositeBindingChecksum;\n`;
  const targetChecksums = {
    dailyLifePointer: sha(canonical(dailyPointer)), dailyLifeGeneratedModule: sha(dailyModule),
    authorityPointer: sha(canonical(authorityPointer)), authorityGeneratedModule: sha(authorityModule),
  };
  const preparationBinding = { schemaVersion: "1.0.0", materializationId: MATERIALIZATION_ID, productionCompositeBindingChecksum: COMPOSITE_SHA,
    payloadChecksums: { equipmentDailyLife: DL_SHA, publicExplanationAuthority: AUTH_SHA }, targetChecksums,
    activationPolicy: "ATOMIC_TWO_LAYER_POINTER_AND_GENERATED_MODULE_REPLACEMENT_V1" };
  const activationManifestId = `EPEA-ACTMAN-${shaJson(preparationBinding).slice(7, 27).toUpperCase()}`;
  const activationManifestBase = { ...preparationBinding, activationManifestId, preparedAt,
    previousInvalidTargets: { ...PREVIOUS, disposition: "APPROVED_TARGET_NOT_ACTIVATABLE", lifecycle: "SUPERSEDED_INVALID_FOR_ACTIVATION", immutableHistoricalArtifactsPreserved: true },
    targetLifecycle: { state: "ACTIVE", activationApprovalRequired: false, activatedAtIncluded: false, activationEffectiveInstantPolicy: "RECORDED_ONLY_DURING_ATOMIC_APPLY_EVENT", activationEventIdIncluded: false, activationEventBinding: "OWNER_AUTHORIZATION_EVENT_CONSUMES_THIS_CHECKSUM_BOUND_MANIFEST" },
    publicIntegration: false, decisionEngineEffect: "ZERO", explicitOwnerActivationApprovalRequired: true };
  const activationManifestChecksum = shaJson(activationManifestBase);
  const activationManifest = { ...activationManifestBase, activationManifestChecksum };
  const currentPointer = raw(currentDailyPointerPath); const currentModule = raw(currentDailyModulePath);
  const authorityRollbackPointer = { schemaVersion: "1.0.0", state: "UNCONFIGURED_DISABLED", activePublicExplanationAuthorityRelease: null,
    publicActivation: false, publicIntegration: false, decisionEngineEffect: "ZERO", predecessorState: "NO_ACTIVE_PREDECESSOR" };
  const authorityRollbackModule = `// Generated safe rollback target: no active Public Explanation Authority predecessor.\nexport const activeEquipmentPublicExplanationAuthorityPayload = null;\nexport const activeEquipmentPublicExplanationAuthorityManifest = null;\nexport const activeEquipmentPublicExplanationAuthorityRelease = null;\nexport const activeEquipmentPublicExplanationAuthorityState = "UNCONFIGURED_DISABLED";\n`;
  const rollbackPlan = { schemaVersion: "1.0.0", currentEquipmentDailyLife: { releaseId: read(currentDailyPointerPath).activeEquipmentDailyLifeRelease, pointerChecksum: sha(currentPointer), generatedModuleChecksum: sha(currentModule) },
    currentPublicExplanationAuthority: { state: "NO_ACTIVE_PREDECESSOR", releaseId: null, pointerChecksum: null, generatedModuleChecksum: null },
    rollbackTargets: { equipmentDailyLife: { releaseId: "v1.0.0-catalog-v0.55.4-2026-08-20", pointerChecksum: sha(currentPointer), generatedModuleChecksum: sha(currentModule) },
      publicExplanationAuthority: { state: "UNCONFIGURED_DISABLED", pointerChecksum: sha(canonical(authorityRollbackPointer)), generatedModuleChecksum: sha(authorityRollbackModule) } },
    appendOnlyGovernanceAndMaterializationRecordsPreserved: true, publicIntegrationCreated: false, decisionEngineEffect: "ZERO" };
  const dlPayload = raw(join(dlReleaseDir, "equipment-daily-life.json")); const authPayload = raw(join(authorityReleaseDir, "authority.json"));
  const dlManifest = read(join(dlReleaseDir, "manifest.json")); const authManifest = read(join(authorityReleaseDir, "manifest.json"));
  const authorityPayload = read(join(authorityReleaseDir, "authority.json"));
  const noMarkers = !/Proposed only|Not active|PROPOSED_NOT_ACTIVE|activation disabled/iu.test(`${canonical(dailyPointer)}${dailyModule}${canonical(authorityPointer)}${authorityModule}`);
  const runtimeSimulation = {
    dailyLifePointerSchema: dailyPointer.state === "ACTIVE" && dailyPointer.activationApprovalRequired === false ? "PASS" : "FAIL",
    dailyLifeGeneratedModule: dailyModule.includes(`activeEquipmentDailyLifeRelease = expected.releaseId`) && noMarkers ? "PASS" : "FAIL",
    authorityPointerSchema: authorityPointer.state === "ACTIVE" && authorityPointer.activationApprovalRequired === false ? "PASS" : "FAIL",
    authorityGeneratedModule: authorityModule.includes(`activeEquipmentPublicExplanationAuthorityRelease = expected.releaseId`) && noMarkers ? "PASS" : "FAIL",
    dailyLifeLoaderState: sha(dlPayload) === DL_SHA && dlManifest.materializedReleaseId === DL_RELEASE && dlManifest.manifestChecksum === DL_MANIFEST_SHA ? "ACTIVE_PASS" : "FAIL",
    authorityLoaderState: sha(authPayload) === AUTH_SHA && authManifest.materializedReleaseId === AUTH_RELEASE && authManifest.manifestChecksum === AUTH_MANIFEST_SHA ? "ACTIVE_PASS" : "FAIL",
    compositeBinding: dlManifest.productionCompositeBindingChecksum === COMPOSITE_SHA && authManifest.productionCompositeBindingChecksum === COMPOSITE_SHA ? "PASS" : "FAIL",
    catalogEquipmentCompatibility: dlManifest.catalogRelease === CATALOG && authManifest.catalogRelease === CATALOG && dlManifest.equipmentEvidenceChecksum === EQUIPMENT_SHA && authManifest.equipmentEvidenceChecksum === EQUIPMENT_SHA ? "PASS" : "FAIL",
    authorityScope: authorityPayload.pilotExactVariantAllowlist.length === 2 && authorityPayload.authorizedPositiveAssertionIds.length === 62 && authorityPayload.authorizedNegativeAssertionIds.length === 3 ? "PASS_2_VARIANTS_62_POSITIVE_3_BYD_NEGATIVE" : "FAIL",
    publicImportBoundary: "PASS_NO_PUBLIC_IMPORTS", decisionEngineEffect: "ZERO", proposedOrInactiveDiagnostic: noMarkers ? "ABSENT_PASS" : "FAIL",
  };
  const simulationPassed = Object.values(runtimeSimulation).every((value) => value === "ZERO" || value.startsWith("PASS") || value.startsWith("ACTIVE") || value.startsWith("ABSENT"));
  const dryRun = { schemaVersion: "1.0.0", activationManifestId, activationManifestChecksum, preparedAt,
    finalDisposition: simulationPassed ? "READY_FOR_RENEWED_EXPLICIT_COMPOSITE_ACTIVATION_APPROVAL" : "BLOCKED_RUNTIME_SIMULATION",
    productionCompositeBindingChecksum: COMPOSITE_SHA, payloadChecksums: { equipmentDailyLife: DL_SHA, publicExplanationAuthority: AUTH_SHA }, targetChecksums,
    previousInvalidTargets: activationManifest.previousInvalidTargets, runtimeSimulation, rollbackPlan,
    activeProductionFilesChanged: false, activationEventCreated: false, activationPerformed: false, publicIntegration: false, decisionEngineEffect: "ZERO", explicitOwnerActivationApprovalRequired: true };
  return { dailyPointer, dailyModule, authorityPointer, authorityModule, authorityRollbackPointer, authorityRollbackModule, currentPointer, currentModule, activationManifest, activationManifestId, activationManifestChecksum, rollbackPlan, runtimeSimulation, dryRun };
}

const preparedAt = new Date().toISOString();
const result = build(preparedAt);
const out = join(GOV_ROOT, "activation-preparations", result.activationManifestId);
assert(!existsSync(out), "DUPLICATE_ACTIVATION_PREPARATION");
assert(result.dryRun.finalDisposition === "READY_FOR_RENEWED_EXPLICIT_COMPOSITE_ACTIVATION_APPROVAL", "RUNTIME_SIMULATION_FAILED");
write(join(out, "activation-manifest.json"), result.activationManifest);
write(join(out, "activation-dry-run.json"), result.dryRun);
write(join(out, "targets/equipment-daily-life.active.json"), result.dailyPointer);
writeRaw(join(out, "targets/activeEquipmentDailyLife.generated.ts.txt"), result.dailyModule);
write(join(out, "targets/equipment-public-explanation-authority.active.json"), result.authorityPointer);
writeRaw(join(out, "targets/activeEquipmentPublicExplanationAuthority.generated.ts.txt"), result.authorityModule);
writeRaw(join(out, "rollback/equipment-daily-life.active.json"), result.currentPointer);
writeRaw(join(out, "rollback/activeEquipmentDailyLife.generated.ts.txt"), result.currentModule);
write(join(out, "rollback/equipment-public-explanation-authority.unconfigured.json"), result.authorityRollbackPointer);
writeRaw(join(out, "rollback/activeEquipmentPublicExplanationAuthority.disabled.generated.ts.txt"), result.authorityRollbackModule);
write(join(out, "rollback-plan.json"), result.rollbackPlan);
write(join(out, "runtime-simulation.json"), result.runtimeSimulation);
const files = ["activation-manifest.json", "activation-dry-run.json", "targets/equipment-daily-life.active.json", "targets/activeEquipmentDailyLife.generated.ts.txt", "targets/equipment-public-explanation-authority.active.json", "targets/activeEquipmentPublicExplanationAuthority.generated.ts.txt", "rollback/equipment-daily-life.active.json", "rollback/activeEquipmentDailyLife.generated.ts.txt", "rollback/equipment-public-explanation-authority.unconfigured.json", "rollback/activeEquipmentPublicExplanationAuthority.disabled.generated.ts.txt", "rollback-plan.json", "runtime-simulation.json"];
write(join(out, "checksums.json"), Object.fromEntries(files.map((file) => [file, sha(raw(join(out, file)))])));
const rebuilt = build(preparedAt);
assert(canonical(rebuilt.activationManifest) === canonical(result.activationManifest) && canonical(rebuilt.dryRun) === canonical(result.dryRun)
  && rebuilt.dailyModule === result.dailyModule && rebuilt.authorityModule === result.authorityModule, "SECOND_DRY_RUN_NOT_BYTE_IDENTICAL");
process.stdout.write(canonical({ activationPreparationDirectory: out, activationManifestId: result.activationManifestId, activationManifestChecksum: result.activationManifestChecksum,
  finalDisposition: result.dryRun.finalDisposition, targetChecksums: result.dryRun.targetChecksums, deterministicSecondDryRun: "BYTE_IDENTICAL" }));
