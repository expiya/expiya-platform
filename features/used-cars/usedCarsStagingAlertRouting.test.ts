import { describe, expect, it } from "vitest";
import { assessStagingAlertRoutes, requiredStagingAlertRoutes } from "./staging/alertRouting";
describe("used-cars staging alert routing", () => {
  it("defines five owner-backed alerts", () => expect(requiredStagingAlertRoutes).toHaveLength(5));
  it("keeps routes pending before destinations and evidence", () => expect(assessStagingAlertRoutes(requiredStagingAlertRoutes)).toMatchObject({ ready: false, productionAlertingAuthorized: false }));
  it("does not enable real notifications", () => expect(requiredStagingAlertRoutes.every((item) => !item.realNotificationEnabled)).toBe(true));
});
