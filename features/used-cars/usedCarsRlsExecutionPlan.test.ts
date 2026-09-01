import { describe, expect, it } from "vitest";
import { assessRlsExecutionResults, usedCarsRlsExecutionPlan } from "./staging/rlsExecutionPlan";
describe("used-cars RLS staging execution plan", () => {
  it("maps all twelve adversarial scenarios", () => expect(usedCarsRlsExecutionPlan).toHaveLength(12));
  it("requires fresh transaction and pool checkout", () => expect(usedCarsRlsExecutionPlan.every((item) => item.separateTransaction && item.freshPoolCheckout && !item.productionDatabaseAllowed)).toBe(true));
  it("fails closed before evidence exists", () => expect(assessRlsExecutionResults([])).toMatchObject({ complete: false, migrationPromotionAuthorized: false }));
});
