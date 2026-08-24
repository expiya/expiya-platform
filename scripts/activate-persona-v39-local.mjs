import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = "data/production/personas";
const packageId = "PERSONA-V39-ACTIVATION-PREP-2026-08-24-01";
const packageRoot = `${base}/evidence/activation-preparations/${packageId}`;
const eventId = "PERSONA-V39-LOCAL-ACTIVATION-2026-08-24-01";
const eventRoot = `${base}/evidence/activation-events/${eventId}`;
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const write = (relative, value) => {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, typeof value === "string" ? value : json(value));
};

const packageManifest = JSON.parse(read(`${packageRoot}/manifest.json`));
for (const [file, checksum] of Object.entries(packageManifest.files)) {
  if (sha(read(`${packageRoot}/${file}`)) !== checksum) throw new Error(`ACTIVATION_PACKAGE_FILE_CHECKSUM_MISMATCH:${file}`);
}
const activationRequest = JSON.parse(read(`${packageRoot}/activation-request.json`));
if (activationRequest.status !== "AWAITING_EXPLICIT_OWNER_ACTIVATION_AUTHORIZATION" || activationRequest.activationPerformed) throw new Error("ACTIVATION_REQUEST_STATE_INVALID");

const candidateRoot = `${base}/safe-traits/release-candidates/${activationRequest.targetSafeTraitsRelease}`;
const candidatePayloadRaw = read(`${candidateRoot}/vehicle-persona-safe-traits.json`);
const candidateManifestRaw = read(`${candidateRoot}/manifest.json`);
const candidatePayload = JSON.parse(candidatePayloadRaw);
const candidateManifest = JSON.parse(candidateManifestRaw);
if (sha(candidatePayloadRaw) !== activationRequest.targetPayloadSha256 || candidateManifest.payloadSha256 !== activationRequest.targetPayloadSha256) throw new Error("TARGET_PAYLOAD_CHECKSUM_MISMATCH");
if (candidatePayload.families.length !== 385 || candidatePayload.variants.length !== 549) throw new Error("TARGET_COVERAGE_INVALID");
if (candidatePayload.families.reduce((count, family) => count + family.traits.length, 0) !== 595) throw new Error("TARGET_APPROVED_TRAIT_COUNT_INVALID");

const pointerPath = `${base}/safe-traits/active.json`;
const modulePath = `${base}/safe-traits/activeVehiclePersonaSafeTraits.generated.ts`;
const oldPointerRaw = read(pointerPath);
const oldModuleRaw = read(modulePath);
const rollback = JSON.parse(read(`${packageRoot}/rollback-plan.json`));
if (sha(oldPointerRaw) !== rollback.currentActivePointerSha256 || sha(oldModuleRaw) !== rollback.currentActiveModuleSha256) throw new Error("ACTIVE_STATE_CHANGED_SINCE_PREFLIGHT");

const approvalStatement = `${packageId} paketinin lokal active pointer aktivasyonunu onaylıyorum.`;
const existingEventPath = path.join(root, eventRoot, "activation-event.json");
const activatedAt = existsSync(existingEventPath) ? JSON.parse(read(`${eventRoot}/activation-event.json`)).activatedAt : new Date().toISOString();
const activationEvent = {
  schemaVersion: "persona-v3.9-local-activation-event.1",
  eventId,
  eventType: "PERSONA_SAFE_TRAITS_LOCAL_ACTIVATION_AUTHORIZED",
  actor: { role: "PRODUCT_OWNER", instanceId: "EXPIYA_CARS_PRODUCT_OWNER_001" },
  approvalStatement,
  approvalStatementSha256: sha(approvalStatement),
  packageId,
  packageManifestSha256: sha(read(`${packageRoot}/manifest.json`)),
  ownerApprovalEventId: activationRequest.ownerApprovalEventId,
  previousRelease: rollback.rollbackReleaseVersion,
  targetRelease: activationRequest.targetSafeTraitsRelease,
  targetPayloadSha256: activationRequest.targetPayloadSha256,
  scope: activationRequest.scope,
  activatedAt,
  databaseWriteAuthorized: false,
  deploymentAuthorized: false,
  appendOnly: true,
};
write(`${eventRoot}/activation-event.json`, activationEvent);
write(`${eventRoot}/approval-statement.txt`, `${approvalStatement}\n`);

