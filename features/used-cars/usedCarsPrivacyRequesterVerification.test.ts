import {describe,expect,it} from "vitest";
import {evaluateRequesterVerification,type PrivacyRequesterVerification} from "./privacy/requesterVerification";
const verification:PrivacyRequesterVerification={requestId:"r1",requesterType:"SUBJECT",contactChallengeVerified:true,accountSessionVerified:true,proportionalAdditionalCheckPassed:false,representativeAuthorityVerified:false,requestedTenantIds:["t1"],discoveredRecipientTenantIds:["t1"],crossTenantSearchAuthorized:false,verificationExpiresAt:"2026-09-02"};
describe("privacy requester verification",()=>{
 it("accepts proportional scoped verification",()=>expect(evaluateRequesterVerification({verification,now:"2026-09-01"})).toEqual({verified:true,scopedTenantIds:["t1"],codes:[]}));
 it("requires representative authority",()=>expect(evaluateRequesterVerification({verification:{...verification,requesterType:"AUTHORIZED_REPRESENTATIVE"},now:"2026-09-01"}).codes).toContain("REPRESENTATIVE_AUTHORITY_REQUIRED"));
 it("rejects undiscovered tenant scope",()=>expect(evaluateRequesterVerification({verification:{...verification,requestedTenantIds:["t2"]},now:"2026-09-01"}).codes).toContain("TENANT_SCOPE_UNVERIFIED"));
});
