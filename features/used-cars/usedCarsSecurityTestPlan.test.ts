import { describe, expect, it } from "vitest";
import { usedCarsSecurityTestPlan, validateSecurityTestPlan } from "./security-testing/testPlan";
describe("used-cars security test plan", () => {
  it("covers ten surfaces with eighteen independent scenarios", () => { expect(usedCarsSecurityTestPlan).toHaveLength(18); expect(validateSecurityTestPlan(usedCarsSecurityTestPlan)).toEqual([]); });
  it("does not mark scenarios safe for production execution", () => expect(usedCarsSecurityTestPlan.every((item) => !item.productionSafe)).toBe(true));
});
