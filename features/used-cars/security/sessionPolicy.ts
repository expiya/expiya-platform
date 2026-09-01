import type { DealerRole } from "../tenancy/contracts";

export type PartnerSessionActionRisk = "READ" | "MUTATION" | "PII_ACCESS";
export interface PartnerSessionState {
  readonly sessionId:string; readonly actorId:string; readonly tenantId:string; readonly role:DealerRole;
  readonly tenantAuthVersion:number; readonly actorAuthVersion:number; readonly issuedAt:number; readonly lastSeenAt:number;
  readonly lastRotatedAt:number; readonly mfaVerifiedAt:number|null; readonly expiresAt:number; readonly revokedAt:number|null;
}
export interface AuthoritativePartnerAuthState { readonly tenantId:string; readonly role:DealerRole; readonly tenantAuthVersion:number; readonly actorAuthVersion:number; readonly actorActive:boolean; readonly tenantActive:boolean }
export type PartnerSessionDecision={readonly decision:"ALLOW"}|{readonly decision:"ROTATE";readonly reason:"ROTATION_DUE"}|{readonly decision:"REAUTH_MFA";readonly reason:"MFA_REQUIRED"|"MFA_STALE"}|{readonly decision:"REVOKE";readonly reason:"SESSION_REVOKED"|"SESSION_EXPIRED"|"IDLE_TIMEOUT"|"ACTOR_DISABLED"|"TENANT_DISABLED"|"TENANT_CHANGED"|"ROLE_CHANGED"|"AUTH_VERSION_CHANGED"};

export const partnerSessionPolicy=Object.freeze({idleTimeoutSeconds:30*60,absoluteLifetimeSeconds:12*60*60,rotationIntervalSeconds:15*60,mfaFreshnessForMutationSeconds:30*60,mfaFreshnessForPiiSeconds:10*60});

export function evaluatePartnerSession(input:{readonly session:PartnerSessionState;readonly authoritative:AuthoritativePartnerAuthState;readonly actionRisk:PartnerSessionActionRisk;readonly now:number}):PartnerSessionDecision {
  const {session,authoritative,now}=input;
  if(session.revokedAt!==null)return {decision:"REVOKE",reason:"SESSION_REVOKED"};
  if(now>=session.expiresAt||now>=session.issuedAt+partnerSessionPolicy.absoluteLifetimeSeconds)return {decision:"REVOKE",reason:"SESSION_EXPIRED"};
  if(now>=session.lastSeenAt+partnerSessionPolicy.idleTimeoutSeconds)return {decision:"REVOKE",reason:"IDLE_TIMEOUT"};
  if(!authoritative.actorActive)return {decision:"REVOKE",reason:"ACTOR_DISABLED"}; if(!authoritative.tenantActive)return {decision:"REVOKE",reason:"TENANT_DISABLED"};
  if(session.tenantId!==authoritative.tenantId)return {decision:"REVOKE",reason:"TENANT_CHANGED"}; if(session.role!==authoritative.role)return {decision:"REVOKE",reason:"ROLE_CHANGED"};
  if(session.tenantAuthVersion!==authoritative.tenantAuthVersion||session.actorAuthVersion!==authoritative.actorAuthVersion)return {decision:"REVOKE",reason:"AUTH_VERSION_CHANGED"};
  if(session.mfaVerifiedAt===null)return {decision:"REAUTH_MFA",reason:"MFA_REQUIRED"};
  const freshness=input.actionRisk==="PII_ACCESS"?partnerSessionPolicy.mfaFreshnessForPiiSeconds:partnerSessionPolicy.mfaFreshnessForMutationSeconds;
  if(input.actionRisk!=="READ"&&now>=session.mfaVerifiedAt+freshness)return {decision:"REAUTH_MFA",reason:"MFA_STALE"};
  if(now>=session.lastRotatedAt+partnerSessionPolicy.rotationIntervalSeconds)return {decision:"ROTATE",reason:"ROTATION_DUE"};
  return {decision:"ALLOW"};
}
