import { describe, expect, it } from "vitest";
import { assessPilotIncidentDrills, requiredPilotIncidentDrills } from "./operations/incidentDrills";

const evidenceChecksum = `sha256:${"a".repeat(64)}`;
describe("used-cars pilot incident drills", () => {
  it("requires all eight drills", () => expect(assessPilotIncidentDrills([]).missing).toEqual(requiredPilotIncidentDrills));
  it("requires emergency stop authority to be exercised", () => expect(assessPilotIncidentDrills([{ drillId: "PILOT_EMERGENCY_STOP", completedAt: "2026-09-01", participantActorIds: ["owner", "security"], evidenceChecksum, passed: true, findingsClosed: true, stopAuthorityExercised: false }]).missing).toContain("PILOT_EMERGENCY_STOP"));
  it("never authorizes production actions", () => expect(assessPilotIncidentDrills([]).productionActionsAuthorized).toBe(false));
});
