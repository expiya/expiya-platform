import {describe,expect,it} from "vitest";
import {assessCohortReadiness,canTransitionPilotOnboarding} from "./pilot/onboardingCohort";
describe("pilot onboarding cohort",()=>{
 it("enforces ordered onboarding and permits remediation loops",()=>{expect(canTransitionPilotOnboarding("INVITED","DRY_RUN_IMPORT")).toBe(false);expect(canTransitionPilotOnboarding("DRY_RUN_IMPORT","SANDBOX_TRAINING")).toBe(true);expect(canTransitionPilotOnboarding("OPERATIONAL_REVIEW","COHORT_READY")).toBe(true);});
 it("requires trained operators and a clean dry-run",()=>expect(assessCohortReadiness({stage:"OPERATIONAL_REVIEW",namedOwnerPresent:true,trainedUsers:2,dryRunRows:25,dryRunErrorRatio:.04,supportChannelReady:true,realDataTransferAuthorized:false})).toEqual({ready:true,realDataTransferAuthorized:false,codes:[]}));
 it("blocks premature real data transfer",()=>expect(assessCohortReadiness({stage:"OPERATIONAL_REVIEW",namedOwnerPresent:true,trainedUsers:2,dryRunRows:25,dryRunErrorRatio:.04,supportChannelReady:true,realDataTransferAuthorized:true}).codes).toContain("REAL_DATA_TRANSFER_PREMATURE"));
});
