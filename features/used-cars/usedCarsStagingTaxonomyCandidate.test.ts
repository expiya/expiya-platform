import { describe, expect, it } from "vitest";
import { usedCarsTaxonomyPilotCandidate, validateTaxonomyPilotCandidateManifest } from "./staging/taxonomyPilotCandidateManifest";
import { assessTaxonomyReviewSamplingGate } from "./staging/taxonomyReviewSamplingGate";
describe("used-cars staging taxonomy pilot candidate", () => {
  it("defines phased coverage without generating a payload", () => expect(validateTaxonomyPilotCandidateManifest(usedCarsTaxonomyPilotCandidate)).toMatchObject({ valid: true, datasetAcquisitionAuthorized: false, publicTaxonomyReleaseAuthorized: false }));
  it("accepts full provenance and separated review without releasing", () => expect(assessTaxonomyReviewSamplingGate({ candidateVersion: "rc1", totalLeafEntities: 2000, fullAutomatedIntegrityPassed: true, sourcePermissionCoverageRatio: 1, trMarketEvidenceCoverageRatio: 1, duplicateConflictCount: 0, cyclicSupersedeCount: 0, randomSampleSize: 200, randomSampleErrors: 0, highRiskEntityCount: 50, highRiskEntitiesReviewed: 50, primaryReviewerId: "data", secondReviewerId: "taxonomy", legalUsageReviewerId: "legal", evidenceChecksum: `sha256:${"9".repeat(64)}` })).toMatchObject({ passed: true, publicTaxonomyReleaseAuthorized: false }));
});
