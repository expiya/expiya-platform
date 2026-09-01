import {describe,expect,it} from "vitest";
import {currentUsedCarsLaunchReport} from "./readiness/currentLaunchReport";
describe("current launch report",()=>{
 it("reports synthetic MVP as the highest ready stage",()=>expect(currentUsedCarsLaunchReport.highestReadyStage).toBe("SYNTHETIC_MVP"));
 it("reports staging, pilot and production as blocked",()=>expect(currentUsedCarsLaunchReport.stages.filter(stage=>!stage.ready).map(stage=>stage.stage)).toEqual(["STAGING_INTEGRATION","CONTROLLED_PILOT","PRODUCTION"]));
 it("never authorizes production launch",()=>expect(currentUsedCarsLaunchReport.productionLaunchAuthorized).toBe(false));
});
