import { describe, expect, it } from "vitest";
import { assessModelShadowEval } from "./staging/modelShadowEvalGate";
const passing = { environment: "STAGING" as const, syntheticOnly: true as const, candidateModelVersion: "candidate", baselineModelVersion: "baseline", datasetChecksum: `sha256:${"4".repeat(64)}`, hardConstraintAccuracy: 1, groundingAccuracy: 0.99, handoffRecall: 0.96, maximumCohortDelta: 0.04, criticalViolations: 0, commercialRankingInfluenceIncidents: 0, liveDecisionServed: false as const, reviewerId: "reviewer-1", rollbackReleaseId: "baseline-release" };
describe("used-cars staging model shadow eval", () => {
  it("passes thresholds without authorizing rollout", () => expect(assessModelShadowEval(passing)).toMatchObject({ passed: true, automaticRolloutAuthorized: false, productionModelReleaseAuthorized: false }));
  it("blocks commercial ranking influence", () => expect(assessModelShadowEval({ ...passing, commercialRankingInfluenceIncidents: 1 }).codes).toContain("COMMERCIAL_RANKING_INFLUENCE"));
});
