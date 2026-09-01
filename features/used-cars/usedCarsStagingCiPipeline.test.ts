import { describe, expect, it } from "vitest";
import { usedCarsStagingCiJobs, validateStagingCiManifest } from "./staging/ciPipelineManifest";
describe("used-cars staging CI pipeline", () => {
  it("covers nine fail-closed jobs without enabling CI", () => expect(validateStagingCiManifest(usedCarsStagingCiJobs)).toMatchObject({ valid: true, ciConfigurationAuthorized: false }));
  it("has no write token or configured job", () => expect(usedCarsStagingCiJobs.every((job) => !job.writeTokenAvailable && !job.configured)).toBe(true));
});
