import { describe, expect, it } from "vitest";
import { usedCarsStagingFeedSandboxChannels, validateFeedSandboxManifest } from "./staging/feedSandboxManifest";
import { assessFeedCertificationSuite, requiredFeedCertificationScenarios } from "./staging/feedCertificationSuite";
describe("used-cars staging feed sandbox", () => {
  it("covers five disabled validate-only channels", () => expect(validateFeedSandboxManifest(usedCarsStagingFeedSandboxChannels)).toMatchObject({ valid: true, realFeedConnectionAuthorized: false, inventoryWriteAuthorized: false }));
  it("requires sixteen redacted synthetic certification scenarios", () => expect(assessFeedCertificationSuite(requiredFeedCertificationScenarios.map((scenario) => ({ scenario, environment: "STAGING", syntheticOnly: true, passed: true, rawVinOrPlateInEvidence: false, evidenceChecksum: `sha256:${"7".repeat(64)}`, reviewerId: "feed-reviewer" })))).toMatchObject({ complete: true, providerCertificationGranted: false, inventoryWriteAuthorized: false }));
});
