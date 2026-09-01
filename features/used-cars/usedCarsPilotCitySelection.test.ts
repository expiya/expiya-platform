import {describe,expect,it} from "vitest";
import {evaluatePilotCity,pilotScopeLimits} from "./pilot/citySelection";
const candidate={cityCode:"34",verifiedDealerCandidates:5,estimatedEligibleStock:250,taxonomyCoverageRatio:.9,moderationCapacityPerWeek:80,supportCoverage:true,launchRegions:["İstanbul Anadolu"]};
describe("pilot city selection",()=>{
 it("accepts an operationally controlled city region",()=>expect(evaluatePilotCity(candidate)).toEqual({eligible:true,codes:[]}));
 it("rejects geography without taxonomy or moderation capacity",()=>expect(evaluatePilotCity({...candidate,taxonomyCoverageRatio:.5,moderationCapacityPerWeek:10}).codes).toEqual(expect.arrayContaining(["TAXONOMY_COVERAGE_LOW","MODERATION_CAPACITY_LOW"])));
 it("forbids nationwide and classic launch in the first pilot",()=>{expect(pilotScopeLimits.nationwideLaunchAllowed).toBe(false);expect(pilotScopeLimits.classicVehiclesIncluded).toBe(false);expect(pilotScopeLimits.maximumCities).toBe(2);});
});
