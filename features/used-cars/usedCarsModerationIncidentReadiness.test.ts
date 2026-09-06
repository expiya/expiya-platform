import {describe,expect,it} from "vitest";
import {currentUsedCarsModerationIncidentReadiness,moderationIncidentDrills} from "./readiness/moderationIncidentReadiness";
describe("moderation incident readiness",()=>{
 it("defines the required tabletop drills",()=>expect(moderationIncidentDrills.map(drill=>drill.id)).toEqual(["DRILL-CROSS-TENANT","DRILL-ACCOUNT-TAKEOVER","DRILL-MALWARE-DOCUMENT","DRILL-FALSE-VERIFICATION","DRILL-DEALER-APPEAL"]));
 it("does not claim drills passed",()=>expect(moderationIncidentDrills.every(drill=>drill.passed)).toBe(false));
 it("keeps production moderation actions blocked",()=>{expect(currentUsedCarsModerationIncidentReadiness.ready).toBe(false);expect(currentUsedCarsModerationIncidentReadiness.moderationProductionActionsAuthorized).toBe(false);});
});
