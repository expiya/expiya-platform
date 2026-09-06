import { describe, expect, it } from "vitest";
import { usedCarsProductDecisionWorkshop, validateProductDecisionWorkshop } from "./governance/productDecisionWorkshop";
describe("used-cars product decision workshop", () => {
  it("prepares all ten decisions without approving them", () => expect(validateProductDecisionWorkshop(usedCarsProductDecisionWorkshop)).toEqual({ valid: true, missing: [], invalid: [], decisionsApproved: false, productionEffectAuthorized: false }));
  it("requires independent review for legal and security owners", () => expect(usedCarsProductDecisionWorkshop.filter((item) => item.requiredApproverRole === "LEGAL" || item.requiredApproverRole === "SECURITY").every((item) => item.independentReviewRequired)).toBe(true));
  it("provides at least two alternatives and a rollback trigger per decision", () => expect(usedCarsProductDecisionWorkshop.every((item) => item.alternativeValues.length >= 2 && Boolean(item.rollbackOrReviewTrigger))).toBe(true));
});
