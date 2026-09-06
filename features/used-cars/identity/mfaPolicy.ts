import type { DealerRole, ExpiyaRole } from "../tenancy/contracts";

export type MfaMethod="PASSKEY"|"TOTP"|"RECOVERY_CODE"|"SMS";
export type IdentityOperation="SIGN_IN"|"PII_READ"|"TEAM_MANAGE"|"PUBLISH"|"BILLING_CHANGE"|"EXPORT"|"MODERATION_DECISION"|"PLATFORM_ADMIN";
export interface MfaContext { readonly operation:IdentityOperation; readonly role:DealerRole|ExpiyaRole; readonly method:MfaMethod|null; readonly verifiedAt:number|null; readonly now:number }
export type MfaDecision={readonly allowed:true;readonly stepUpRequired:false}|{readonly allowed:false;readonly stepUpRequired:true;readonly reason:"MFA_MISSING"|"PHISHABLE_METHOD_FORBIDDEN"|"MFA_STALE"};

const freshness:Readonly<Record<IdentityOperation,number>>={SIGN_IN:12*60*60,PII_READ:10*60,TEAM_MANAGE:10*60,PUBLISH:30*60,BILLING_CHANGE:5*60,EXPORT:5*60,MODERATION_DECISION:10*60,PLATFORM_ADMIN:5*60};
const phishingResistantOperations:ReadonlySet<IdentityOperation>=new Set(["BILLING_CHANGE","EXPORT","MODERATION_DECISION","PLATFORM_ADMIN"]);

export function evaluateMfa(input:MfaContext):MfaDecision {
  if(input.method===null||input.verifiedAt===null)return {allowed:false,stepUpRequired:true,reason:"MFA_MISSING"};
  if(phishingResistantOperations.has(input.operation)&&input.method!=="PASSKEY")return {allowed:false,stepUpRequired:true,reason:"PHISHABLE_METHOD_FORBIDDEN"};
  if(input.now>=input.verifiedAt+freshness[input.operation])return {allowed:false,stepUpRequired:true,reason:"MFA_STALE"};
  return {allowed:true,stepUpRequired:false};
}
