import { describe, expect, it } from "vitest";
import { assessPrivacyOperationsDrill, requiredPrivacyDrillScenarios } from "./staging/privacyOperationsDrill";
describe("used-cars staging privacy drill", () => {
  it("requires nine dual-reviewed synthetic scenarios", () => {
    const evidenceChecksum = `sha256:${"c".repeat(64)}`;
    const results = requiredPrivacyDrillScenarios.map((scenario) => ({ scenario, environment: "STAGING" as const, syntheticOnly: true as const, passed: true, rawPiiInEvidence: false as const, evidenceChecksum, privacyReviewerId: "privacy-1", securityReviewerId: "security-1" }));
    expect(assessPrivacyOperationsDrill(results)).toMatchObject({ complete: true, realRightsRequestProcessingAuthorized: false, personalDataMutationAuthorized: false });
  });
  it("rejects shared reviewers", () => {
    const scenario = requiredPrivacyDrillScenarios[0];
    expect(assessPrivacyOperationsDrill([{ scenario, environment: "STAGING", syntheticOnly: true, passed: true, rawPiiInEvidence: false, evidenceChecksum: `sha256:${"c".repeat(64)}`, privacyReviewerId: "same", securityReviewerId: "same" }]).complete).toBe(false);
  });
});
