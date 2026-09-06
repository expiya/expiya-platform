import { describe,expect,it } from "vitest";
import { issueUsedCarsCsrfToken,verifyUsedCarsCsrfToken,verifyUsedCarsSameOrigin } from "./security/csrf";
const secret=new TextEncoder().encode("test-only-csrf-secret-at-least-32-bytes");
const token=issueUsedCarsCsrfToken({sessionId:"session-1",tenantId:"tenant-a",action:"INVENTORY_MUTATE",nonce:"nonce-unique-1",issuedAt:1000,ttlSeconds:600,secret,keyVersion:"csrf-v2"});
const verify=(overrides:Partial<Parameters<typeof verifyUsedCarsCsrfToken>[0]>={})=>verifyUsedCarsCsrfToken({token,sessionId:"session-1",tenantId:"tenant-a",action:"INVENTORY_MUTATE",now:1200,secret,...overrides});
describe("used-cars CSRF boundary",()=>{
  it("accepts the exact session, tenant and action context",()=>{const result=verify();expect(result.valid).toBe(true);if(result.valid)expect(result.payload).toMatchObject({keyVersion:"csrf-v2",expiresAt:1600});});
  it("rejects token manipulation with a bad signature",()=>{const [body,signature]=token.split(".");expect(verify({token:`${body.slice(0,-1)}A.${signature}`})).toEqual({valid:false,reason:"BAD_SIGNATURE"});});
  it("rejects cross-session, cross-tenant and cross-action reuse",()=>{expect(verify({sessionId:"session-2"})).toEqual({valid:false,reason:"SESSION_MISMATCH"});expect(verify({tenantId:"tenant-b"})).toEqual({valid:false,reason:"TENANT_MISMATCH"});expect(verify({action:"MEDIA_UPLOAD"})).toEqual({valid:false,reason:"ACTION_MISMATCH"});});
  it("fails closed outside the token lifetime",()=>{expect(verify({now:999})).toEqual({valid:false,reason:"NOT_YET_VALID"});expect(verify({now:1600})).toEqual({valid:false,reason:"EXPIRED"});});
  it("enforces key length and bounded lifetime",()=>{expect(()=>issueUsedCarsCsrfToken({sessionId:"s",tenantId:null,action:"LEAD_SUBMIT",nonce:"n",issuedAt:1,ttlSeconds:600,secret:new Uint8Array(8),keyVersion:"v"})).toThrow("CSRF_KEY_TOO_SHORT");expect(()=>issueUsedCarsCsrfToken({sessionId:"s",tenantId:null,action:"LEAD_SUBMIT",nonce:"n",issuedAt:1,ttlSeconds:7200,secret,keyVersion:"v"})).toThrow("INVALID_CSRF_LIFETIME");});
  it("requires exact HTTPS origin, host and same-site browser context",()=>{const base={origin:"https://partner.expiya.com",host:"partner.expiya.com",forwardedHost:null,secFetchSite:"same-origin",allowedOrigins:["https://partner.expiya.com"]};expect(verifyUsedCarsSameOrigin(base)).toEqual({valid:true});expect(verifyUsedCarsSameOrigin({...base,origin:"https://evil.example"})).toMatchObject({valid:false});expect(verifyUsedCarsSameOrigin({...base,secFetchSite:"cross-site"})).toEqual({valid:false,reason:"CROSS_SITE_REQUEST"});});
});
