import { describe, expect, it } from "vitest";
import { assessProductGovernanceReadiness } from "./readiness/productGovernanceReadiness";
describe("used-cars product governance readiness", () => {
  it("blocks promotion until explicit product decisions", () => expect(assessProductGovernanceReadiness()).toMatchObject({ ready: false, architectureRegisterValid: true, productDefaultsAutoApproved: false, productionScopeAuthorized: false }));
  it("reports the four pending legal and security decisions", () => expect(assessProductGovernanceReadiness().missing.filter((code) => code.startsWith("DECISION_APPROVAL_REQUIRED"))).toHaveLength(4));
});
