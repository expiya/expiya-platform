import { describe, expect, it } from "vitest";
import { usedCarsStagingDataPolicy, usedCarsStagingDeployables, validateStagingEnvironmentManifest } from "./staging/environmentManifest";
describe("used-cars staging environment", () => {
  it("isolates three surfaces", () => { expect(usedCarsStagingDeployables).toHaveLength(3); expect(validateStagingEnvironmentManifest(usedCarsStagingDeployables, usedCarsStagingDataPolicy)).toEqual([]); });
  it("keeps public DB access read-only", () => expect(usedCarsStagingDeployables.find((item) => item.surface === "PUBLIC")?.writable).toBe(false));
  it("forbids production traffic and real data", () => { expect(usedCarsStagingDeployables.every((item) => !item.productionTrafficAccepted)).toBe(true); expect(usedCarsStagingDataPolicy).toMatchObject({ syntheticOnly: true, realDealerDataAllowed: false, realUserPiiAllowed: false, publicDnsAllowed: false }); });
});
