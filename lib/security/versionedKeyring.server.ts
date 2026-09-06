import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type SigningKeyState = "ACTIVE" | "VERIFY_ONLY" | "REVOKED";
export interface SigningKeyDescriptor { readonly id:string; readonly secret:string; readonly state:SigningKeyState }
export interface SigningKeyProvider { readonly kind:"PRODUCTION"|"LOCAL_TEST"; load():readonly SigningKeyDescriptor[] }
export type KeyAuditEvent = { readonly type:"TOKEN_SIGNED"|"TOKEN_VERIFIED"|"TOKEN_REJECTED"; readonly keyId?:string; readonly reason?:string; readonly occurredAt:string };
export type KeyAuditSink = (event:KeyAuditEvent)=>void;
export type KeyringReadiness = {readonly ready:true;readonly activeKeyId:string;readonly verificationKeyIds:readonly string[]}|{readonly ready:false;readonly reason:string};

const MIN_SECRET_BYTES=32;
const KEY_ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u;

export class StaticLocalTestKeyProvider implements SigningKeyProvider {
  readonly kind="LOCAL_TEST" as const;
  constructor(private readonly keys:readonly SigningKeyDescriptor[]){}
  load(){return this.keys;}
}

export class EnvironmentProductionKeyProvider implements SigningKeyProvider {
  readonly kind="PRODUCTION" as const;
  constructor(private readonly serialized:string|undefined){}
  load():readonly SigningKeyDescriptor[]{
    if(!this.serialized?.trim())throw new TypeError("SIGNING_KEY_CONFIGURATION_MISSING");
    let parsed:unknown;try{parsed=JSON.parse(this.serialized);}catch{throw new TypeError("SIGNING_KEY_CONFIGURATION_INVALID");}
    if(!Array.isArray(parsed))throw new TypeError("SIGNING_KEY_CONFIGURATION_INVALID");
    return parsed.map(value=>{if(!value||typeof value!=="object")throw new TypeError("SIGNING_KEY_CONFIGURATION_INVALID");const item=value as Record<string,unknown>;return{id:String(item.id??""),secret:String(item.secret??""),state:String(item.state??"") as SigningKeyState};});
  }
}

export class VersionedHmacKeyring {
  private readonly active:SigningKeyDescriptor;
  private readonly byId:ReadonlyMap<string,SigningKeyDescriptor>;
  constructor(provider:SigningKeyProvider,private readonly audit:KeyAuditSink=()=>{}){
    const keys=provider.load();validate(keys);
    if(provider.kind==="PRODUCTION"&&process.env.NODE_ENV!=="production"){/* provider identity is explicit; secrets remain server-only */}
    this.active=keys.find(key=>key.state==="ACTIVE")!;
    this.byId=new Map(keys.map(key=>[key.id,key]));
  }
  readiness():KeyringReadiness{return{ready:true,activeKeyId:this.active.id,verificationKeyIds:[...this.byId.values()].filter(key=>key.state!=="REVOKED").map(key=>key.id)};}
  sign(body:string,now=new Date()){const signature=createHmac("sha256",this.active.secret).update(body).digest("base64url");this.audit({type:"TOKEN_SIGNED",keyId:this.active.id,occurredAt:now.toISOString()});return{kid:this.active.id,signature};}
  verify(kid:string,body:string,supplied:string,now=new Date()):"VALID"|"UNKNOWN_KEY"|"REVOKED_KEY"|"BAD_SIGNATURE"{
    const key=this.byId.get(kid);if(!key){this.reject(kid,"UNKNOWN_KEY",now);return"UNKNOWN_KEY";}if(key.state==="REVOKED"){this.reject(kid,"REVOKED_KEY",now);return"REVOKED_KEY";}
    const expected=createHmac("sha256",key.secret).update(body).digest();let actual:Buffer;try{actual=Buffer.from(supplied,"base64url");}catch{actual=Buffer.alloc(0);}
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected)){this.reject(kid,"BAD_SIGNATURE",now);return"BAD_SIGNATURE";}
    this.audit({type:"TOKEN_VERIFIED",keyId:kid,occurredAt:now.toISOString()});return"VALID";
  }
  private reject(keyId:string,reason:string,now:Date){this.audit({type:"TOKEN_REJECTED",keyId,reason,occurredAt:now.toISOString()});}
}

export function checkSigningKeyReadiness(provider:SigningKeyProvider):KeyringReadiness{try{return new VersionedHmacKeyring(provider).readiness();}catch(error){return{ready:false,reason:error instanceof Error?error.message:"SIGNING_KEY_CONFIGURATION_INVALID"};}}
function validate(keys:readonly SigningKeyDescriptor[]){if(!keys.length)throw new TypeError("SIGNING_KEY_CONFIGURATION_MISSING");if(new Set(keys.map(key=>key.id)).size!==keys.length)throw new TypeError("SIGNING_KEY_ID_DUPLICATE");for(const key of keys){if(!KEY_ID.test(key.id)||!(["ACTIVE","VERIFY_ONLY","REVOKED"] as const).includes(key.state)||Buffer.byteLength(key.secret,"utf8")<MIN_SECRET_BYTES)throw new TypeError("SIGNING_KEY_CONFIGURATION_INVALID");}if(keys.filter(key=>key.state==="ACTIVE").length!==1)throw new TypeError("SIGNING_KEY_ACTIVE_COUNT_INVALID");}
