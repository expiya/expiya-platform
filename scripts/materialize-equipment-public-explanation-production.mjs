import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const DL_CANDIDATE_ID = "v1.0.1-catalog-v0.55.4-2026-08-20-candidate";
const AUTH_CANDIDATE_ID = "v0.1.2-catalog-v0.55.4-2026-08-20-candidate";
const DL_RELEASE_ID = "v1.0.1-catalog-v0.55.4-2026-08-20";
const AUTH_RELEASE_ID = "v0.1.2-catalog-v0.55.4-2026-08-20";
const EVENT_ID = "EPEA-OAE-AD0553D90F8B5E4DA497";
const EVENT_CHECKSUM = "sha256:989f27f22b0e1f6f5dde63738570c2d8e578cb34889c450a626df89ee25e2e6c";
const PREPARATION_ID = "EPEA-MATPREP-2DEF45CB3F980B81EE2D";
const PREPARATION_CHECKSUM = "sha256:782eed50ccee875e80075f6043e12a90b14a585319d034ebaa9e9ddfa33a69e4";
const DL_PAYLOAD_SHA = "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233";
const AUTH_PAYLOAD_SHA = "sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd";
const APPROVED_COMPOSITE_SHA = "sha256:59a65a589f1d04507c86ee68a3f573bfd28f8bfee8cce673f9547cfb37916222";
const COPY_SHA = "sha256:f1f5bc7acaf64f1c416d567d484115bd0600c33b6a98f7063ab8047d8ba93357";
const PRIVACY_SHA = "sha256:58f0bfcca9d2df5275402f1bbe2b2ca320a0bccb1a87804dc708356b29b2ee2d";
const TELEMETRY_SHA = "sha256:44c2b01de571afcb83749bcbcf315fe2e3e1b3b1ef47b2b0bb51c0ff3c7ef2c7";
const CATALOG_RELEASE = "v0.55.4";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const EQUIPMENT_RELEASE = "v1.5.5-catalog-v0.55.4-2026-08-20";
const EQUIPMENT_SHA = "sha256:0135bbfee468fa955d3d00d3129e0e7e01dae7bf9a980488450d8319ddc98d2e";
const STATEMENT = `EQUIPMENT_OWNER_001 olarak EPEA-MATPREP-2DEF45CB3F980B81EE2D hazırlığına ve sha256:782eed50ccee875e80075f6043e12a90b14a585319d034ebaa9e9ddfa33a69e4 checksum’una bağlı olarak, v1.0.1-catalog-v0.55.4-2026-08-20-candidate ve v0.1.2-catalog-v0.55.4-2026-08-20-candidate paketlerinin, sha256:59a65a589f1d04507c86ee68a3f573bfd28f8bfee8cce673f9547cfb37916222 composite binding’i korunarak sırasıyla v1.0.1-catalog-v0.55.4-2026-08-20 ve v0.1.2-catalog-v0.55.4-2026-08-20 immutable production release’lerine materialize edilmesini onaylıyorum. Bu onay active pointer veya generated module değişikliğini, aktivasyonu, public entegrasyonu, Decision Engine etkisini, deployment’ı, migration’ı, database write’ı, commit’i veya push’u kapsamaz.\n`;

const DL_CANDIDATE = join(ROOT, "data/production/equipment-daily-life/release-candidates", DL_CANDIDATE_ID);
const AUTH_ROOT = join(ROOT, "data/production/equipment-public-explanation-authority");
const AUTH_CANDIDATE = join(AUTH_ROOT, "release-candidates", AUTH_CANDIDATE_ID);
const DL_RELEASE = join(ROOT, "data/production/equipment-daily-life/releases", DL_RELEASE_ID);
const AUTH_RELEASE = join(AUTH_ROOT, "releases", AUTH_RELEASE_ID);
const GOV_ROOT = join(AUTH_ROOT, "governance");

const sortValue = (value) => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])) : value;
const canonical = (value) => `${JSON.stringify(sortValue(value), null, 2)}\n`;
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const shaJson = (value) => sha(canonical(value));
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const bytes = (path) => readFileSync(path);
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const write = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, canonical(value)); };
const writeBytes = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };
const logicalChecksum = (record, field) => { const payload = { ...record }; delete payload[field]; return shaJson(payload); };

