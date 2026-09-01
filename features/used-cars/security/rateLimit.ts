import { createHmac } from "node:crypto";

export type UsedCarsRateLimitedAction = "PUBLIC_MATCH" | "LEAD_SUBMIT" | "PARTNER_LOGIN" | "INVENTORY_MUTATE" | "IMPORT_DRY_RUN" | "MEDIA_UPLOAD" | "MODERATION_DECIDE";
export interface UsedCarsRateLimitPolicy { readonly action:UsedCarsRateLimitedAction; readonly limit:number; readonly windowSeconds:number; readonly paidPlanOverrideAllowed:false }
export const usedCarsRateLimitPolicies:Readonly<Record<UsedCarsRateLimitedAction,UsedCarsRateLimitPolicy>>=Object.freeze({
  PUBLIC_MATCH:{action:"PUBLIC_MATCH",limit:60,windowSeconds:60,paidPlanOverrideAllowed:false}, LEAD_SUBMIT:{action:"LEAD_SUBMIT",limit:5,windowSeconds:600,paidPlanOverrideAllowed:false},
  PARTNER_LOGIN:{action:"PARTNER_LOGIN",limit:10,windowSeconds:900,paidPlanOverrideAllowed:false}, INVENTORY_MUTATE:{action:"INVENTORY_MUTATE",limit:120,windowSeconds:60,paidPlanOverrideAllowed:false},
  IMPORT_DRY_RUN:{action:"IMPORT_DRY_RUN",limit:10,windowSeconds:300,paidPlanOverrideAllowed:false}, MEDIA_UPLOAD:{action:"MEDIA_UPLOAD",limit:60,windowSeconds:300,paidPlanOverrideAllowed:false},
  MODERATION_DECIDE:{action:"MODERATION_DECIDE",limit:60,windowSeconds:60,paidPlanOverrideAllowed:false},
});

export interface UsedCarsRateLimitIdentity { readonly tenantId:string|null; readonly actorId:string|null; readonly anonymousSessionId:string|null; readonly ipAddress:string }
export interface UsedCarsRateLimitKey { readonly key:string; readonly networkFingerprint:string; readonly rawIpStored:false }

export function buildUsedCarsRateLimitKey(input:{readonly action:UsedCarsRateLimitedAction;readonly identity:UsedCarsRateLimitIdentity;readonly networkSecret:Uint8Array;readonly keyVersion:string}):UsedCarsRateLimitKey {
  if(input.networkSecret.byteLength<32)throw new Error("RATE_LIMIT_NETWORK_KEY_TOO_SHORT");
  const principal=input.identity.actorId??input.identity.anonymousSessionId; if(!principal)throw new Error("RATE_LIMIT_PRINCIPAL_REQUIRED");
  if(input.identity.actorId&&!input.identity.tenantId)throw new Error("PARTNER_TENANT_REQUIRED");
  const networkFingerprint=`hmac-sha256:${input.keyVersion}:${createHmac("sha256",input.networkSecret).update(input.identity.ipAddress).digest("hex")}`;
  const keyPayload=["used-cars-rate-limit/v1",input.action,input.identity.tenantId??"public",principal,networkFingerprint].join(":");
  const key=`rl:${createHmac("sha256",input.networkSecret).update(keyPayload).digest("hex")}`;
  return Object.freeze({key,networkFingerprint,rawIpStored:false});
}

export interface RateLimitWindowState { readonly count:number; readonly windowStartedAtEpochSeconds:number }
export type RateLimitDecision={readonly allowed:true;readonly remaining:number;readonly resetAtEpochSeconds:number}|{readonly allowed:false;readonly remaining:0;readonly retryAfterSeconds:number;readonly resetAtEpochSeconds:number};
export function evaluateUsedCarsRateLimit(policy:UsedCarsRateLimitPolicy,state:RateLimitWindowState|null,nowEpochSeconds:number):RateLimitDecision {
  if(!Number.isInteger(nowEpochSeconds)||nowEpochSeconds<0)throw new Error("INVALID_RATE_LIMIT_TIME");
  const current=!state||nowEpochSeconds>=state.windowStartedAtEpochSeconds+policy.windowSeconds?{count:0,windowStartedAtEpochSeconds:nowEpochSeconds}:state;
  const resetAt=current.windowStartedAtEpochSeconds+policy.windowSeconds;
  if(current.count>=policy.limit)return Object.freeze({allowed:false,remaining:0,retryAfterSeconds:Math.max(1,resetAt-nowEpochSeconds),resetAtEpochSeconds:resetAt});
  return Object.freeze({allowed:true,remaining:policy.limit-current.count-1,resetAtEpochSeconds:resetAt});
}

export interface DistributedRateLimitStore {
  readonly mode:"DISTRIBUTED_ATOMIC"|"LOCAL_TEST";
  increment(input:{readonly key:string;readonly windowSeconds:number;readonly nowEpochSeconds:number}):Promise<RateLimitWindowState>;
}
export async function enforceUsedCarsRateLimit(input:{readonly policy:UsedCarsRateLimitPolicy;readonly key:UsedCarsRateLimitKey;readonly store:DistributedRateLimitStore;readonly nowEpochSeconds:number;readonly production:boolean}):Promise<RateLimitDecision>{
  if(input.production&&input.store.mode!=="DISTRIBUTED_ATOMIC")throw new Error("DISTRIBUTED_RATE_LIMIT_STORE_REQUIRED");
  let state:RateLimitWindowState;
  try{state=await input.store.increment({key:input.key.key,windowSeconds:input.policy.windowSeconds,nowEpochSeconds:input.nowEpochSeconds});}
  catch{throw new Error("RATE_LIMIT_STORE_UNAVAILABLE");}
  return evaluateUsedCarsRateLimit(input.policy,state,input.nowEpochSeconds);
}
