import { describe, expect, it } from "vitest";
import { authenticateOpsPrincipal, evaluateOpsMfa, opsAuthenticationBoundary, opsMfaPolicy, syntheticPlatformOwner } from "./authentication";
import { evaluateFourEyes } from "./controls";
import { authorizeOpsHost, opsHostIsolation } from "./isolation";
import { evaluateSupportAccess, type SupportAccessGrant } from "./supportAccess";
import { authorizeOpsAction, canManageOpsUsersAndRoles } from "./contracts";
import { validateOpsAuditEvent } from "./audit";

describe("used-cars ops foundation", () => {
  it("keeps production authentication hard-disabled and ignores token role claims", () => {
    expect(opsAuthenticationBoundary.productionAuthenticationEnabled).toBe(false);
    const result=authenticateOpsPrincipal({claims:{issuer:opsAuthenticationBoundary.issuer,audience:opsAuthenticationBoundary.audience,subjectId:"staff-1",expiresAt:2_000,assurance:"AAL2",tokenRoleClaims:["SUPER_ADMIN"]},authoritative:{subjectId:"staff-1",active:true,authzVersion:4,roles:["AUDIT_VIEWER"]},now:1_000});
    expect(result).toEqual({accepted:true,roles:["AUDIT_VIEWER"],ignoredTokenRoleClaims:true});
  });

  it("uses phishing-resistant 2FA and rejects SMS, email OTP and TOTP for critical actions", () => {
    expect(opsMfaPolicy).toMatchObject({primary:"PASSKEY",backup:"HARDWARE_SECURITY_KEY",recovery:"TOTP"});
    expect(evaluateOpsMfa({method:"SMS",verifiedAt:900,now:1_000,critical:false})).toEqual({allowed:false,reason:"METHOD_FORBIDDEN"});
    expect(evaluateOpsMfa({method:"EMAIL_OTP",verifiedAt:900,now:1_000,critical:false})).toEqual({allowed:false,reason:"METHOD_FORBIDDEN"});
    expect(evaluateOpsMfa({method:"TOTP",verifiedAt:900,now:1_000,critical:true})).toEqual({allowed:false,reason:"PHISHING_RESISTANT_METHOD_REQUIRED"});
    expect(evaluateOpsMfa({method:"PASSKEY",verifiedAt:900,now:1_000,critical:true}).allowed).toBe(true);
  });

  it("makes the synthetic platform owner the sole user and role administrator", () => {
    expect(syntheticPlatformOwner.productionAccountCreated).toBe(false);
    expect(canManageOpsUsersAndRoles({actorId:syntheticPlatformOwner.actorId,roles:["SUPER_ADMIN"],ownerActorId:syntheticPlatformOwner.actorId})).toBe(true);
    expect(canManageOpsUsersAndRoles({actorId:"another-admin",roles:["SUPER_ADMIN"],ownerActorId:syntheticPlatformOwner.actorId})).toBe(false);
  });

  it("gives the owner cross-module control without allowing self approval", () => {
    const actor={actorId:syntheticPlatformOwner.actorId,subjectId:"subject-owner",active:true,roles:["SUPER_ADMIN"] as const,authzVersion:1};
    expect(authorizeOpsAction({actor,capability:"MANAGE_USERS_ROLES",scope:"PLATFORM_CONFIGURATION",reasonCode:"OWNER_ADMIN"})).toBe(true);
    expect(authorizeOpsAction({actor,capability:"APPROVE",scope:"TAXONOMY",reasonCode:"RELEASE_REVIEW"})).toBe(true);
    expect(evaluateFourEyes({action:"GRANT_PRIVILEGED_ROLE",requestedBy:actor.actorId,approvedBy:actor.actorId,reasonCode:"ROLE_GRANT",stepUpMfa:true}).allowed).toBe(false);
  });

  it("rejects partner/public audiences and hosts", () => {
    const result=authenticateOpsPrincipal({claims:{issuer:opsAuthenticationBoundary.issuer,audience:"urn:expiya:partner",subjectId:"staff-1",expiresAt:2_000,assurance:"AAL2",tokenRoleClaims:[]},authoritative:{subjectId:"staff-1",active:true,authzVersion:1,roles:[]},now:1_000});
    expect(result).toEqual({accepted:false,reason:"AUDIENCE_MISMATCH"});
    expect(authorizeOpsHost({host:"partner.expiya.com",pathname:"/",production:true}).allowed).toBe(false);
    expect(authorizeOpsHost({host:"expiya.com",pathname:"/ops-demo",production:true}).allowed).toBe(false);
    expect(authorizeOpsHost({host:opsHostIsolation.canonicalHost,pathname:"/",production:true}).allowed).toBe(true);
  });

  it("requires an authoritative role, reason and assigned task", () => {
    const actor={actorId:"moderator-1",subjectId:"subject-1",active:true,roles:["LISTING_MODERATOR"] as const,authzVersion:2};
    expect(authorizeOpsAction({actor,capability:"APPROVE",scope:"LISTING",reasonCode:"POLICY_MATCH",assignedTaskId:"task-1",requestedTaskId:"task-1"})).toBe(true);
    expect(authorizeOpsAction({actor,capability:"APPROVE",scope:"LISTING",reasonCode:"POLICY_MATCH",assignedTaskId:"task-1",requestedTaskId:"task-2"})).toBe(false);
    expect(authorizeOpsAction({actor,capability:"VIEW_FINANCE",scope:"FINANCE",reasonCode:"SUPPORT"})).toBe(false);
  });

  it("forbids same-actor approval", () => {
    expect(evaluateFourEyes({action:"ACTIVATE_TAXONOMY_RELEASE",requestedBy:"actor-1",approvedBy:"actor-1",reasonCode:"RELEASE_READY",stepUpMfa:true})).toEqual({allowed:false,reason:"SELF_APPROVAL_FORBIDDEN"});
    expect(evaluateFourEyes({action:"ACTIVATE_TAXONOMY_RELEASE",requestedBy:"actor-1",approvedBy:"actor-2",reasonCode:"RELEASE_READY",stepUpMfa:true}).allowed).toBe(true);
  });

  it("binds support access to actor, case, tenant, time and mutation scope", () => {
    const grant:SupportAccessGrant={grantId:"grant-1",caseId:"case-1",actorId:"support-1",tenantId:"tenant-1",branchId:null,reasonCode:"USER_SUPPORT",mode:"SCOPED_MUTATION",mutationScopes:["RESET_INVITATION"],issuedAt:100,expiresAt:200,revokedAt:null,approvedByActorId:"manager-1",notificationRequired:true,impersonationAllowed:false,bulkExportAllowed:false};
    expect(evaluateSupportAccess(grant,{actorId:"support-1",caseId:"case-1",tenantId:"tenant-1",branchId:null,now:150,operation:"MUTATE",mutationScope:"RESET_INVITATION",stepUpMfa:true}).allowed).toBe(true);
    expect(evaluateSupportAccess(grant,{actorId:"support-1",caseId:"case-1",tenantId:"tenant-1",branchId:null,now:150,operation:"EXPORT",stepUpMfa:true})).toEqual({allowed:false,reason:"BULK_EXPORT_FORBIDDEN"});
  });

  it("requires complete immutable audit context", () => {
    const result=validateOpsAuditEvent({version:"expiya-ops-audit/v1",eventId:"event-1",occurredAt:"2026-09-02T10:00:00Z",actorId:"actor-1",actorType:"EXPIYA_ADMIN",action:"DEALER_FIELD_CHANGED",tenantId:"tenant-1",branchId:null,caseId:"case-1",subjectType:"DEALER",subjectId:"dealer-1",reasonCode:"VERIFIED_CORRECTION",oldValueRef:"evidence:old",newValueRef:"evidence:new",approvalChain:["actor-1","actor-2"],piiAccessPurpose:null,supportGrantId:"grant-1",correlationId:"corr-1"});
    expect(result).toMatchObject({valid:true,appendOnlyRequired:true,immutableSinkRequired:true});
  });
});
