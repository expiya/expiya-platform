import {describe,expect,it} from "vitest";
import {assessLaunchStage,getLaunchDomainStatuses} from "./readiness/launchControl";
describe("unified launch control",()=>{
 it("recognizes the synthetic MVP without authorizing side effects",()=>expect(assessLaunchStage("SYNTHETIC_MVP")).toMatchObject({ready:true,externalSideEffectsAuthorized:false}));
 it("blocks staging, pilot and production on their required domains",()=>{expect(assessLaunchStage("STAGING_INTEGRATION").ready).toBe(false);expect(assessLaunchStage("CONTROLLED_PILOT").ready).toBe(false);expect(assessLaunchStage("PRODUCTION").ready).toBe(false);});
  it("reports every readiness domain exactly once",()=>expect(getLaunchDomainStatuses().map(status=>status.domain)).toEqual(["IDENTITY","DATABASE_RLS","TAXONOMY","PILOT_OPERATIONS","MODERATION_INCIDENT","COMMERCIAL","CONVERSATIONAL_COMMERCE","MODEL_GOVERNANCE","PRODUCT_GOVERNANCE","VENDOR_GOVERNANCE","DATA_GOVERNANCE","LEGAL_GOVERNANCE","HUMAN_OPERATIONS","DATA_QUALITY","EXPERIMENT_GOVERNANCE","ACCESSIBILITY","CONTENT_GOVERNANCE","API_GOVERNANCE","SUPPLY_CHAIN","SECURITY_VALIDATION","DEPLOYMENT","OBSERVABILITY","FEED_INTEGRATION","RESILIENCE","PRIVACY_OPERATIONS"]));
});
