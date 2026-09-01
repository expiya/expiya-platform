import type { DealerRole } from "../tenancy/contracts";

export type InvitationState="ISSUED"|"ACCEPTED"|"REVOKED"|"EXPIRED";
export interface DealerInvitation { readonly invitationId:string; readonly tenantId:string; readonly emailFingerprint:string; readonly role:DealerRole; readonly branchIds:readonly string[]; readonly issuedByActorId:string; readonly issuedAt:number; readonly expiresAt:number; readonly state:InvitationState }
export type InvitationDecision={readonly allowed:true;readonly nextState:"ACCEPTED";readonly rotateTenantAuthVersion:true}|{readonly allowed:false;readonly reason:"NOT_ISSUED"|"EXPIRED"|"TENANT_MISMATCH"|"EMAIL_MISMATCH"|"SELF_ESCALATION"};

export function evaluateInvitationAcceptance(input:{readonly invitation:DealerInvitation;readonly tenantId:string;readonly emailFingerprint:string;readonly acceptingActorId:string;readonly now:number}):InvitationDecision {
  const {invitation}=input;
  if(invitation.state!=="ISSUED")return {allowed:false,reason:"NOT_ISSUED"};
  if(input.now>=invitation.expiresAt)return {allowed:false,reason:"EXPIRED"};
  if(invitation.tenantId!==input.tenantId)return {allowed:false,reason:"TENANT_MISMATCH"};
  if(invitation.emailFingerprint!==input.emailFingerprint)return {allowed:false,reason:"EMAIL_MISMATCH"};
  if(invitation.issuedByActorId===input.acceptingActorId)return {allowed:false,reason:"SELF_ESCALATION"};
  return {allowed:true,nextState:"ACCEPTED",rotateTenantAuthVersion:true};
}
