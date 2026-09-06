import { describe, expect, it } from "vitest";
import { assessHostIsolationSuite, requiredHostIsolationScenarios } from "./staging/hostIsolationSuite";
import { assessDeploymentRollbackSuite, requiredDeploymentRollbackScenarios } from "./staging/deploymentRollbackSuite";
const checksum = `sha256:${"b".repeat(64)}`;
describe("used-cars staging host and rollback evidence", () => {
  it("accepts complete synthetic host isolation evidence without exposure", () => expect(assessHostIsolationSuite(requiredHostIsolationScenarios.map((scenario) => ({ scenario, environment: "STAGING", blocked: true, syntheticOnly: true, evidenceChecksum: checksum, reviewerId: "security-reviewer" })))).toMatchObject({ complete: true, hostExposureAuthorized: false }));
  it("accepts complete rollback evidence without changing production", () => expect(assessDeploymentRollbackSuite(requiredDeploymentRollbackScenarios.map((scenario) => ({ scenario, environment: "STAGING", passed: true, syntheticOnly: true, recoveryTimeSeconds: 300, evidenceChecksum: checksum, productionChangePerformed: false })))).toMatchObject({ complete: true, productionChangeAuthorized: false }));
});
