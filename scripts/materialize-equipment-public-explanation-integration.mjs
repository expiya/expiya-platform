import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd(); const sha = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`; const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const prepId = "EPEI-MATPREP-C7F05BA7759AA54C8C07"; const releaseId = "v0.1.0-catalog-v0.55.4-2026-08-20";
const base = path.join(root, "data/production/equipment-public-explanation-integration"); const prepDir = path.join(base, "materialization-preparations", prepId);
const releaseDir = path.join(base, "releases", releaseId); const authDir = path.join(base, "authorization-events");
try { await access(path.join(releaseDir, "manifest.json")); throw new Error("DUPLICATE_TERMINAL_MATERIALIZATION"); } catch (error) { if (error instanceof Error && error.message === "DUPLICATE_TERMINAL_MATERIALIZATION") throw error; }
const preparationText = await readFile(path.join(prepDir, "materialization-preparation.json"), "utf8"); const preparation = JSON.parse(preparationText);
if (sha(preparationText) !== "sha256:92ab32dad54ca6243f6d5cb9d282b4721bed80ca13e4c4092db3724e3f732e39") throw new Error("PREPARATION_CHECKSUM_INVALID");
const ownerText = await readFile(path.join(prepDir, "owner-materialization-authorization.txt"), "utf8");
const authorizedAt = new Date().toISOString(); const eventCore = { schemaVersion: "1.0.0", eventType: "OWNER_MATERIALIZATION_AUTHORIZATION", ownerActor: "EQUIPMENT_OWNER_001", authorizedAt,
  preparationId: prepId, preparationChecksum: sha(preparationText), sourceCandidateReleaseId: preparation.candidateReleaseId, sourceCandidateChecksum: preparation.candidatePolicyChecksum,
  productionReleaseId: releaseId, productionPayloadChecksum: preparation.productionPayloadChecksum, productionManifestPreparationChecksum: preparation.productionManifestPreparationChecksum,
  productionCompositeChecksum: preparation.productionCompositeChecksum, activationAuthorized: false, ownerAuthorizationTextChecksum: sha(ownerText) };
const authorizationEventId = `EPEI-MATAUTH-${createHash("sha256").update(json(eventCore)).digest("hex").slice(0, 20).toUpperCase()}`;
const authorizationEventText = json({ ...eventCore, authorizationEventId }); const authorizationEventChecksum = sha(authorizationEventText);
const productionPolicyText = await readFile(path.join(prepDir, "prepared-production-policy.json"), "utf8");
if (sha(productionPolicyText) !== preparation.productionPayloadChecksum) throw new Error("PRODUCTION_PAYLOAD_PREPARATION_INVALID");
const manifestTemplateText = await readFile(path.join(prepDir, "prepared-production-manifest.json"), "utf8");
if (sha(manifestTemplateText) !== preparation.productionManifestPreparationChecksum) throw new Error("PRODUCTION_MANIFEST_PREPARATION_INVALID");
const manifest = { ...JSON.parse(manifestTemplateText), materializationAuthorizationEventId: authorizationEventId, materializationAuthorizationEventChecksum: authorizationEventChecksum, materializedAt: authorizedAt };
const manifestText = json(manifest); const manifestChecksum = sha(manifestText);
const materializationCore = { schemaVersion: "1.0.0", eventType: "IMMUTABLE_PRODUCTION_INTEGRATION_MATERIALIZED", productionReleaseId: releaseId,
  productionPayloadChecksum: preparation.productionPayloadChecksum, productionManifestChecksum: manifestChecksum, authorizationEventId, authorizationEventChecksum,
  preparationId: prepId, preparationChecksum: sha(preparationText), productionCompositeChecksum: preparation.productionCompositeChecksum, materializedAt: authorizedAt,
  activationPerformed: false, publicEffect: "DISABLED_NOT_ACTIVE" };
const materializationEventId = `EPEI-MAT-${createHash("sha256").update(json(materializationCore)).digest("hex").slice(0, 20).toUpperCase()}`;
const materializationEventText = json({ ...materializationCore, materializationEventId }); const materializationEventChecksum = sha(materializationEventText);
const activationManifest = { schemaVersion: "1.0.0-preparation", state: "PREPARED_NOT_AUTHORIZED", productionReleaseId: releaseId,
  productionPayloadChecksum: preparation.productionPayloadChecksum, productionManifestChecksum: manifestChecksum, materializationEventId, materializationEventChecksum,
  productionCompositeChecksum: preparation.productionCompositeChecksum, requiredOwnerActor: "EQUIPMENT_OWNER_001", ownerActivationAuthorizationEventId: null,
  activationEventId: null, activationEventChecksum: null, activationPerformed: false, publicEffect: "DISABLED_NOT_ACTIVE", decisionEngineEffect: "ZERO",
  targetFinalizationPolicy: "GENERATE_ACTIVE_POINTER_AND_MODULE_ONLY_AFTER_REAL_APPEND_ONLY_ACTIVATION_EVENT" };
const activationManifestText = json(activationManifest); const activationManifestChecksum = sha(activationManifestText);
const activationDryRun = { schemaVersion: "1.0.0", disposition: "READY_FOR_SEPARATE_ACTIVATION_AUTHORIZATION_PREPARATION", productionReleaseId: releaseId,
  productionPayloadChecksum: preparation.productionPayloadChecksum, productionManifestChecksum: manifestChecksum, authorizationEventId, authorizationEventChecksum,
  materializationEventId, materializationEventChecksum, activationManifestPreparationChecksum: activationManifestChecksum,
  activePointerChecksum: "DEFERRED_UNTIL_REAL_ACTIVATION_EVENT", activeGeneratedModuleChecksum: "DEFERRED_UNTIL_REAL_ACTIVATION_EVENT",
  publicEffect: "DISABLED_NOT_ACTIVE", currentActivePointer: "ABSENT", decisionEngineEffect: "ZERO", rollbackTarget: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER" };
await mkdir(releaseDir, { recursive: true }); await mkdir(authDir, { recursive: true });
await writeFile(path.join(authDir, `${authorizationEventId}.json`), authorizationEventText);
await writeFile(path.join(releaseDir, "policy.json"), productionPolicyText); await writeFile(path.join(releaseDir, "manifest.json"), manifestText);
await writeFile(path.join(releaseDir, "materialization-event.json"), materializationEventText);
await writeFile(path.join(releaseDir, "activation-manifest-preparation.json"), activationManifestText);
await writeFile(path.join(releaseDir, "activation-dry-run.json"), json(activationDryRun));
await writeFile(path.join(releaseDir, "checksums.json"), json({ "policy.json": preparation.productionPayloadChecksum, "manifest.json": manifestChecksum,
  "materialization-event.json": materializationEventChecksum, "activation-manifest-preparation.json": activationManifestChecksum, "activation-dry-run.json": sha(json(activationDryRun)) }));
console.log(JSON.stringify({ authorizationEventId, authorizationEventChecksum, materializationEventId, materializationEventChecksum, releaseId,
  productionPayloadChecksum: preparation.productionPayloadChecksum, productionManifestChecksum: manifestChecksum, activationManifestPreparationChecksum: activationManifestChecksum,
  publicEffect: "DISABLED_NOT_ACTIVE" }));
