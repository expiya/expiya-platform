import {describe,expect,it} from "vitest";
import {usedCarsWebPolicies,validateCrossDomainHandoff,type CrossDomainHandoff} from "./routing/webSecurityPolicy";
const handoff:CrossDomainHandoff={handoffId:"h1",sourceOrigin:"https://www.expiya.com",destinationOrigin:"https://partner.expiya.com",purpose:"PARTNER_LOGIN",opaqueOneTimeCode:"opaque",issuedAt:"2026-09-01T00:00:00.000Z",expiresAt:"2026-09-01T00:05:00.000Z",consumedAt:null,userPiiInUrl:false,tenantIdInUrl:false};
describe("used-cars web security policy",()=>{
 it("uses a host-only partner cookie",()=>expect(usedCarsWebPolicies.PARTNER).toMatchObject({cookieName:"__Host-expiya_partner",cookieDomain:null,cookiePath:"/",sameSite:"Strict",secure:true,httpOnly:true}));
 it("does not globally grant camera or microphone",()=>{expect(usedCarsWebPolicies.PUBLIC.camera).toBe("none");expect(usedCarsWebPolicies.PARTNER.microphone).toBe("none");});
 it("permits only opaque one-time cross-domain handoff",()=>expect(validateCrossDomainHandoff(handoff,"2026-09-01T00:01:00.000Z")).toEqual([]));
});
