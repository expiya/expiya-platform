import { describe, expect, it } from "vitest";
import { assessSecurityValidationReadiness } from "./readiness/securityValidationReadiness";
describe("used-cars security validation readiness", () => {
  it("blocks security approval, production pentest and risk acceptance", () => expect(assessSecurityValidationReadiness()).toMatchObject({ ready: false, productionSecurityApprovalAuthorized: false, pentestAgainstProductionAuthorized: false, automaticRiskAcceptanceAuthorized: false }));
  it("recognizes internal adversarial plan", () => expect(assessSecurityValidationReadiness().missing).not.toContain("adversarialTestPlanReady"));
});
