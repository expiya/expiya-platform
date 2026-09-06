import { describe, expect, it } from "vitest";
import { usedCarsStagingDeploymentBoundaries, validateStagingDeploymentBoundaries } from "./staging/deploymentBoundaryManifest";
describe("used-cars staging deployment boundary", () => {
  it("isolates three unprovisioned surfaces", () => expect(validateStagingDeploymentBoundaries(usedCarsStagingDeploymentBoundaries)).toMatchObject({ valid: true, deploymentCreationAuthorized: false, dnsChangeAuthorized: false }));
  it("never shares a session domain", () => expect(usedCarsStagingDeploymentBoundaries.every((item) => item.sessionCookieDomain === null && !item.crossSurfaceSessionReadable)).toBe(true));
});
