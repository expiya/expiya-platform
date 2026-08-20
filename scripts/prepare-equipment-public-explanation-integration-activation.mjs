import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd(); const sha = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`; const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const base = path.join(root, "data/production/equipment-public-explanation-integration"); const release = "v0.1.0-catalog-v0.55.4-2026-08-20";
const productionDir = path.join(base, "releases", release); const policyText = await readFile(path.join(productionDir, "policy.json"), "utf8"); const policy = JSON.parse(policyText);
const manifestText = await readFile(path.join(productionDir, "manifest.json"), "utf8"); const materializationText = await readFile(path.join(productionDir, "materialization-event.json"), "utf8");
const authorizationText = await readFile(path.join(base, "authorization-events/EPEI-MATAUTH-7F0477181DFAEDFE91E5.json"), "utf8");
const existingPreparationText = await readFile(path.join(productionDir, "activation-manifest-preparation.json"), "utf8");
const registry = JSON.parse(await readFile(path.join(root, "data/production/equipment-evidence/governance/actor-registry.json"), "utf8"));
const actor = registry.actors.find((item) => item.actorId === "EQUIPMENT_OWNER_001");
if (!actor || actor.status !== "ACTIVE" || actor.role !== "EQUIPMENT_OWNER_APPROVER" || actor.scope !== "EQUIPMENT_EVIDENCE_ONLY" || actor.forbiddenActions.includes("GRANT_DECISION_AUTHORITY") === false) throw new Error("OWNER_SCOPE_INVALID");
if (sha(policyText) !== "sha256:7fb57a834501114eafe16f6ea601aceea8e5cc4a51994129ff0161f1867ad1e5" || sha(manifestText) !== "sha256:b563f9b2577a2f5fe3ffcd34637aa7ae6fbada913ed63cd8b6f3f5abefdb33ff" || sha(materializationText) !== "sha256:6ac51381fcc8f71b989dced8c636f2b77b8384756f0bc703e83783f28a6eaf38" || sha(authorizationText) !== "sha256:bbf539d8c90f5c1050d43e9574a0ab874a3d0ac4279c0a4f4f9416627ed95436" || sha(existingPreparationText) !== "sha256:57937b6ab6304eb94eeedab4dccddd47758695d3f8ed034c56bd428d61a7cf64") throw new Error("IMMUTABLE_INPUT_CHECKSUM_INVALID");
const materialization = JSON.parse(materializationText); const materializationAuthorization = JSON.parse(authorizationText);
const pilotScope = { exactVariantIds: policy.pilotExactVariantIds, confirmedIncludedCount: 62, verifiedAbsenceCount: 3, verifiedAbsenceExactVariantIds: ["6cb56615-37ef-51a8-9202-a73e59d4e14b"], nissanVerifiedAbsenceCount: 0,
  outsidePilotBehavior: "NO_CTA_NO_CLAIM", unknownAssociationUnresolvedBehavior: "NO_CONFIRMED_CLAIM", recAcceptanceBeforeRevealRequired: true, sessionScope: "CURRENT_VEHICLE_SESSION_ONLY", telemetryPolicy: "UNCHANGED_ALLOWLIST_EVENTTYPE_OUTCOME_SCOPE" };
const pilotScopeChecksum = sha(json(pilotScope));
const core = { schemaVersion: "1.0.0", priorActivationPreparationChecksum: sha(existingPreparationText), ownerActorId: "EQUIPMENT_OWNER_001", ownerActorRole: actor.role, ownerActorScope: actor.scope,
  ownerScopeDisposition: "BOUND_EQUIPMENT_EXPLANATION_SELECTION_ONLY_NO_DECISION_AUTHORITY", productionReleaseId: release, productionPayloadChecksum: sha(policyText), productionManifestChecksum: sha(manifestText),
  productionCompositeChecksum: policy.productionCompositeChecksum, materializationAuthorizationId: materializationAuthorization.authorizationEventId, materializationAuthorizationChecksum: sha(authorizationText),
  materializationEventId: materialization.materializationEventId, materializationEventChecksum: sha(materializationText), catalogRelease: policy.compatibleCatalogRelease, catalogFingerprint: policy.compatibleCatalogFingerprint,
  equipmentEvidenceRelease: policy.compatibleEquipmentRelease, equipmentEvidenceChecksum: policy.compatibleEquipmentChecksum, equipmentDailyLifeRelease: policy.dailyLifeRelease, equipmentDailyLifeChecksum: policy.dailyLifePayloadChecksum,
  publicExplanationAuthorityRelease: policy.authorityRelease, publicExplanationAuthorityChecksum: policy.authorityPayloadChecksum, pilotScope, pilotScopeChecksum,
  legalDisposition: policy.legalDisposition, consentDisposition: policy.consentDisposition, deterministicActivationPolicyId: "EPEI_EVENT_BOUND_ATOMIC_ACTIVATION_V1", deterministicActivationPolicyVersion: "1.0.0",
  pointerSchemaVersion: "1.0.0", generatedModulePolicyId: "EPEI_POINTER_SEMANTIC_MIRROR_V1", generatedModulePolicyVersion: "1.0.0", canonicalSerializationPolicy: "UTF8_JSON_PRETTY_2_LF_FINAL_NEWLINE_V1",
  hashPolicy: "SHA256_PREFIXED_LOWERCASE_HEX_V1", realTimePolicy: "SYSTEM_CLOCK_ACTUAL_CANONICAL_UTC_Z_AT_APPLY_NO_PREDECLARED_INSTANT", atomicInstallPolicy: "TEMP_VALIDATE_THEN_ATOMIC_TWO_FILE_REPLACE_V1",
  postValidationPolicy: "FULL_EVENT_POINTER_MODULE_LOADER_CHECKSUM_CHAIN_V1", rollbackPolicy: "FAIL_CLOSED_REMOVE_POINTER_AND_INSTALL_DISABLED_UNCONFIGURED_MODULE_PRESERVE_FAILED_EVENT_V1",
  rollbackTarget: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER", decisionEngineEffect: "ZERO", explicitOwnerAuthorizationRequired: true, activationPerformed: false };
const activationPreparationId = `EPEI-ACTPREP-${createHash("sha256").update(json(core)).digest("hex").slice(0, 20).toUpperCase()}`;
const activationAuthorizationManifest = { ...core, activationPreparationId, eventRoles: { ownerAuthorizationEvent: "OWNER_STATEMENT_AND_MANIFEST_POLICY_AUTHORIZATION", activationEvent: "ACTUAL_ATOMIC_APPLY_RESULT_AND_EFFECTIVE_INSTANT" },
  deterministicSequence: ["APPEND_OWNER_AUTHORIZATION_EVENT", "APPEND_ACTIVATION_APPLY_EVENT", "DERIVE_EVENT_BOUND_POINTER", "DERIVE_MODULE_FROM_POINTER", "TEMP_SCHEMA_AND_LOADER_SIMULATION", "ATOMIC_TWO_FILE_INSTALL", "POST_VALIDATION", "ROLLBACK_ON_ANY_FAILURE"],
  activeTargetChecksumPolicy: "DERIVED_AND_REPORTED_AFTER_REAL_EVENTS_NEVER_PREAPPROVED", publicFacadeOnly: true, routeUiExpansionAuthorized: false, deploymentCommitPushMigrationDatabaseWriteAuthorized: false };
const manifestOutText = json(activationAuthorizationManifest); const activationAuthorizationManifestChecksum = sha(manifestOutText);
const dryRun = { schemaVersion: "1.0.0", disposition: "READY_FOR_DETERMINISTIC_EVENT_BOUND_ACTIVATION_AUTHORIZATION", activationPreparationId, activationAuthorizationManifestChecksum,
  deterministicActivationPolicyId: core.deterministicActivationPolicyId, deterministicActivationPolicyVersion: core.deterministicActivationPolicyVersion,
  immutableInputsVerified: true, ownerScope: "PASS_BOUNDED_NO_DECISION_AUTHORITY", simulationFixtureOnly: true, simulationProductionChecksumReportable: false,
  realActivePointerChecksum: "DERIVED_AFTER_REAL_OWNER_AUTHORIZATION_AND_ACTIVATION_EVENTS", realActiveGeneratedModuleChecksum: "DERIVED_AFTER_REAL_OWNER_AUTHORIZATION_AND_ACTIVATION_EVENTS",
  atomicFailureRollback: "PASS_DISABLED_NO_ACTIVE_INTEGRATION_POINTER", publicEffect: "DISABLED_NOT_ACTIVE", decisionEngineEffect: "ZERO" };
const ownerText = `EQUIPMENT_OWNER_001 olarak ${activationPreparationId} kimlikli ve ${activationAuthorizationManifestChecksum} checksum'lı Equipment Public Explanation Integration activation authorization manifestini onaylıyorum. Bu onay ${release} release'ine, sha256:7fb57a834501114eafe16f6ea601aceea8e5cc4a51994129ff0161f1867ad1e5 payload'a, sha256:b563f9b2577a2f5fe3ffcd34637aa7ae6fbada913ed63cd8b6f3f5abefdb33ff production manifestine, sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082 composite binding'e ve EPEI-MAT-D1A71CF56D8B25DD452D materialization eventine bağlıdır. Exact ACTIVE pointer ve generated module checksum'larının gerçek event oluşmadan bilinemeyeceğini; EPEI_EVENT_BOUND_ATOMIC_ACTIVATION_V1 sürüm 1.0.0 deterministic transformation policy'siyle gerçek owner authorization ve activation eventlerinden türetilip post-validation raporunda yayınlanacağını kabul ediyorum. Aktivasyon yalnız 6cb56615-37ef-51a8-9202-a73e59d4e14b ve 90e65f94-6fdb-5eea-ad7e-0b4e18435427 exact varyantlarını kapsar; Decision Engine filtering, ranking, question ve offer-order etkisi ZERO kalır. Her uyuşmazlıkta DISABLED_NO_ACTIVE_INTEGRATION_POINTER fail-closed rollback uygulanmasını onaylıyorum. Bu onay deployment, commit, push, migration veya database write'ı kapsamaz.\n`;
const out = path.join(base, "governance/activation-preparations", activationPreparationId); await mkdir(out, { recursive: true });
const files = { "activation-authorization-manifest.json": manifestOutText, "activation-dry-run.json": json(dryRun), "owner-activation-authorization.txt": ownerText };
for (const [name, text] of Object.entries(files)) await writeFile(path.join(out, name), text);
await writeFile(path.join(out, "checksums.json"), json(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, sha(text)]))));
if (process.argv.includes("--check")) for (const [name, expected] of Object.entries(files)) if (await readFile(path.join(out, name), "utf8") !== expected) throw new Error(`NON_DETERMINISTIC:${name}`);
console.log(JSON.stringify({ activationPreparationId, activationAuthorizationManifestChecksum, pilotScopeChecksum, disposition: dryRun.disposition }));
