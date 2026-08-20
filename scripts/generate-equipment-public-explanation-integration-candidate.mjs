import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const candidateReleaseId = "v0.1.0-catalog-v0.55.4-2026-08-20-candidate";
const productionReleaseId = "v0.1.0-catalog-v0.55.4-2026-08-20";
const candidateDir = path.join(root, "data/production/equipment-public-explanation-integration/release-candidates", candidateReleaseId);
const sha = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const policyText = await readFile(path.join(candidateDir, "policy.json"), "utf8");
const candidateManifestText = await readFile(path.join(candidateDir, "manifest.json"), "utf8");
const candidatePolicyChecksum = sha(policyText);
const candidateManifestChecksum = sha(candidateManifestText);
if (candidatePolicyChecksum !== "sha256:5967f73efb1e86bb61d27919b07ad6506d6525136baa56983ca8b1f4c4caaedc") throw new Error("CANDIDATE_POLICY_IMMUTABILITY_FAILED");
if (candidateManifestChecksum !== "sha256:13d4222163cb2a4f54586005fbc86312a6bc51b63eaadcc7504f9b21ff11239a") throw new Error("CANDIDATE_MANIFEST_IMMUTABILITY_FAILED");
const candidate = JSON.parse(policyText);
const candidateManifest = JSON.parse(candidateManifestText);
if (candidateManifest.state !== "PROPOSED_NOT_ACTIVE" || candidateManifest.publicEffect !== "DISABLED_PENDING_EXPLICIT_APPROVAL" || candidateManifest.activationPerformed !== false) throw new Error("CANDIDATE_LIFECYCLE_INVALID");
const productionPolicy = { ...candidate, schemaVersion: "1.0.0", releaseId: productionReleaseId, state: "MATERIALIZED_NOT_ACTIVE", publicEffect: "DISABLED_NOT_ACTIVE",
  activePointerCreated: false, publicRouteActivated: false, generatedModuleActivated: false, explicitActivationApprovalRequired: true };
const productionPolicyText = json(productionPolicy); const productionPayloadChecksum = sha(productionPolicyText);

const productionManifestTemplate = {
  schemaVersion: "1.0.0", releaseId: productionReleaseId, state: "MATERIALIZED_NOT_ACTIVE", sourceCandidateReleaseId: candidateReleaseId,
  sourceCandidateChecksum: candidatePolicyChecksum, sourceCandidateManifestChecksum: candidateManifestChecksum, payloadChecksum: productionPayloadChecksum,
  productionCompositeChecksum: candidate.productionCompositeChecksum, authorityRelease: candidate.authorityRelease, authorityPayloadChecksum: candidate.authorityPayloadChecksum,
  dailyLifeRelease: candidate.dailyLifeRelease, dailyLifePayloadChecksum: candidate.dailyLifePayloadChecksum, compatibleCatalogRelease: candidate.compatibleCatalogRelease,
  compatibleCatalogFingerprint: candidate.compatibleCatalogFingerprint, legalDisposition: candidate.legalDisposition, consentDisposition: candidate.consentDisposition,
  pilotVariantCount: 2, confirmedIncludedCount: 62, verifiedAbsenceCount: 3, materializationAuthorizationRequired: true,
  materializationAuthorizationEventId: null, materializedAt: null, materializedAtPolicy: "SET_TO_ACTUAL_CANONICAL_UTC_Z_AT_MATERIALIZATION",
  activationPerformed: false, publicEffect: "DISABLED_NOT_ACTIVE", rollbackTarget: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER"
};
const productionManifestTemplateText = json(productionManifestTemplate);
const productionManifestPreparationChecksum = sha(productionManifestTemplateText);
const preparationCore = { schemaVersion: "1.0.0", kind: "OWNER_APPROVED_PRODUCTION_INTEGRATION_MATERIALIZATION_PREPARATION", candidateReleaseId,
  candidatePolicyChecksum, candidateManifestChecksum, productionReleaseId, productionPayloadChecksum, productionManifestPreparationChecksum,
  productionCompositeChecksum: candidate.productionCompositeChecksum, activationAuthorized: false, publicEffect: "DISABLED_NOT_ACTIVE" };
