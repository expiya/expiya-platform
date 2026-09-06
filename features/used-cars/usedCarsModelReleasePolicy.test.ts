import { describe, expect, it } from "vitest";
import { assessMetricDrift, assessModelRelease } from "./model-governance/releasePolicy";
const passing = { hardConstraintAccuracy: 1, groundingAccuracy: .99, handoffRecall: .97, maximumCohortDelta: .03, criticalViolations: 0 };
describe("used-cars model release policy", () => {
  it("requires a rollback target and human approval", () => expect(assessModelRelease({ releaseId: "r", modelVersion: "m", policyVersion: "p", taxonomyVersion: "t", evalSuiteChecksum: "e", metrics: passing })).toMatchObject({ ready: false, automaticRolloutAuthorized: false, humanApprovalRequired: true }));
  it("passes numerical gates without authorizing rollout", () => expect(assessModelRelease({ releaseId: "r", modelVersion: "m", policyVersion: "p", taxonomyVersion: "t", evalSuiteChecksum: "e", metrics: passing, rollbackReleaseId: "r0" }).ready).toBe(true));
  it("detects drift and critical violations", () => expect(assessMetricDrift(passing, { ...passing, groundingAccuracy: .9, criticalViolations: 1 })).toEqual(expect.arrayContaining(["GROUNDING_DRIFT", "CRITICAL_VIOLATION"])));
});
