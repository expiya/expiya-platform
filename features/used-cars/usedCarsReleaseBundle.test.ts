import { describe, expect, it } from "vitest";
import { usedCarsDeliveryWorkstreams } from "./readiness/deliveryWorkstreams";
import { validateUsedCarsReleaseBundle } from "./readiness/releaseBundle";
import { usedCarsExternalActionInvariant, validateUsedCarsExternalActionInvariant } from "./readiness/authorizationInvariant";
const evidence = usedCarsDeliveryWorkstreams.map((item, index) => ({ evidenceId: `e-${index}`, domain: item.domain, stage: "STAGING_INTEGRATION" as const, kind: "TEST_REPORT" as const, checksum: `sha256:${"a".repeat(64)}`, issuedAt: "2026-09-01", expiresAt: null, approvedBy: "owner", independentReviewerId: null, supersededAt: null }));
const bundle = { bundleId: "bundle-1", targetStage: "STAGING_INTEGRATION" as const, sourceCommitSha: "a".repeat(40), artifactDigest: `sha256:${"b".repeat(64)}`, createdAt: "2026-09-01", scopeAuthorizationId: "scope-1", rollbackPlanChecksum: `sha256:${"c".repeat(64)}`, evidence, containsProductionData: false as const, deploymentRequested: false as const };
describe("used-cars release bundle", () => {
  it("covers all 25 domains without authorizing promotion or deployment", () => expect(validateUsedCarsReleaseBundle(bundle, "2026-09-02")).toMatchObject({ valid: true, missingDomains: [], promotionAuthorized: false, deploymentAuthorized: false }));
  it("fails when one domain has no valid target-stage evidence", () => expect(validateUsedCarsReleaseBundle({ ...bundle, evidence: evidence.slice(1) }, "2026-09-02").codes).toContain("DOMAIN_EVIDENCE_INCOMPLETE"));
  it("keeps every external action disabled", () => expect(validateUsedCarsExternalActionInvariant(usedCarsExternalActionInvariant)).toEqual({ intact: true, unexpectedlyEnabled: [], externalActionAuthorized: false }));
  it("detects an accidentally enabled action", () => expect(validateUsedCarsExternalActionInvariant({ ...usedCarsExternalActionInvariant, realPaymentCollection: true }).unexpectedlyEnabled).toEqual(["realPaymentCollection"]));
});
