import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { deriveEventBoundFoundationTargets, deriveEventBoundIntegrationTargets } from "../features/vehicle-data/equipmentPublicExplanationIntegrationActivation.server";

const root = process.cwd();
const launchId = "EPEI-PILOT-LAUNCH-V3";
const launchDir = path.join(root, "data/production/equipment-public-explanation-integration/governance/launch-preparations", launchId);
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (text: string) => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const id = (prefix: string, value: string) => `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 20).toUpperCase()}`;

async function main() {
const manifestText = await readFile(path.join(launchDir, "single-pilot-launch-manifest.json"), "utf8");
const manifest = JSON.parse(manifestText);
const checksums = JSON.parse(await readFile(path.join(launchDir, "checksums.json"), "utf8"));
if (sha(manifestText) !== checksums["single-pilot-launch-manifest.json"] || sha(manifestText) !== "sha256:24a6081aa7b052b3e3cd41475eb199babe6d484aeb6927d96072c1d8c5424354") throw new Error("LAUNCH_MANIFEST_CHECKSUM_INVALID");

const authorizedAt = new Date().toISOString();
const ownerStatement = await readFile(path.join(launchDir, "owner-single-pilot-launch-authorization.txt"), "utf8");
const ownerAuthorizationEventId = id("EPEI-LAUNCHAUTH", `${sha(manifestText)}|${authorizedAt}|EQUIPMENT_OWNER_001`);
const ownerAuthorizationEvent = { schemaVersion: "1.0.0", eventId: ownerAuthorizationEventId, eventType: "SINGLE_PILOT_LAUNCH_AUTHORIZED", ownerActorId: "EQUIPMENT_OWNER_001", manifestId: launchId,
  manifestChecksum: sha(manifestText), authorizedAt, timeSource: "SYSTEM_CLOCK_AT_APPLY", authorizationStatement: ownerStatement.trim(), status: "AUTHORIZED_FOR_ATOMIC_APPLY", excluded: manifest.excluded };
const ownerEventText = json(ownerAuthorizationEvent);
const ownerEventChecksum = sha(ownerEventText);

const foundationMaterializedAt = new Date().toISOString();
const foundationMaterializationId = id("REC-MAT", `${ownerEventChecksum}|${foundationMaterializedAt}|${manifest.foundation.productionPayloadChecksum}`);
const foundationMaterialization = { schemaVersion: "1.0.0", materializationEventId: foundationMaterializationId, status: "MATERIALIZED", releaseId: manifest.foundation.productionTargetReleaseId,
  payloadChecksum: manifest.foundation.productionPayloadChecksum, manifestChecksum: manifest.foundation.productionManifestChecksum, ownerAuthorizationEventId, ownerAuthorizationEventChecksum: ownerEventChecksum,
  materializedAt: foundationMaterializedAt, timeSource: "SYSTEM_CLOCK_AT_APPLY", databaseMigration: false };
const foundationMaterializationText = json(foundationMaterialization);

const cutoverAt = new Date().toISOString();
const cutoverEventId = id("REC-CUTOVER", `${ownerEventChecksum}|${cutoverAt}|${sha(foundationMaterializationText)}`);
const cutoverEvent = { schemaVersion: "1.0.0", cutoverEventId, status: "CUTOVER_ACTIVE", releaseId: manifest.foundation.productionTargetReleaseId, ownerAuthorizationEventId,
  ownerAuthorizationEventChecksum: ownerEventChecksum, foundationMaterializationEventId: foundationMaterializationId, foundationMaterializationEventChecksum: sha(foundationMaterializationText),
  cutoverAt, timeSource: "SYSTEM_CLOCK_AT_APPLY", sequencePolicyId: "REC_OFFER_AUDIT_SEQUENCE_V1", decisionEngineEffect: "ZERO" };
const cutoverEventText = json(cutoverEvent);
const cutoverEventChecksum = sha(cutoverEventText);
const foundationTargets = deriveEventBoundFoundationTargets({ releaseId: manifest.foundation.productionTargetReleaseId, payloadChecksum: manifest.foundation.productionPayloadChecksum,
  manifestChecksum: manifest.foundation.productionManifestChecksum, ownerAuthorizationEventId, ownerAuthorizationEventChecksum: ownerEventChecksum,
  cutoverEvent: { eventId: cutoverEventId, eventChecksum: cutoverEventChecksum, authorizationEventId: ownerAuthorizationEventId, cutoverAt, status: "CUTOVER_ACTIVE", synthetic: false } });
if (!foundationTargets.ok) throw new Error(`FOUNDATION_TARGET_INVALID:${foundationTargets.issues.join(",")}`);

const activatedAt = new Date().toISOString();
const activationEventId = id("EPEI-ACT", `${ownerEventChecksum}|${activatedAt}|${cutoverEventChecksum}`);
const activationEventSeed = { schemaVersion: "1.0.0", activationEventId, status: "ACTIVATED", authorizationEventId: ownerAuthorizationEventId, authorizationEventChecksum: ownerEventChecksum,
  launchManifestId: launchId, launchManifestChecksum: sha(manifestText), integrationReleaseId: manifest.integration.productionReleaseId, foundationCutoverEventId: cutoverEventId,
  foundationCutoverEventChecksum: cutoverEventChecksum, activatedAt, timeSource: "SYSTEM_CLOCK_AT_APPLY", publicEffect: "ENABLED_EXACT_TWO_VARIANTS_ONLY", decisionEngineEffect: "ZERO" };
const activationEventText = json(activationEventSeed);
const activationEventChecksum = sha(activationEventText);
const integrationTargets = deriveEventBoundIntegrationTargets({ launchManifestId: launchId, launchManifestChecksum: sha(manifestText), foundationProductionReleaseId: manifest.foundation.productionTargetReleaseId,
  foundationPayloadChecksum: manifest.foundation.productionPayloadChecksum, foundationManifestChecksum: manifest.foundation.productionManifestChecksum, runtimeContractCompositeChecksum: manifest.runtimeContractCompositeChecksum,
  activationPolicyChecksum: manifest.activationPolicyChecksum, productionReleaseId: manifest.integration.productionReleaseId, productionPayloadChecksum: manifest.integration.payloadChecksum,
  productionManifestChecksum: manifest.integration.manifestChecksum, productionCompositeChecksum: manifest.explanationStack.productionCompositeChecksum, activationAuthorizationManifestId: launchId,
  activationAuthorizationManifestChecksum: sha(manifestText), ownerAuthorization: { eventId: ownerAuthorizationEventId, eventChecksum: ownerEventChecksum, ownerActorId: "EQUIPMENT_OWNER_001", authorizedAt, synthetic: false, timeSource: "SYSTEM_CLOCK_AT_APPLY" },
  activationEvent: { eventId: activationEventId, eventChecksum: activationEventChecksum, authorizationEventId: ownerAuthorizationEventId, authorizationEventChecksum: ownerEventChecksum, activatedAt, synthetic: false, timeSource: "SYSTEM_CLOCK_AT_APPLY", applyResult: "SUCCESS" },
  pilotExactVariantIds: manifest.pilotScope.exactVariantIds, pilotScopeChecksum: manifest.pilotScopeChecksum, authorityRelease: manifest.explanationStack.publicExplanationAuthorityRelease,
  authorityPayloadChecksum: manifest.explanationStack.publicExplanationAuthorityChecksum, dailyLifeRelease: manifest.explanationStack.equipmentDailyLifeRelease,
  dailyLifePayloadChecksum: manifest.explanationStack.equipmentDailyLifeChecksum, rollbackTarget: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER" });
if (!integrationTargets.ok) throw new Error(`INTEGRATION_TARGET_INVALID:${integrationTargets.issues.join(",")}`);

const eventFiles = [
  [`data/production/equipment-public-explanation-integration/governance/launch-authorization-events/${ownerAuthorizationEventId}/owner-authorization-event.json`, ownerEventText],
  [`data/production/rec-offer-audit-foundation/governance/materialization-events/${foundationMaterializationId}/materialization-event.json`, foundationMaterializationText],
  [`data/production/rec-offer-audit-foundation/governance/cutover-events/${cutoverEventId}/cutover-event.json`, cutoverEventText],
  [`data/production/equipment-public-explanation-integration/governance/activation-events/${activationEventId}/activation-event.json`, activationEventText],
] as const;
for (const [relative, text] of eventFiles) { const target = path.join(root, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, text, { flag: "wx" }); }

const activeFiles = [
  ["data/production/rec-offer-audit-foundation/active.json", foundationTargets.pointerText],
  ["data/production/rec-offer-audit-foundation/activeRecOfferAuditFoundation.generated.ts", foundationTargets.generatedModule],
  ["data/production/equipment-public-explanation-integration/active.json", integrationTargets.pointerText],
  ["data/production/equipment-public-explanation-integration/activeEquipmentPublicExplanationIntegration.generated.ts", integrationTargets.generatedModule],
] as const;
for (const [relative, text] of activeFiles) { const target = path.join(root, relative); const temp = `${target}.tmp-${process.pid}`; await writeFile(temp, text); await rename(temp, target); }

const result = { schemaVersion: "1.0.0", status: "ACTIVATED", launchManifestId: launchId, ownerAuthorizationEventId, ownerAuthorizationEventChecksum: ownerEventChecksum,
  foundationMaterializationId, foundationMaterializationChecksum: sha(foundationMaterializationText), cutoverEventId, cutoverEventChecksum, activationEventId, activationEventChecksum,
  activatedAt, foundationPointerChecksum: foundationTargets.pointerChecksum, foundationGeneratedModuleChecksum: foundationTargets.generatedModuleChecksum,
  integrationPointerChecksum: integrationTargets.pointerChecksum, integrationGeneratedModuleChecksum: integrationTargets.generatedModuleChecksum, publicEffect: "ENABLED_EXACT_TWO_VARIANTS_ONLY", decisionEngineEffect: "ZERO" };
const resultPath = path.join(root, `data/production/equipment-public-explanation-integration/governance/activation-events/${activationEventId}/post-activation-result.json`);
await writeFile(resultPath, json(result));
console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