function verifyChecksumFile(directory) {
  const checksums = read(join(directory, "checksums.json"));
  for (const [file, checksum] of Object.entries(checksums)) assert(sha(bytes(join(directory, file))) === checksum, `CHECKSUM_INVALID:${directory}:${file}`);
}

function validatePreconditions() {
  const eventDir = join(GOV_ROOT, "owner-approval-events", EVENT_ID);
  const prepDir = join(GOV_ROOT, "materialization-preparations", PREPARATION_ID);
  const event = read(join(eventDir, "owner-approval-event.json"));
  const prep = read(join(prepDir, "materialization-plan.json"));
  const manifest = read(join(GOV_ROOT, "owner-approval-manifests", event.manifestId, "approval-manifest.json"));
  const registry = read(join(ROOT, "data/production/equipment-evidence/governance/actor-registry.json"));
  const actor = registry.actors.find((item) => item.actorId === "EQUIPMENT_OWNER_001");
  const actorAttestation = bytes(join(ROOT, "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt"));
  assert(logicalChecksum(event, "eventChecksum") === EVENT_CHECKSUM && event.eventChecksum === EVENT_CHECKSUM, "OWNER_EVENT_CHECKSUM_INVALID");
  assert(actor?.status === "ACTIVE" && actor.role === "EQUIPMENT_OWNER_APPROVER" && actor.scope === "EQUIPMENT_EVIDENCE_ONLY", "OWNER_ACTOR_SCOPE_INVALID");
  assert(actor.authorizationStatementHash === sha(actorAttestation), "OWNER_ACTOR_ATTESTATION_INVALID");
  assert(event.manifestId === manifest.manifestId && event.manifestChecksum === manifest.manifestChecksum, "OWNER_EVENT_MANIFEST_BINDING_INVALID");
  assert(logicalChecksum(manifest, "manifestChecksum") === manifest.manifestChecksum, "OWNER_MANIFEST_CHECKSUM_INVALID");
  assert(logicalChecksum(prep, "preparationChecksum") === PREPARATION_CHECKSUM && prep.preparationChecksum === PREPARATION_CHECKSUM, "PREPARATION_CHECKSUM_INVALID");
  assert(prep.sourceOwnerApprovalEventId === EVENT_ID && prep.sourceOwnerApprovalEventChecksum === EVENT_CHECKSUM, "PREPARATION_OWNER_EVENT_BINDING_INVALID");
  verifyChecksumFile(eventDir); verifyChecksumFile(prepDir); verifyChecksumFile(DL_CANDIDATE); verifyChecksumFile(AUTH_CANDIDATE);
  assert(sha(bytes(join(DL_CANDIDATE, "equipment-daily-life.json"))) === DL_PAYLOAD_SHA, "DAILY_LIFE_CANDIDATE_INVALID");
  assert(sha(bytes(join(AUTH_CANDIDATE, "authority.json"))) === AUTH_PAYLOAD_SHA, "AUTHORITY_CANDIDATE_INVALID");
  assert(sha(bytes(join(AUTH_CANDIDATE, "approved-copy-registry.json"))) === COPY_SHA, "APPROVED_COPY_INVALID");
  assert(sha(bytes(join(AUTH_CANDIDATE, "privacy-retention-policy.json"))) === PRIVACY_SHA, "PRIVACY_POLICY_INVALID");
  assert(sha(bytes(join(AUTH_CANDIDATE, "public-telemetry-allowlist-policy.json"))) === TELEMETRY_SHA, "TELEMETRY_POLICY_INVALID");
  assert(sha(bytes(join(AUTH_CANDIDATE, "composite-binding.json"))) === APPROVED_COMPOSITE_SHA, "COMPOSITE_BINDING_INVALID");
  assert(event.legalDisposition === "LEGAL_AND_COPY_APPROVED" && event.consentDisposition === "NO_ADDITIONAL_CONSENT_REQUIRED", "LEGAL_DISPOSITION_INVALID");
  assert(event.approvedPackage.boundArtifacts.approvedCopyChecksum === COPY_SHA && event.approvedPackage.boundArtifacts.privacyPolicyChecksum === PRIVACY_SHA && event.approvedPackage.boundArtifacts.telemetryPolicyChecksum === TELEMETRY_SHA, "LEGAL_POLICY_BINDING_INVALID");
  assert(Date.parse(event.approvedAt) > Date.parse(manifest.preparedAt), "OWNER_APPROVAL_NOT_AFTER_PREPARATION");
  const authorityCandidate = read(join(AUTH_CANDIDATE, "authority.json"));
  const dailyCandidate = read(join(DL_CANDIDATE, "equipment-daily-life.json"));
  assert(dailyCandidate.entries.length === 51 && new Set(dailyCandidate.entries.map((x) => x.featureCode)).size === 51, "DAILY_LIFE_SCOPE_INVALID");
  assert(authorityCandidate.pilotExactVariantAllowlist.length === 2 && authorityCandidate.authorizedPositiveAssertionIds.length === 62 && authorityCandidate.authorizedNegativeAssertionIds.length === 3, "AUTHORITY_SCOPE_INVALID");
  assert(authorityCandidate.authorityTypes.join("|") === "POST_REVEAL_CONFIRMED_EXPLANATION|DIRECT_QUESTION_VERIFIED_ABSENCE", "AUTHORITY_TYPES_INVALID");
  const existingEvents = existsSync(join(GOV_ROOT, "materialization-authorization-events")) ? readdirSync(join(GOV_ROOT, "materialization-authorization-events")) : [];
  assert(new Set(existingEvents).size === existingEvents.length, "DUPLICATE_AUTHORIZATION_EVENT");
  for (const releaseRoot of [join(ROOT, "data/production/equipment-daily-life/releases"), join(AUTH_ROOT, "releases")]) {
    if (!existsSync(releaseRoot)) continue;
    for (const name of readdirSync(releaseRoot)) {
      const path = join(releaseRoot, name, "manifest.json");
      if (!existsSync(path)) continue;
      const item = read(path);
      assert(item.sourceCandidateReleaseId !== DL_CANDIDATE_ID && item.sourceCandidateReleaseId !== AUTH_CANDIDATE_ID, `TERMINAL_SUCCESSOR_ALREADY_EXISTS:${name}`);
    }
  }
  return { event, prep, manifest, authorityCandidate, dailyCandidate };
}

