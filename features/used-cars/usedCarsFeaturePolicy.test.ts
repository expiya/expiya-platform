import { describe, expect, it } from "vitest";
import { validateDecisionFeatureSet } from "./model-governance/featurePolicy";

describe("used-cars decision feature policy", () => {
  it("accepts declared need and risk preferences", () => expect(validateDecisionFeatureSet(["totalBudget", "annualKm", "damageTolerance"]).valid).toBe(true));
  it("rejects protected attributes and proxies", () => expect(validateDecisionFeatureSet(["religion", "protectedClassProxy"])).toMatchObject({ valid: false, proxyInferenceAuthorized: false }));
  it("fails closed for unregistered features", () => expect(validateDecisionFeatureSet(["browserFingerprint"]).unknown).toEqual(["browserFingerprint"]));
});
