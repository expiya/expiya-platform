import { describe, expect, it } from "vitest";
import { founderDecisionInternalReviews, validateFounderDecisionInternalReviews } from "./governance/founderDecisionInternalReview";
describe("used-cars founder decision internal reviews", () => {
  it("completes four evidence-backed internal review tracks", () => expect(validateFounderDecisionInternalReviews(founderDecisionInternalReviews)).toEqual({ complete: true, missing: [], unsafe: [], internalReviewPassed: true, externalSignoffsComplete: false, productGovernanceReady: false, productionEffectAuthorized: false }));
  it("keeps specialist signatures explicit and pending", () => expect(founderDecisionInternalReviews.every((review) => !review.externalSignoffRecorded && !review.productionEffectAuthorized)).toBe(true));
});
