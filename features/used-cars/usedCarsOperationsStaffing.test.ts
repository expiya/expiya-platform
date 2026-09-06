import { describe, expect, it } from "vitest";
import { assessOperationsStaffing, requiredPilotOperationsRoles } from "./operations/staffing";
describe("used-cars operations staffing", () => {
  it("requires all critical pilot roles", () => { expect(requiredPilotOperationsRoles).toHaveLength(10); expect(assessOperationsStaffing([], "2026-09-01").missingRoles).toEqual(requiredPilotOperationsRoles); });
  it("rejects same-person first and second moderation roles", () => expect(assessOperationsStaffing([{ assignmentId: "a", actorId: "same", role: "MODERATOR_L1", trainedAt: "2026-01-01", certificationExpiresAt: "2027-01-01", shiftId: "s", backupActorId: "b", active: true, productionActionsAuthorized: false }, { assignmentId: "b", actorId: "same", role: "MODERATOR_L2", trainedAt: "2026-01-01", certificationExpiresAt: "2027-01-01", shiftId: "s", backupActorId: "b", active: true, productionActionsAuthorized: false }], "2026-09-01").segregationConflicts).toContain("MODERATOR_L1:MODERATOR_L2"));
  it("does not authorize production actions", () => expect(assessOperationsStaffing([], "2026-09-01").productionActionsAuthorized).toBe(false));
});
