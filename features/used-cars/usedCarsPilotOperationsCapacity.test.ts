import { describe, expect, it } from "vitest";
import { assessPilotOperationsCapacity } from "./operations/pilotCapacity";

const capacity = { activeDealers: 10, activeListings: 300, expectedDailySubmissions: 20, expectedDailyLeads: 50, moderatorReviewCapacityPerDay: 28, supportLeadCapacityPerDay: 70, fraudReservePercent: 20, absenceReservePercent: 20, maximumModerationBacklogHours: 24, maximumSupportBacklogHours: 8 };
describe("used-cars pilot operations capacity", () => {
  it("accepts capacity with fraud and absence headroom without authorizing pilot", () => expect(assessPilotOperationsCapacity(capacity)).toEqual({ ready: true, codes: [], pilotActivationAuthorized: false }));
  it("fails closed when moderation capacity is below reserved demand", () => expect(assessPilotOperationsCapacity({ ...capacity, moderatorReviewCapacityPerDay: 27 })).toMatchObject({ ready: false, codes: ["MODERATION_CAPACITY_INSUFFICIENT"] }));
  it("requires bounded backlog targets", () => expect(assessPilotOperationsCapacity({ ...capacity, maximumSupportBacklogHours: 9 }).codes).toContain("SUPPORT_BACKLOG_LIMIT_TOO_HIGH"));
});
