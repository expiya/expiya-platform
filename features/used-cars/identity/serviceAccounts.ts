import type { ServiceAccountScope } from "./contracts";
export interface ServiceAccountCredential { readonly tenantId:string; readonly scopes:readonly ServiceAccountScope[]; readonly issuedAt:number; readonly expiresAt:number; readonly revokedAt:number|null; readonly interactiveLoginAllowed:false; readonly crossTenantAllowed:false }
export type ServiceAccountDecision={readonly allowed:true}|{readonly allowed:false;readonly reason:"REVOKED"|"EXPIRED"|"TENANT_MISMATCH"|"SCOPE_MISSING"|"INTERACTIVE_LOGIN_FORBIDDEN"};
export function authorizeServiceAccount(input:{readonly credential:ServiceAccountCredential;readonly tenantId:string;readonly scope:ServiceAccountScope;readonly now:number;readonly interactive:boolean}):ServiceAccountDecision {
 const {credential}=input;
 if(credential.revokedAt!==null)return {allowed:false,reason:"REVOKED"};
 if(input.now>=credential.expiresAt)return {allowed:false,reason:"EXPIRED"};
 if(input.interactive)return {allowed:false,reason:"INTERACTIVE_LOGIN_FORBIDDEN"};
 if(credential.tenantId!==input.tenantId)return {allowed:false,reason:"TENANT_MISMATCH"};
 if(!credential.scopes.includes(input.scope))return {allowed:false,reason:"SCOPE_MISSING"};
 return {allowed:true};
}
