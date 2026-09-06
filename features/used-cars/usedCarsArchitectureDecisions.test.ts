import { describe, expect, it } from "vitest";
import { usedCarsArchitectureDecisions, validateArchitectureDecisionRegister } from "./governance/architectureDecisions";
import { assessProductDecisionRegister, usedCarsProductDecisions } from "./governance/productDecisions";
describe("used-cars decision registers", () => {
  it("records six valid architecture decisions", () => { expect(usedCarsArchitectureDecisions).toHaveLength(6); expect(validateArchitectureDecisionRegister(usedCarsArchitectureDecisions)).toEqual([]); });
  it("keeps recommendations proposed and non-executable", () => expect(assessProductDecisionRegister(usedCarsProductDecisions)).toMatchObject({ ready: false, defaultsAutoApproved: false, productionEffectAuthorized: false }));
  it("retains all ten owner decisions", () => expect(usedCarsProductDecisions).toHaveLength(10));
});
