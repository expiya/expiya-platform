import {describe,expect,it} from "vitest";
import {evaluateInvitationAcceptance,type DealerInvitation} from "./identity/invitations";
const invitation:DealerInvitation={invitationId:"i1",tenantId:"t1",emailFingerprint:"h1",role:"SALES_ADVISOR",branchIds:["b1"],issuedByActorId:"owner",issuedAt:1,expiresAt:100,state:"ISSUED"};
describe("dealer invitation security",()=>{
 it("binds acceptance to tenant and email",()=>{expect(evaluateInvitationAcceptance({invitation,tenantId:"t2",emailFingerprint:"h1",acceptingActorId:"user",now:2})).toMatchObject({allowed:false,reason:"TENANT_MISMATCH"});expect(evaluateInvitationAcceptance({invitation,tenantId:"t1",emailFingerprint:"h2",acceptingActorId:"user",now:2})).toMatchObject({allowed:false,reason:"EMAIL_MISMATCH"});});
 it("requires auth-version rotation after acceptance",()=>expect(evaluateInvitationAcceptance({invitation,tenantId:"t1",emailFingerprint:"h1",acceptingActorId:"user",now:2})).toEqual({allowed:true,nextState:"ACCEPTED",rotateTenantAuthVersion:true}));
 it("blocks replay and self escalation",()=>{expect(evaluateInvitationAcceptance({invitation:{...invitation,state:"ACCEPTED"},tenantId:"t1",emailFingerprint:"h1",acceptingActorId:"user",now:2})).toMatchObject({allowed:false,reason:"NOT_ISSUED"});expect(evaluateInvitationAcceptance({invitation,tenantId:"t1",emailFingerprint:"h1",acceptingActorId:"owner",now:2})).toMatchObject({allowed:false,reason:"SELF_ESCALATION"});});
});
