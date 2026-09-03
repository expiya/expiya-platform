import { describe, expect, it } from "vitest";
import manifest from "@/data/production/equipment-public-explanation-integration/governance/launch-preparations/EPEI-PILOT-LAUNCH-V9/single-pilot-launch-manifest.json";
import checksums from "@/data/production/equipment-public-explanation-integration/governance/launch-preparations/EPEI-PILOT-LAUNCH-V9/checksums.json";
import { deriveEventBoundFoundationTargets, deriveEventBoundIntegrationTargets, simulateAtomicIntegrationInstall } from "./equipmentPublicExplanationIntegrationActivation.server";

const owner = { eventId: "EPEI-ACTAUTH-TEST_ONLY", eventChecksum: `sha256:${"a".repeat(64)}`, ownerActorId: "EQUIPMENT_OWNER_001" as const, authorizedAt: "2026-08-20T14:00:00.000Z", synthetic: true, timeSource: "TEST_FIXTURE_ONLY" };
const event = { eventId: "EPEI-ACT-TEST_ONLY", eventChecksum: `sha256:${"b".repeat(64)}`, authorizationEventId: owner.eventId, authorizationEventChecksum: owner.eventChecksum, activatedAt: "2026-08-20T14:00:01.000Z", synthetic: true, timeSource: "TEST_FIXTURE_ONLY", applyResult: "SUCCESS" as const };
const input = () => ({ launchManifestId: manifest.manifestId, launchManifestChecksum: checksums["single-pilot-launch-manifest.json"], foundationProductionReleaseId: manifest.foundation.productionTargetReleaseId, foundationPayloadChecksum: manifest.foundation.productionPayloadChecksum, foundationManifestChecksum: manifest.foundation.productionManifestChecksum, runtimeContractCompositeChecksum: manifest.runtimeContractCompositeChecksum, activationPolicyChecksum: manifest.activationPolicyChecksum,
  productionReleaseId: manifest.integration.productionReleaseId, productionPayloadChecksum: manifest.integration.payloadChecksum, productionManifestChecksum: manifest.integration.manifestChecksum,
  productionCompositeChecksum: manifest.explanationStack.productionCompositeChecksum, activationAuthorizationManifestId: manifest.manifestId,
  activationAuthorizationManifestChecksum: checksums["single-pilot-launch-manifest.json"], ownerAuthorization: owner, activationEvent: event,
  authorityRelease: manifest.explanationStack.publicExplanationAuthorityRelease, authorityPayloadChecksum: manifest.explanationStack.publicExplanationAuthorityChecksum,
  dailyLifeRelease: manifest.explanationStack.equipmentDailyLifeRelease, dailyLifePayloadChecksum: manifest.explanationStack.equipmentDailyLifeChecksum,
  pilotExactVariantIds: manifest.pilotScope.exactVariantIds, pilotScopeChecksum: manifest.pilotScopeChecksum, rollbackTarget: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER" as const });

describe("deterministic event-bound integration activation", () => {
  it("derives byte-identical targets from identical immutable inputs and event content", () => {
    const left = deriveEventBoundIntegrationTargets(input(), "TEST_ONLY"); const right = deriveEventBoundIntegrationTargets(input(), "TEST_ONLY");
    expect(left).toMatchObject({ ok: true, pointerChecksum: right.pointerChecksum, generatedModuleChecksum: right.generatedModuleChecksum }); expect(left.generatedModule).toBe(right.generatedModule);
  });
  it("changes both target checksums when the real event binding changes", () => {
    const first = deriveEventBoundIntegrationTargets(input(), "TEST_ONLY"); const changed = input(); changed.activationEvent = { ...event, eventChecksum: `sha256:${"c".repeat(64)}`, activatedAt: "2026-08-20T14:00:02.000Z" };
    expect(deriveEventBoundIntegrationTargets(changed, "TEST_ONLY")).not.toMatchObject({ pointerChecksum: first.pointerChecksum, generatedModuleChecksum: first.generatedModuleChecksum });
  });
  it.each([
    ["different manifest", { productionManifestChecksum: `sha256:${"d".repeat(64)}` }], ["different composite", { productionCompositeChecksum: `sha256:${"e".repeat(64)}` }], ["wrong launch", { launchManifestId: "OTHER" }],
    ["candidate", { productionReleaseId: `${manifest.integration.productionReleaseId}-candidate` }], ["missing owner binding", { activationEvent: { ...event, authorizationEventId: "OTHER" } }],
    ["duplicate", { priorActivationEventChecksums: [event.eventChecksum] }],
  ])("rejects %s", (_name, override) => expect(deriveEventBoundIntegrationTargets({ ...input(), ...override }, "TEST_ONLY").ok).toBe(false));
  it("rejects synthetic fixture events in production mode", () => expect(deriveEventBoundIntegrationTargets(input()).issues).toContain("SYNTHETIC_OR_FAKE_EVENT_REJECTED"));
  it("produces marker-free ACTIVE module bytes only for a complete chain", () => {
    const result = deriveEventBoundIntegrationTargets(input(), "TEST_ONLY"); expect(result.generatedModule).toContain('"state": "ACTIVE"'); expect(result.pointer).toMatchObject({ pilotExactVariantIds: manifest.pilotScope.exactVariantIds }); expect(result.generatedModule).not.toMatch(/proposed|candidate|not active|pending approval/iu);
  });
  it("rolls every partial install or post-validation failure back to disabled", () => {
    expect(simulateAtomicIntegrationInstall({ transformationOk: true, pointerWriteOk: true, moduleWriteOk: true, postValidationOk: true })).toMatchObject({ installed: true, decisionEngineEffect: "ZERO" });
    for (const failed of ["transformationOk", "pointerWriteOk", "moduleWriteOk", "postValidationOk"] as const) expect(simulateAtomicIntegrationInstall({ transformationOk: true, pointerWriteOk: true, moduleWriteOk: true, postValidationOk: true, [failed]: false })).toMatchObject({ installed: false, activePointer: "ABSENT", publicEffect: "DISABLED_NOT_ACTIVE", rollbackApplied: true, failedActivationEventPreserved: true, decisionEngineEffect: "ZERO" });
  });
  it("derives a pointer-controlled foundation cutover from the real event chain", () => {
    const result = deriveEventBoundFoundationTargets({ releaseId: manifest.foundation.productionTargetReleaseId, payloadChecksum: manifest.foundation.productionPayloadChecksum,
      manifestChecksum: manifest.foundation.productionManifestChecksum, ownerAuthorizationEventId: owner.eventId, ownerAuthorizationEventChecksum: owner.eventChecksum,
      cutoverEvent: { eventId: "REC-CUTOVER-TEST", eventChecksum: `sha256:${"c".repeat(64)}`, authorizationEventId: owner.eventId, cutoverAt: event.activatedAt, status: "CUTOVER_ACTIVE", synthetic: true } }, "TEST_ONLY");
    expect(result).toMatchObject({ ok: true });
    expect(result.generatedModule).toContain("activeRecOfferAuditFoundation");
  });
});