const preparationId = `EPEI-MATPREP-${createHash("sha256").update(json(preparationCore)).digest("hex").slice(0, 20).toUpperCase()}`;
const preparation = { ...preparationCore, preparationId, requiredOwnerActor: "EQUIPMENT_OWNER_001", productionManifestFinalizationPolicy: "REPLACE_NULL_AUTHORIZATION_AND_TIME_ONLY_AFTER_CHECKSUM_BOUND_OWNER_AUTHORIZATION",
  activeTargetFinalizationPolicy: "DEFER_UNTIL_IMMUTABLE_PRODUCTION_MANIFEST_AND_SEPARATE_ACTIVATION_EVENT_EXIST" };
const preparationText = json(preparation); const preparationChecksum = sha(preparationText);
const dryRun = { schemaVersion: "1.0.0", disposition: "READY_FOR_SEPARATE_MATERIALIZATION_AUTHORIZATION", currentIntegrationState: "NO_ACTIVE_POINTER_DISABLED",
  invalidatedPreviousTargets: { pointerChecksum: "sha256:6c89416513bf0fca5fc1a931f3507d5ea1e8a817241bea523b55ac4dddedab37", generatedModuleChecksum: "sha256:1d85a58c7d090fbc4c7d3d1af714d9efd849354d93437e51c3c6410ed6b0d93c", status: "INVALIDATED_DO_NOT_ACTIVATE" },
  preparationId, preparationChecksum, productionReleaseId, productionPayloadChecksum, productionManifestPreparationChecksum,
  productionManifestChecksum: "DEFERRED_UNTIL_OWNER_AUTHORIZED_MATERIALIZATION_WITH_ACTUAL_CANONICAL_UTC_Z",
  activePointerChecksum: "DEFERRED_UNTIL_PRODUCTION_MANIFEST_AND_ACTIVATION_EVENT_EXIST", activeGeneratedModuleChecksum: "DEFERRED_UNTIL_PRODUCTION_MANIFEST_AND_ACTIVATION_EVENT_EXIST",
  activationManifestChecksum: "NOT_CREATED", activationEventChecksum: "NOT_CREATED", productionCompositeChecksum: candidate.productionCompositeChecksum,
  candidateManifestActiveAuthority: false, materializedNotActiveManifestActiveAuthority: false, publicIntegrationEnabled: false, decisionEngineEffect: "ZERO",
  runtimeChainRequired: ["IMMUTABLE_PRODUCTION_RELEASE", "PRODUCTION_MANIFEST", "ACTIVATION_MANIFEST", "OWNER_ACTIVATION_AUTHORIZATION", "APPEND_ONLY_ACTIVATION_EVENT", "ACTIVE_POINTER_AND_MODULE"],
  rollbackTarget: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER" };
const ownerAuthorization = `EQUIPMENT_OWNER_001 olarak ${candidateReleaseId} kimlikli ve ${candidatePolicyChecksum} checksum'lı Equipment Public Explanation Integration candidate policy'sinin, ${productionReleaseId} kimlikli ve ${productionPayloadChecksum} payload checksum'lı immutable production release'ine; ${preparationId} kimlikli ve ${preparationChecksum} checksum'lı materialization preparation ile ${productionManifestPreparationChecksum} checksum'lı production manifest hazırlığına ve ${candidate.productionCompositeChecksum} production composite binding'ine bağlı olarak materialize edilmesini onaylıyorum. Bu onay aktivasyonu, active pointer veya generated module değişikliğini, public effect'in açılmasını, Decision Engine etkisini, deployment'ı, migration'ı, database write'ı, commit'i veya push'u kapsamaz.\n`;
const out = path.join(root, "data/production/equipment-public-explanation-integration/materialization-preparations", preparationId);
await mkdir(out, { recursive: true });
const files = { "materialization-preparation.json": preparationText, "prepared-production-policy.json": productionPolicyText, "prepared-production-manifest.json": productionManifestTemplateText, "corrected-activation-dry-run.json": json(dryRun), "owner-materialization-authorization.txt": ownerAuthorization };
for (const [name, text] of Object.entries(files)) await writeFile(path.join(out, name), text);
await writeFile(path.join(out, "checksums.json"), json(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, sha(text)]))));
if (process.argv.includes("--check")) for (const [name, expected] of Object.entries(files)) if (await readFile(path.join(out, name), "utf8") !== expected) throw new Error(`NON_DETERMINISTIC:${name}`);
console.log(JSON.stringify({ candidatePolicyChecksum, candidateManifestChecksum, preparationId, preparationChecksum, productionReleaseId, productionPayloadChecksum, productionManifestPreparationChecksum, disposition: dryRun.disposition }));
