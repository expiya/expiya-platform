import { describe, expect, it } from "vitest";
import { assessExperimentGovernanceReadiness } from "./readiness/experimentGovernanceReadiness";
describe("used-cars experiment governance readiness", () => {
  it("blocks live experiments and automatic rollout", () => expect(assessExperimentGovernanceReadiness()).toMatchObject({ ready: false, realExperimentAuthorized: false, automaticWinnerRolloutAuthorized: false, organicRankingExperimentAuthorized: false }));
  it("recognizes internal policy and guardrails", () => { expect(assessExperimentGovernanceReadiness().missing).not.toContain("experimentContractReady"); expect(assessExperimentGovernanceReadiness().missing).not.toContain("safetyGuardrailsReady"); });
});
