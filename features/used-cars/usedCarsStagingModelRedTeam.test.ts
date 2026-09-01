import { describe, expect, it } from "vitest";
import { assessModelRedTeam, requiredModelRedTeamScenarios } from "./staging/modelRedTeamManifest";
import { usedCarsStagingFairnessCohorts, validateFairnessCohortManifest } from "./staging/fairnessCohortManifest";
describe("used-cars staging model red-team and fairness", () => {
  it("accepts twelve clean synthetic red-team results without releasing", () => expect(assessModelRedTeam(requiredModelRedTeamScenarios.map((scenario) => ({ scenario, modelVersion: "candidate", policyVersion: "p1", outcome: "PASS", criticalViolationCount: 0, evidenceChecksum: `sha256:${"3".repeat(64)}`, independentTesterId: "red-team-1", syntheticOnly: true })))).toMatchObject({ complete: true, productionModelReleaseAuthorized: false }));
  it("defines six unevaluated non-protected cohort axes", () => expect(validateFairnessCohortManifest(usedCarsStagingFairnessCohorts)).toMatchObject({ valid: true, liveUserProfilingAuthorized: false }));
});
