import { describe, expect, it } from "vitest";
import { assessModelGovernanceReadiness } from "./readiness/modelGovernanceReadiness";
describe("used-cars model governance readiness", () => {
  it("records internal controls while blocking production", () => expect(assessModelGovernanceReadiness()).toMatchObject({ ready: false, productionModelReleaseAuthorized: false, liveUserProfilingAuthorized: false }));
  it("names external review and runtime gates", () => expect(assessModelGovernanceReadiness().missing).toEqual(expect.arrayContaining(["evaluationDatasetReviewed", "independentFairnessReviewComplete", "redTeamPassed", "productionShadowEvalPassed"])));
});