function build(materializedAt) {
  const statementChecksum = sha(STATEMENT);
  const authorizationPayload = {
    schemaVersion: "1.0.0", eventType: "IMMUTABLE_PRODUCTION_MATERIALIZATION_AUTHORIZED",
    ownerActorId: "EQUIPMENT_OWNER_001", ownerActorRole: "EQUIPMENT_OWNER_APPROVER", ownerActorScope: "EQUIPMENT_EVIDENCE_ONLY",
    sourceOwnerApprovalEventId: EVENT_ID, sourceOwnerApprovalEventChecksum: EVENT_CHECKSUM,
    materializationPreparationId: PREPARATION_ID, materializationPreparationChecksum: PREPARATION_CHECKSUM,
    approvedCompositeBindingChecksum: APPROVED_COMPOSITE_SHA,
    approvedMaterializations: [
      { sourceCandidateReleaseId: DL_CANDIDATE_ID, sourceCandidateChecksum: DL_PAYLOAD_SHA, materializedReleaseId: DL_RELEASE_ID },
      { sourceCandidateReleaseId: AUTH_CANDIDATE_ID, sourceCandidateChecksum: AUTH_PAYLOAD_SHA, materializedReleaseId: AUTH_RELEASE_ID },
    ],
    authorizationStatementChecksum: statementChecksum, authorizedAt: materializedAt,
    activationAuthorized: false, activePointerChangeAuthorized: false, generatedModuleChangeAuthorized: false,
    publicIntegrationAuthorized: false, decisionEngineEffectAuthorized: false, deploymentMigrationDatabaseWriteAuthorized: false,
    commitPushAuthorized: false, revocationPolicy: "APPEND_ONLY_REVOCATION_EVENT_REQUIRED",
  };
  const authorizationEventChecksum = shaJson(authorizationPayload);
  const authorizationEventId = `EPEA-MATAUTH-${authorizationEventChecksum.slice(7, 27).toUpperCase()}`;
  const authorizationEvent = { ...authorizationPayload, authorizationEventId, authorizationEventChecksum };
  const productionCompositeBinding = {
    schemaVersion: "1.0.0", bindingPolicy: "EQUIPMENT_PUBLIC_EXPLANATION_PRODUCTION_COMPOSITE_BINDING_V1",
    approvedCandidateCompositeBindingChecksum: APPROVED_COMPOSITE_SHA,
    equipmentDailyLife: { releaseId: DL_RELEASE_ID, payloadChecksum: DL_PAYLOAD_SHA },
    publicExplanationAuthority: { releaseId: AUTH_RELEASE_ID, payloadChecksum: AUTH_PAYLOAD_SHA },
    approvedCopyChecksum: COPY_SHA, privacyPolicyChecksum: PRIVACY_SHA, telemetryPolicyChecksum: TELEMETRY_SHA,
    ownerApprovalEventId: EVENT_ID, ownerApprovalEventChecksum: EVENT_CHECKSUM,
    materializationAuthorizationEventId: authorizationEventId, materializationAuthorizationEventChecksum: authorizationEventChecksum,
  };
  const productionCompositeBindingChecksum = shaJson(productionCompositeBinding);
  const common = {
    schemaVersion: "1.0.0", state: "OWNER_APPROVED_IMMUTABLE_RELEASE", materializedAt,
    canonicalSerializationVersion: "CANONICAL_JSON_SORTED_KEYS_V1",
    catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT,
    equipmentEvidenceRelease: EQUIPMENT_RELEASE, equipmentEvidenceChecksum: EQUIPMENT_SHA,
    approvedCompositeBindingChecksum: APPROVED_COMPOSITE_SHA, productionCompositeBindingChecksum,
    ownerApprovalEventId: EVENT_ID, ownerApprovalEventChecksum: EVENT_CHECKSUM,
    materializationPreparationId: PREPARATION_ID, materializationPreparationChecksum: PREPARATION_CHECKSUM,
    materializationAuthorizationEventId: authorizationEventId, materializationAuthorizationEventChecksum: authorizationEventChecksum,
    legalDisposition: "LEGAL_AND_COPY_APPROVED", consentDisposition: "NO_ADDITIONAL_CONSENT_REQUIRED",
    activationPerformed: false, activePointerUpdated: false, generatedModuleUpdated: false,
    publicIntegrationPerformed: false, decisionEngineEffect: "ZERO",
  };
  const dailyBase = {
    ...common, layer: "EQUIPMENT_DAILY_LIFE", sourceCandidateReleaseId: DL_CANDIDATE_ID,
    sourceCandidateChecksum: DL_PAYLOAD_SHA, materializedReleaseId: DL_RELEASE_ID, payloadChecksum: DL_PAYLOAD_SHA,
    boundEquipmentDailyLifeRelease: DL_RELEASE_ID, boundEquipmentDailyLifeChecksum: DL_PAYLOAD_SHA,
    boundPublicExplanationAuthorityRelease: AUTH_RELEASE_ID, boundPublicExplanationAuthorityChecksum: AUTH_PAYLOAD_SHA,
    authority: "EXPLANATION_ONLY", publicRuntimeActivation: false,
    featureCount: 51, unchangedFeatureCount: 46, legallyCorrectedFeatureCount: 5,
    rollbackPredecessor: { releaseId: "v1.0.0-catalog-v0.55.4-2026-08-20", payloadChecksum: "sha256:707748033c89c1623806ee4d432999bc9e66d471106c1eabc31178f653f9a27c" },
    supersessionHistory: { sourceCandidatePreserved: true, predecessorPreserved: true, supersedesReleaseId: "v1.0.0-catalog-v0.55.4-2026-08-20" },
  };
  const dailyManifestChecksum = shaJson(dailyBase);
  const dailyManifest = { ...dailyBase, manifestChecksum: dailyManifestChecksum };
  const authorityBase = {
    ...common, layer: "EQUIPMENT_PUBLIC_EXPLANATION_AUTHORITY", sourceCandidateReleaseId: AUTH_CANDIDATE_ID,
    sourceCandidateChecksum: AUTH_PAYLOAD_SHA, materializedReleaseId: AUTH_RELEASE_ID, payloadChecksum: AUTH_PAYLOAD_SHA,
    boundEquipmentDailyLifeRelease: DL_RELEASE_ID, boundEquipmentDailyLifeChecksum: DL_PAYLOAD_SHA,
    boundPublicExplanationAuthorityRelease: AUTH_RELEASE_ID, boundPublicExplanationAuthorityChecksum: AUTH_PAYLOAD_SHA,
    approvedCopyChecksum: COPY_SHA, privacyPolicyChecksum: PRIVACY_SHA, telemetryPolicyChecksum: TELEMETRY_SHA,
    exactVariantCount: 2, confirmedIncludedAssertionCount: 62, verifiedAbsenceCount: 3,
    verifiedAbsenceScope: "BYD_DOLPHIN_COMFORT_MY2025_ONLY",
    authorityTypes: ["POST_REVEAL_CONFIRMED_EXPLANATION", "DIRECT_QUESTION_VERIFIED_ABSENCE"],
    publicActivation: false, publicIntegration: false, globalEquipmentAuthority: "UNCHANGED",
    filteringAuthority: false, rankingAuthority: false, questionAuthority: false, offerOrderingAuthority: false,
    rollbackPredecessor: { state: "NO_ACTIVE_AUTHORITY_POINTER", releaseId: null, payloadChecksum: null },
    supersessionHistory: { candidatesPreserved: ["v0.1.0-catalog-v0.55.4-2026-08-20-candidate", "v0.1.1-catalog-v0.55.4-2026-08-20-candidate", AUTH_CANDIDATE_ID], terminalSuccessorOf: AUTH_CANDIDATE_ID },
    noClaimBoundary: { outsidePilotVariant: "NO_CLAIM", unknown: "NO_CLAIM", silentAbsence: "NO_CLAIM", associationOnly: "NO_CLAIM", legacyProvisionUnresolved: "NO_CLAIM", optionalOrPackageDependent: "NO_PUBLIC_CLAIM", conflict: "NO_CLAIM", nonBydNegativeEvidenceCount: 0, nissanVerifiedAbsenceCount: 0, llmCompletionAuthorityCount: 0, featureComparisonScoreCount: 0, candidateOrRankingEffectCount: 0 },
  };
  const authorityManifestChecksum = shaJson(authorityBase);
  const authorityManifest = { ...authorityBase, manifestChecksum: authorityManifestChecksum };
  const proposedDailyPointer = { schemaVersion: "1.0.0", state: "PROPOSED_NOT_ACTIVE", activeEquipmentDailyLifeRelease: DL_RELEASE_ID, compatibleCatalogRelease: CATALOG_RELEASE, compatibleCatalogFingerprint: CATALOG_FINGERPRINT, payloadSha256: DL_PAYLOAD_SHA, runtimeAuthority: "EXPLANATION_ONLY", activationApprovalRequired: true };
  const proposedDailyModule = `// Proposed only. Not active. Do not install without explicit composite activation approval.\nexport { default as activeEquipmentDailyLifePayload } from "./releases/${DL_RELEASE_ID}/equipment-daily-life.json";\nexport { default as activeEquipmentDailyLifeManifest } from "./releases/${DL_RELEASE_ID}/manifest.json";\nexport const activeEquipmentDailyLifeRelease = "${DL_RELEASE_ID}";\n`;
  const proposedAuthorityPointer = { schemaVersion: "1.0.0", state: "PROPOSED_NOT_ACTIVE", activePublicExplanationAuthorityRelease: AUTH_RELEASE_ID, payloadSha256: AUTH_PAYLOAD_SHA, productionCompositeBindingChecksum, publicActivation: false, publicIntegration: false, activationApprovalRequired: true };
  const proposedAuthorityModule = `// Proposed only. No active authority module currently exists.\nexport { default as activeEquipmentPublicExplanationAuthorityPayload } from "./releases/${AUTH_RELEASE_ID}/authority.json";\nexport { default as activeEquipmentPublicExplanationAuthorityManifest } from "./releases/${AUTH_RELEASE_ID}/manifest.json";\nexport const activeEquipmentPublicExplanationAuthorityRelease = "${AUTH_RELEASE_ID}";\n`;
  const activeDailyPointerPath = join(ROOT, "data/production/equipment-daily-life/active.json");
  const activeDailyModulePath = join(ROOT, "data/production/equipment-daily-life/activeEquipmentDailyLife.generated.ts");
  const dryRun = {
    schemaVersion: "1.0.0", finalDisposition: "READY_FOR_EXPLICIT_COMPOSITE_ACTIVATION_APPROVAL", generatedAt: materializedAt,
    activationPerformed: false, explicitCompositeActivationApprovalRequired: true,
    currentEquipmentDailyLife: { releaseId: read(activeDailyPointerPath).activeEquipmentDailyLifeRelease, pointerChecksum: sha(bytes(activeDailyPointerPath)), generatedModuleChecksum: sha(bytes(activeDailyModulePath)) },
    proposedEquipmentDailyLife: { releaseId: DL_RELEASE_ID, payloadChecksum: DL_PAYLOAD_SHA, pointerChecksum: sha(canonical(proposedDailyPointer)), generatedModuleChecksum: sha(proposedDailyModule) },
    currentPublicExplanationAuthority: { state: "NO_ACTIVE_POINTER_OR_GENERATED_MODULE", releaseId: null, pointerChecksum: null, generatedModuleChecksum: null },
    proposedPublicExplanationAuthority: { releaseId: AUTH_RELEASE_ID, payloadChecksum: AUTH_PAYLOAD_SHA, pointerChecksum: sha(canonical(proposedAuthorityPointer)), generatedModuleChecksum: sha(proposedAuthorityModule), publicActivation: false, publicIntegration: false },
    approvedCompositeBindingChecksum: APPROVED_COMPOSITE_SHA, productionCompositeBindingChecksum,
    catalogEquipmentCompatibility: "PASS", publicImportBoundary: "PASS_NO_PUBLIC_IMPORTS", decisionNeutrality: "PASS_ZERO_EFFECT",
    rollbackTargets: { equipmentDailyLifeReleaseId: "v1.0.0-catalog-v0.55.4-2026-08-20", publicExplanationAuthority: "NO_ACTIVE_POINTER" },
  };
  return { authorizationEvent, authorizationEventId, authorizationEventChecksum, productionCompositeBinding, productionCompositeBindingChecksum, dailyManifest, dailyManifestChecksum, authorityManifest, authorityManifestChecksum, proposedDailyPointer, proposedDailyModule, proposedAuthorityPointer, proposedAuthorityModule, dryRun };
}

