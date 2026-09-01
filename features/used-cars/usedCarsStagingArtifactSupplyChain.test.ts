import { describe, expect, it } from "vitest";
import { usedCarsStagingArtifactLanes, validateStagingArtifactRegistry } from "./staging/artifactRegistryManifest";
import { assessStagingSupplyChainEvidence, type SupplyChainEvidenceKind } from "./staging/supplyChainEvidenceSuite";
describe("used-cars staging artifact supply chain", () => {
  it("keeps immutable artifact lanes unprovisioned", () => expect(validateStagingArtifactRegistry(usedCarsStagingArtifactLanes)).toMatchObject({ valid: true, registryProvisioningAuthorized: false }));
  it("requires every evidence kind and one artifact digest", () => {
    const digest = `sha256:${"a".repeat(64)}`;
    const kinds: SupplyChainEvidenceKind[] = ["CI_SCAN_SUMMARY", "SBOM", "SIGNED_PROVENANCE", "IMMUTABILITY_TEST", "LICENSE_REVIEW", "REPRODUCIBLE_BUILD", "PROMOTION_DIGEST_MATCH"];
    const evidence = kinds.map((kind) => ({ kind, environment: "STAGING" as const, artifactDigest: digest, evidenceChecksum: digest, passed: true, syntheticOnly: true as const, independentReviewerId: "reviewer-1" }));
    expect(assessStagingSupplyChainEvidence(evidence)).toMatchObject({ complete: true, artifactPromotionAuthorized: false });
  });
});