const releaseRoot = `${base}/safe-traits/releases/${activationRequest.targetSafeTraitsRelease}`;
write(`${releaseRoot}/vehicle-persona-safe-traits.json`, candidatePayloadRaw);
write(`${releaseRoot}/manifest.json`, candidateManifestRaw);

let rollbackPerformed = false;
try {
  const proposedPointerRaw = read(`${packageRoot}/proposed-active-pointer.json`);
  const proposedModuleRaw = read(`${packageRoot}/proposed-activeVehiclePersonaSafeTraits.generated.ts.txt`);
  write(pointerPath, proposedPointerRaw);
  write(modulePath, proposedModuleRaw);
  const activePointer = JSON.parse(read(pointerPath));
  const activePayloadRaw = read(`${base}/safe-traits/releases/${activePointer.activeReleaseVersion}/vehicle-persona-safe-traits.json`);
  const activeManifest = JSON.parse(read(`${base}/safe-traits/releases/${activePointer.activeReleaseVersion}/manifest.json`));
  if (activePointer.activeReleaseVersion !== activationRequest.targetSafeTraitsRelease) throw new Error("POST_VALIDATION_RELEASE_MISMATCH");
  if (sha(activePayloadRaw) !== activePointer.payloadSha256 || activeManifest.payloadSha256 !== activePointer.payloadSha256) throw new Error("POST_VALIDATION_CHECKSUM_MISMATCH");
  if (read(modulePath) !== proposedModuleRaw) throw new Error("POST_VALIDATION_MODULE_MISMATCH");

  const postValidation = {
    status: "PASSED",
    eventId,
    releaseVersion: activePointer.activeReleaseVersion,
    payloadSha256: activePointer.payloadSha256,
    pointerSha256: sha(read(pointerPath)),
    moduleSha256: sha(read(modulePath)),
    familyCount: candidatePayload.families.length,
    variantCount: candidatePayload.variants.length,
    approvedTraitCount: 595,
    scoreCap: 0.75,
    invariants: activationRequest.invariants,
    validatedAt: activatedAt,
  };
  write(`${eventRoot}/post-validation.json`, postValidation);
  write(`${eventRoot}/activation-result.json`, {
    status: "ACTIVATED_AND_POST_VALIDATED",
    activationEventId: eventId,
    releases: { persona: activePointer.activeReleaseVersion },
    pointerChecksums: { personaPointer: postValidation.pointerSha256, personaModule: postValidation.moduleSha256 },
    rollbackPerformed: false,
    databaseWrite: false,
    deployment: false,
    commit: false,
    push: false,
  });
} catch (error) {
  rollbackPerformed = true;
  write(pointerPath, oldPointerRaw);
  write(modulePath, oldModuleRaw);
  write(`${eventRoot}/rollback-result.json`, { status: "ROLLED_BACK_AFTER_POST_VALIDATION_FAILURE", eventId, restoredRelease: rollback.rollbackReleaseVersion, restoredPointerSha256: sha(read(pointerPath)), restoredModuleSha256: sha(read(modulePath)), reason: error instanceof Error ? error.message : String(error) });
  throw error;
} finally {
  write(`${eventRoot}/manifest.json`, { eventId, packageId, targetRelease: activationRequest.targetSafeTraitsRelease, activationEventSha256: sha(read(`${eventRoot}/activation-event.json`)), activationResultSha256: existsSync(path.join(root, eventRoot, "activation-result.json")) ? sha(read(`${eventRoot}/activation-result.json`)) : null, postValidationSha256: existsSync(path.join(root, eventRoot, "post-validation.json")) ? sha(read(`${eventRoot}/post-validation.json`)) : null, rollbackPerformed });
}

console.log(read(`${eventRoot}/activation-result.json`));
