import { describe, expect, it } from "vitest";
import { assessExperimentKillSwitchSuite, requiredExperimentKillSwitchScenarios } from "./staging/experimentKillSwitchSuite";
describe("used-cars staging experiment kill switch", () => {
  it("requires nine five-minute fail-closed drills", () => expect(assessExperimentKillSwitchSuite(requiredExperimentKillSwitchScenarios.map((scenario) => ({ scenario, syntheticOnly: true, environment: "STAGING", triggerDetected: true, allocationStopped: true, baselineRestored: true, recoveryTimeSeconds: 120, evidenceChecksum: `sha256:${"6".repeat(64)}`, reviewerId: "reviewer" })))).toMatchObject({ complete: true, killSwitchActivationAuthorized: false, automaticWinnerRolloutAuthorized: false }));
  it("rejects missing drill evidence", () => expect(assessExperimentKillSwitchSuite([]).missing).toHaveLength(9));
});
