import {describe,expect,it} from "vitest";
import {evaluateMfa} from "./identity/mfaPolicy";

describe("used-cars MFA policy",()=>{
  it("requires MFA",()=>expect(evaluateMfa({operation:"PUBLISH",role:"INVENTORY_EDITOR",method:null,verifiedAt:null,now:100})).toMatchObject({allowed:false,reason:"MFA_MISSING"}));
  it("requires a passkey for phishing-resistant critical actions",()=>{for(const method of ["SMS","RECOVERY_CODE","TOTP"] as const)expect(evaluateMfa({operation:"EXPORT",role:"DEALER_OWNER",method,verifiedAt:99,now:100})).toMatchObject({allowed:false,reason:"PHISHABLE_METHOD_FORBIDDEN"});});
  it("accepts a fresh passkey and rejects stale proof",()=>{expect(evaluateMfa({operation:"PLATFORM_ADMIN",role:"EXPIYA_SYSTEM_ADMIN",method:"PASSKEY",verifiedAt:99,now:100}).allowed).toBe(true);expect(evaluateMfa({operation:"PLATFORM_ADMIN",role:"EXPIYA_SYSTEM_ADMIN",method:"PASSKEY",verifiedAt:0,now:301})).toMatchObject({allowed:false,reason:"MFA_STALE"});});
});
