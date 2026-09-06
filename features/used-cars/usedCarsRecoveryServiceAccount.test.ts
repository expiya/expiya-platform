import {describe,expect,it} from "vitest";
import {evaluateAccountRecovery} from "./identity/recovery";
import {authorizeServiceAccount,type ServiceAccountCredential} from "./identity/serviceAccounts";
const credential:ServiceAccountCredential={tenantId:"t1",scopes:["INVENTORY_IMPORT"],issuedAt:0,expiresAt:100,revokedAt:null,interactiveLoginAllowed:false,crossTenantAllowed:false};
describe("account recovery and service accounts",()=>{
 it("revokes sessions and rotates auth version after verified recovery",()=>expect(evaluateAccountRecovery({actorId:"a1",tenantId:"t1",requestedAt:1,verifiedAt:2,secondApproverActorId:null,targetIsPrivileged:false})).toMatchObject({allowed:true,revokeAllSessions:true,rotateActorAuthVersion:true}));
 it("requires an independent approver for privileged recovery",()=>{expect(evaluateAccountRecovery({actorId:"a1",tenantId:null,requestedAt:1,verifiedAt:2,secondApproverActorId:null,targetIsPrivileged:true})).toMatchObject({allowed:false,reason:"SECOND_APPROVAL_REQUIRED"});expect(evaluateAccountRecovery({actorId:"a1",tenantId:null,requestedAt:1,verifiedAt:2,secondApproverActorId:"a1",targetIsPrivileged:true})).toMatchObject({allowed:false,reason:"SELF_APPROVAL_FORBIDDEN"});});
 it("keeps service credentials tenant-scoped and non-interactive",()=>{expect(authorizeServiceAccount({credential,tenantId:"t2",scope:"INVENTORY_IMPORT",now:1,interactive:false})).toMatchObject({allowed:false,reason:"TENANT_MISMATCH"});expect(authorizeServiceAccount({credential,tenantId:"t1",scope:"INVENTORY_IMPORT",now:1,interactive:true})).toMatchObject({allowed:false,reason:"INTERACTIVE_LOGIN_FORBIDDEN"});expect(authorizeServiceAccount({credential,tenantId:"t1",scope:"INVENTORY_IMPORT",now:1,interactive:false})).toEqual({allowed:true});});
});
