import {describe,expect,it} from "vitest";
import {loadActiveBrandConstraintPolicy,BRAND_POLICY_ID} from "./policy.server";
describe("Appliances brand constraint authority",()=>{it("loads only the digest-valid active approved policy",async()=>{const loaded=await loadActiveBrandConstraintPolicy(process.cwd());expect(loaded).toMatchObject({status:"READY",snapshot:{policy:{policyId:BRAND_POLICY_ID,governanceStatus:"APPROVED",runtimeActive:true,semantics:{decisionEffect:"HARD_FILTER",scoringEffect:"NONE",noMatch:"EXPLICIT_RELAXATION_REQUIRED"}}}});});});