function materialize() {
  validatePreconditions();
  const materializedAt = new Date().toISOString();
  const result = build(materializedAt);
  const authEventDir = join(GOV_ROOT, "materialization-authorization-events", result.authorizationEventId);
  const materializationDir = join(GOV_ROOT, "materializations", `EPEA-MAT-${result.authorizationEventChecksum.slice(7, 27).toUpperCase()}`);
  assert(!existsSync(authEventDir) && !existsSync(DL_RELEASE) && !existsSync(AUTH_RELEASE) && !existsSync(materializationDir), "DUPLICATE_MATERIALIZATION");
  writeBytes(join(authEventDir, "authorization-statement.txt"), STATEMENT);
  write(join(authEventDir, "authorization-event.json"), result.authorizationEvent);
  write(join(authEventDir, "checksums.json"), { "authorization-event.json": sha(canonical(result.authorizationEvent)), "authorization-statement.txt": sha(STATEMENT) });
  writeBytes(join(DL_RELEASE, "equipment-daily-life.json"), bytes(join(DL_CANDIDATE, "equipment-daily-life.json")));
  write(join(DL_RELEASE, "manifest.json"), result.dailyManifest);
  write(join(DL_RELEASE, "production-composite-binding.json"), { ...result.productionCompositeBinding, productionCompositeBindingChecksum: result.productionCompositeBindingChecksum });
  write(join(DL_RELEASE, "proposed-active-pointer.json"), result.proposedDailyPointer);
  writeBytes(join(DL_RELEASE, "proposed-activeEquipmentDailyLife.generated.ts.txt"), result.proposedDailyModule);
  write(join(DL_RELEASE, "checksums.json"), Object.fromEntries(["equipment-daily-life.json", "manifest.json", "production-composite-binding.json", "proposed-active-pointer.json", "proposed-activeEquipmentDailyLife.generated.ts.txt"].map((file) => [file, sha(bytes(join(DL_RELEASE, file)))])));
  for (const file of ["authority.json", "approved-copy-registry.json", "privacy-retention-policy.json", "public-telemetry-allowlist-policy.json"]) writeBytes(join(AUTH_RELEASE, file), bytes(join(AUTH_CANDIDATE, file)));
  write(join(AUTH_RELEASE, "manifest.json"), result.authorityManifest);
  write(join(AUTH_RELEASE, "production-composite-binding.json"), { ...result.productionCompositeBinding, productionCompositeBindingChecksum: result.productionCompositeBindingChecksum });
  write(join(AUTH_RELEASE, "proposed-active-pointer.json"), result.proposedAuthorityPointer);
  writeBytes(join(AUTH_RELEASE, "proposed-activeEquipmentPublicExplanationAuthority.generated.ts.txt"), result.proposedAuthorityModule);
  write(join(AUTH_RELEASE, "active-pointer-contract.schema.json"), { $schema: "https://json-schema.org/draft/2020-12/schema", title: "Equipment Public Explanation Authority Active Pointer", type: "object", required: ["schemaVersion", "state", "activePublicExplanationAuthorityRelease", "payloadSha256", "productionCompositeBindingChecksum"], properties: { schemaVersion: { const: "1.0.0" }, state: { enum: ["PROPOSED_NOT_ACTIVE", "ACTIVE"] }, activePublicExplanationAuthorityRelease: { type: "string" }, payloadSha256: { pattern: "^sha256:[a-f0-9]{64}$" }, productionCompositeBindingChecksum: { pattern: "^sha256:[a-f0-9]{64}$" }, publicActivation: { type: "boolean" }, publicIntegration: { type: "boolean" } }, additionalProperties: false });
  write(join(AUTH_RELEASE, "checksums.json"), Object.fromEntries(["authority.json", "approved-copy-registry.json", "privacy-retention-policy.json", "public-telemetry-allowlist-policy.json", "manifest.json", "production-composite-binding.json", "proposed-active-pointer.json", "proposed-activeEquipmentPublicExplanationAuthority.generated.ts.txt", "active-pointer-contract.schema.json"].map((file) => [file, sha(bytes(join(AUTH_RELEASE, file)))])));
  write(join(materializationDir, "activation-dry-run.json"), result.dryRun);
  write(join(materializationDir, "materialization-result.json"), { schemaVersion: "1.0.0", materializationId: materializationDir.split("/").at(-1), materializedAt, state: "OWNER_APPROVED_IMMUTABLE_RELEASE", releases: [{ releaseId: DL_RELEASE_ID, payloadChecksum: DL_PAYLOAD_SHA, manifestChecksum: result.dailyManifestChecksum }, { releaseId: AUTH_RELEASE_ID, payloadChecksum: AUTH_PAYLOAD_SHA, manifestChecksum: result.authorityManifestChecksum }], productionCompositeBindingChecksum: result.productionCompositeBindingChecksum, authorizationEventId: result.authorizationEventId, authorizationEventChecksum: result.authorizationEventChecksum, activationPerformed: false, activePointerUpdated: false, generatedModuleUpdated: false, publicIntegrationPerformed: false, decisionEngineEffect: "ZERO" });
  write(join(materializationDir, "checksums.json"), Object.fromEntries(["activation-dry-run.json", "materialization-result.json"].map((file) => [file, sha(bytes(join(materializationDir, file)))])));
  const rebuilt = build(materializedAt);
  assert(canonical(rebuilt.dailyManifest) === canonical(result.dailyManifest) && canonical(rebuilt.authorityManifest) === canonical(result.authorityManifest) && canonical(rebuilt.dryRun) === canonical(result.dryRun), "SECOND_GENERATION_NOT_BYTE_IDENTICAL");
  process.stdout.write(canonical({ materializedAt, materializationDirectory: materializationDir, dailyLifeReleaseId: DL_RELEASE_ID, dailyLifePayloadChecksum: DL_PAYLOAD_SHA, dailyLifeManifestChecksum: result.dailyManifestChecksum, authorityReleaseId: AUTH_RELEASE_ID, authorityPayloadChecksum: AUTH_PAYLOAD_SHA, authorityManifestChecksum: result.authorityManifestChecksum, productionCompositeBindingChecksum: result.productionCompositeBindingChecksum, authorizationEventId: result.authorizationEventId, authorizationEventChecksum: result.authorizationEventChecksum, dryRunDisposition: result.dryRun.finalDisposition, deterministicSecondGeneration: "BYTE_IDENTICAL" }));
}

materialize();
