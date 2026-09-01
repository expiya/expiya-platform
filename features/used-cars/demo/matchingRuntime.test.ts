import { describe,expect,it } from "vitest";
import { DEMO_USED_CARS } from "./catalog";
import { createDemoPreferenceLedger,runDemoMatching } from "./matchingRuntime";
describe("demo integration with used-car matching policy",()=>{
  it("builds the versioned domain ledger",()=>expect(createDemoPreferenceLedger({budget:1600000,risk:"LOW",body:"SUV",minimumModelYear:2020,maximumMileageKm:90000}).version).toBe("used-car-preference-ledger/v1"));
  it("rejects hard-boundary failures and returns only organic results",()=>{const run=runDemoMatching(DEMO_USED_CARS,{budget:1200000,risk:"BALANCED",body:"ALL",minimumModelYear:2020,maximumMileageKm:100000}); expect(run.rejectedCount).toBeGreaterThan(0); expect(run.matches.every(x=>x.result.organic)).toBe(true);});
  it("does not use membership or sponsored data in runtime input",()=>{const ledger=createDemoPreferenceLedger({budget:1600000,risk:"BALANCED",body:"ALL",minimumModelYear:2020,maximumMileageKm:100000}); expect("planCode" in ledger).toBe(false); expect("campaignId" in ledger).toBe(false);});
});
