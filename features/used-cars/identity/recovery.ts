export interface RecoveryRequest { readonly actorId:string; readonly tenantId:string|null; readonly requestedAt:number; readonly verifiedAt:number|null; readonly secondApproverActorId:string|null; readonly targetIsPrivileged:boolean }
export type RecoveryDecision={readonly allowed:true;readonly revokeAllSessions:true;readonly rotateActorAuthVersion:true;readonly auditRequired:true}|{readonly allowed:false;readonly reason:"IDENTITY_NOT_REVERIFIED"|"SECOND_APPROVAL_REQUIRED"|"SELF_APPROVAL_FORBIDDEN"};
export function evaluateAccountRecovery(input:RecoveryRequest):RecoveryDecision {
  if(input.verifiedAt===null||input.verifiedAt<input.requestedAt)return {allowed:false,reason:"IDENTITY_NOT_REVERIFIED"};
  if(input.targetIsPrivileged&&input.secondApproverActorId===null)return {allowed:false,reason:"SECOND_APPROVAL_REQUIRED"};
  if(input.secondApproverActorId===input.actorId)return {allowed:false,reason:"SELF_APPROVAL_FORBIDDEN"};
  return {allowed:true,revokeAllSessions:true,rotateActorAuthVersion:true,auditRequired:true};
}
