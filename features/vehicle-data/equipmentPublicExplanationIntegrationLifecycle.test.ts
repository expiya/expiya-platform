import { describe, expect, it } from "vitest";
import candidateManifest from "@/data/production/equipment-public-explanation-integration/release-candidates/v0.1.0-catalog-v0.55.4-2026-08-20-candidate/manifest.json";
import prepared from "@/data/production/equipment-public-explanation-integration/materialization-preparations/EPEI-MATPREP-C7F05BA7759AA54C8C07/prepared-production-manifest.json";
import { renderInstalledEquipmentIntegrationModule, validateEquipmentIntegrationActivationChain } from "./equipmentPublicExplanationIntegrationLifecycle.server";

const sha = `sha256:${"a".repeat(64)}`; const manifestSha = `sha256:${"b".repeat(64)}`; const eventSha = `sha256:${"c".repeat(64)}`;
const production = { ...prepared, materializationAuthorizationEventId: "EPEI-MATAUTH-1", materializedAt: "2026-08-20T14:00:00.000Z" };
const activationManifest = { productionReleaseId: production.releaseId, productionManifestChecksum: sha, ownerActivationAuthorizationEventId: "EPEI-ACTAUTH-1", productionCompositeChecksum: prepared.productionCompositeChecksum };
const activationEvent = { eventId: "EPEI-ACT-1", productionReleaseId: production.releaseId, productionManifestChecksum: sha, activationManifestChecksum: manifestSha, ownerActivationAuthorizationEventId: "EPEI-ACTAUTH-1", effectiveAt: "2026-08-20T14:01:00.000Z" };
const pointer = { state: "ACTIVE", activeIntegrationPolicyRelease: production.releaseId, productionManifestChecksum: sha, activationManifestChecksum: manifestSha, activationEventChecksum: eventSha, publicEffect: "ENABLED" };
const full = () => ({ candidateManifest, productionManifest: production, productionManifestChecksum: sha, activationManifest, activationManifestChecksum: manifestSha, activationEvent, activationEventChecksum: eventSha, pointer });

describe("Equipment integration lifecycle parity", () => {
  it("does not treat candidate or materialized-not-active manifests as ACTIVE authority", () => {
    expect(validateEquipmentIntegrationActivationChain({ candidateManifest }).enabled).toBe(false);
    expect(validateEquipmentIntegrationActivationChain({ candidateManifest, productionManifest: prepared, productionManifestChecksum: sha }).enabled).toBe(false);
  });
  it("rejects ACTIVE pointer bound to candidate manifest", () => expect(validateEquipmentIntegrationActivationChain({ ...full(), productionManifest: { ...production, releaseId: candidateManifest.releaseId } }).enabled).toBe(false));
  it("rejects production + pointer without activation event", () => { const value = full(); expect(validateEquipmentIntegrationActivationChain({ ...value, activationEvent: undefined, activationEventChecksum: undefined }).enabled).toBe(false); });
  it("enables only the complete checksum-bound chain and remains decision-neutral", () => expect(validateEquipmentIntegrationActivationChain(full())).toMatchObject({ enabled: true, decisionEngineEffect: "ZERO", issues: [] }));
  it("renders installable ACTIVE module bytes without proposed/inactive/candidate markers", () => {
    const generatedSource = renderInstalledEquipmentIntegrationModule(pointer);
    expect(generatedSource).toContain('"state": "ACTIVE"'); expect(generatedSource).not.toMatch(/proposed|not active|candidate|pending approval/iu);
  });
});
