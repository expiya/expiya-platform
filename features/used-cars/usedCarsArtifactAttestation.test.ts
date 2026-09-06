import { describe, expect, it } from "vitest";
import { validateBuildArtifactAttestation, verifyPromotionArtifact } from "./supply-chain/artifactAttestation";
const checksum = `sha256:${"a".repeat(64)}`;
const valid = { artifactId: "a", sourceCommit: "b".repeat(40), buildWorkflowId: "w", artifactChecksum: checksum, sbomChecksum: checksum, provenanceChecksum: checksum, signature: "sig", builderIdentity: "builder", dependencyLockChecksum: checksum, secretScanPassed: true, sastPassed: true, dependencyScanPassed: true, artifactScanPassed: true, generatedAt: "2026-09-01", reproducibleBuildVerified: true, productionPromotionAuthorized: false as const };
describe("used-cars build artifact attestation", () => {
  it("validates complete evidence without authorizing promotion", () => expect(validateBuildArtifactAttestation(valid)).toMatchObject({ valid: true, productionPromotionAuthorized: false }));
  it("detects artifact substitution", () => expect(verifyPromotionArtifact({ attestation: valid, deployedArtifactChecksum: `sha256:${"c".repeat(64)}`, expectedSourceCommit: valid.sourceCommit }).codes).toContain("DEPLOYED_ARTIFACT_MISMATCH"));
});
