import { createHmac, timingSafeEqual } from "node:crypto";

export type UsedCarsCsrfAction = "LEAD_SUBMIT" | "INVENTORY_MUTATE" | "LISTING_SUBMIT" | "MEDIA_UPLOAD" | "MEMBERSHIP_MUTATE" | "MODERATION_DECIDE";
interface CsrfPayload { readonly v:1; readonly sessionId:string; readonly tenantId:string|null; readonly action:UsedCarsCsrfAction; readonly nonce:string; readonly issuedAt:number; readonly expiresAt:number; readonly keyVersion:string }
export type CsrfDecision={readonly valid:true;readonly payload:Readonly<CsrfPayload>}|{readonly valid:false;readonly reason:"MALFORMED"|"BAD_SIGNATURE"|"SESSION_MISMATCH"|"TENANT_MISMATCH"|"ACTION_MISMATCH"|"NOT_YET_VALID"|"EXPIRED"};
export type SameOriginDecision={readonly valid:true}|{readonly valid:false;readonly reason:"ORIGIN_REQUIRED"|"ORIGIN_FORBIDDEN"|"HOST_MISMATCH"|"CROSS_SITE_REQUEST"};

const encode=(value:string)=>Buffer.from(value,"utf8").toString("base64url");
const sign=(body:string,secret:Uint8Array)=>createHmac("sha256",secret).update(body).digest("base64url");

export function issueUsedCarsCsrfToken(input:{readonly sessionId:string;readonly tenantId:string|null;readonly action:UsedCarsCsrfAction;readonly nonce:string;readonly issuedAt:number;readonly ttlSeconds:number;readonly secret:Uint8Array;readonly keyVersion:string}):string {
  if(input.secret.byteLength<32)throw new Error("CSRF_KEY_TOO_SHORT"); if(!input.sessionId||!input.nonce||!input.keyVersion)throw new Error("CSRF_CONTEXT_REQUIRED");
  if(!Number.isInteger(input.issuedAt)||!Number.isInteger(input.ttlSeconds)||input.ttlSeconds<60||input.ttlSeconds>3600)throw new Error("INVALID_CSRF_LIFETIME");
  const payload:CsrfPayload={v:1,sessionId:input.sessionId,tenantId:input.tenantId,action:input.action,nonce:input.nonce,issuedAt:input.issuedAt,expiresAt:input.issuedAt+input.ttlSeconds,keyVersion:input.keyVersion};
  const body=encode(JSON.stringify(payload)); return `${body}.${sign(body,input.secret)}`;
}

export function verifyUsedCarsSameOrigin(input:{readonly origin:string|null;readonly host:string|null;readonly forwardedHost:string|null;readonly secFetchSite:string|null;readonly allowedOrigins:readonly string[]}):SameOriginDecision {
  if(!input.origin)return {valid:false,reason:"ORIGIN_REQUIRED"};
  let origin:URL; try{origin=new URL(input.origin);}catch{return {valid:false,reason:"ORIGIN_FORBIDDEN"};}
  if(origin.protocol!=="https:"||!input.allowedOrigins.includes(origin.origin))return {valid:false,reason:"ORIGIN_FORBIDDEN"};
  const requestHost=input.forwardedHost??input.host;
  if(!requestHost||origin.host!==requestHost)return {valid:false,reason:"HOST_MISMATCH"};
  if(input.secFetchSite&&!["same-origin","none"].includes(input.secFetchSite))return {valid:false,reason:"CROSS_SITE_REQUEST"};
  return {valid:true};
}

export function verifyUsedCarsCsrfToken(input:{readonly token:string;readonly sessionId:string;readonly tenantId:string|null;readonly action:UsedCarsCsrfAction;readonly now:number;readonly secret:Uint8Array}):CsrfDecision {
  const parts=input.token.split("."); if(parts.length!==2||input.secret.byteLength<32)return {valid:false,reason:"MALFORMED"};
  const [body,provided]=parts; const expected=sign(body,input.secret); const providedBytes=Buffer.from(provided); const expectedBytes=Buffer.from(expected);
  if(providedBytes.byteLength!==expectedBytes.byteLength||!timingSafeEqual(providedBytes,expectedBytes))return {valid:false,reason:"BAD_SIGNATURE"};
  let payload:CsrfPayload; try{payload=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as CsrfPayload;}catch{return {valid:false,reason:"MALFORMED"};}
  if(payload.v!==1||!payload.sessionId||!payload.nonce||!Number.isInteger(payload.issuedAt)||!Number.isInteger(payload.expiresAt))return {valid:false,reason:"MALFORMED"};
  if(payload.sessionId!==input.sessionId)return {valid:false,reason:"SESSION_MISMATCH"}; if(payload.tenantId!==input.tenantId)return {valid:false,reason:"TENANT_MISMATCH"};
  if(payload.action!==input.action)return {valid:false,reason:"ACTION_MISMATCH"}; if(input.now<payload.issuedAt)return {valid:false,reason:"NOT_YET_VALID"}; if(input.now>=payload.expiresAt)return {valid:false,reason:"EXPIRED"};
  return {valid:true,payload:Object.freeze(payload)};
}
