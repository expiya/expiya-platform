import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/data/production/equipment-public-explanation-integration/governance/launch-preparations/EPEI-PILOT-LAUNCH-V3/single-pilot-launch-manifest.json";
import checksums from "@/data/production/equipment-public-explanation-integration/governance/launch-preparations/EPEI-PILOT-LAUNCH-V3/checksums.json";
import dryRun from "@/data/production/equipment-public-explanation-integration/governance/launch-preparations/EPEI-PILOT-LAUNCH-V3/launch-dry-run.json";
import appendix from "@/data/production/rec-offer-audit-foundation/releases/v1.0.1-catalog-v0.55.4-2026-08-20/runtime-contract-appendix.json";
import foundationManifest from "@/data/production/rec-offer-audit-foundation/releases/v1.0.1-catalog-v0.55.4-2026-08-20/manifest.json";

const root = process.cwd(); const sha = (text: string) => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const launchDir = join(root, "data/production/equipment-public-explanation-integration/governance/launch-preparations/EPEI-PILOT-LAUNCH-V3");

describe("single Equipment pilot launch preparation", () => {
  it("binds immutable foundation, integration, explanation stack and exact pilot scope", () => {
    expect(manifest).toMatchObject({ manifestId: "EPEI-PILOT-LAUNCH-V3", foundation: { candidatePayloadChecksum: "sha256:f4ef5c6712d20868bb469d60a74d4967bc282c3740e99b778bafb23b282e15cd", candidateManifestChecksum: "sha256:fcae76f6262368231e4d4b422e31972e3d1c58544cfe8824ab8ff3110f90a12c", schemaAssessmentChecksum: "sha256:e129fa201742f2e13e8bce517eca6db907e4f0abf74378289c85bf224420d713" }, integration: { payloadChecksum: "sha256:7fb57a834501114eafe16f6ea601aceea8e5cc4a51994129ff0161f1867ad1e5", manifestChecksum: "sha256:b563f9b2577a2f5fe3ffcd34637aa7ae6fbada913ed63cd8b6f3f5abefdb33ff", materializationEventChecksum: "sha256:6ac51381fcc8f71b989dced8c636f2b77b8384756f0bc703e83783f28a6eaf38" }, activationPolicyId: "EPEI_EVENT_BOUND_ATOMIC_ACTIVATION_V2", activationPolicyVersion: "2.0.0", decisionEngineEffect: "ZERO", launchApplied: false });
    expect(manifest.pilotScope.exactVariantIds).toEqual(["6cb56615-37ef-51a8-9202-a73e59d4e14b", "90e65f94-6fdb-5eea-ad7e-0b4e18435427"]); expect(manifest.pilotScope).toMatchObject({ confirmedIncluded: 62, verifiedAbsence: 3, nissanNegative: 0 });
  });
  it("checksum-binds the immutable runtime contract snapshot without embedding source bytes", () => {
    expect(appendix.sourceEmbedding).toBe(false); expect(appendix.contracts.length).toBeGreaterThanOrEqual(18);
    for (const contract of appendix.contracts) {
      expect(contract.sourceChecksum).toMatch(/^sha256:[a-f0-9]{64}$/u);
      expect(existsSync(join(root, contract.sourcePath))).toBe(true);
    }
    expect(sha(JSON.stringify(appendix))).not.toBe(foundationManifest.runtimeContractAppendixChecksum);
    expect(sha(readFileSync(join(root, "data/production/rec-offer-audit-foundation/releases/v1.0.1-catalog-v0.55.4-2026-08-20/runtime-contract-appendix.json"), "utf8"))).toBe(foundationManifest.runtimeContractAppendixChecksum);
    expect(foundationManifest.runtimeContractAppendixChecksum).toBe(manifest.runtimeContractCompositeChecksum);
  });
  it("records the fail-closed rollback simulation and installs the separately approved active target", () => {
    expect(dryRun).toMatchObject({ disposition: "READY_FOR_SINGLE_PILOT_LAUNCH_APPROVAL", activeFilesChanged: false, publicEffect: "DISABLED_PENDING_SINGLE_LAUNCH", rollbackSimulation: { result: "PASS", phase1OfferCard: "PASS", appendOnlyAuditHistory: "PRESERVED", destructiveDatabaseAction: false }, decisionEngineEffect: "ZERO" });
    expect(existsSync(join(root, "data/production/equipment-public-explanation-integration/active.json"))).toBe(true); expect(existsSync(join(root, "data/production/equipment-public-explanation-integration/activeEquipmentPublicExplanationIntegration.generated.ts"))).toBe(true);
  });
  it("binds the external immutable manifest checksum and exact single owner text", () => {
    expect(sha(readFileSync(join(launchDir, "single-pilot-launch-manifest.json"), "utf8"))).toBe(checksums["single-pilot-launch-manifest.json"]); const owner = readFileSync(join(launchDir, "owner-single-pilot-launch-authorization.txt"), "utf8"); expect(owner).toContain(checksums["single-pilot-launch-manifest.json"]); expect(owner).toContain(manifest.runtimeContractCompositeChecksum); expect(owner).toContain(manifest.activationPolicyChecksum);
  });
});
