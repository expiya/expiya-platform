import {describe,expect,it} from "vitest";
import {applicationIsolation,authorizeHostSurface,classifyAppHost} from "./routing/hostBoundary";
describe("used-cars host boundary",()=>{
 it("separates platform and partner hosts",()=>{expect(classifyAppHost("www.expiya.com")).toBe("PLATFORM");expect(authorizeHostSurface({host:"partner.expiya.com",pathname:"/stoklar",production:true})).toMatchObject({allowed:true,surface:"PARTNER_APP"});});
 it("rejects host confusion and production demo exposure",()=>{expect(authorizeHostSurface({host:"evil.test",pathname:"/ikinciel",production:true}).allowed).toBe(false);expect(authorizeHostSurface({host:"www.expiya.com",pathname:"/ikinciel/partner-demo",production:true})).toMatchObject({allowed:false,reason:"PARTNER_DEMO_FORBIDDEN_IN_PRODUCTION"});});
 it("uses distinct session, CSRF, audience and database roles",()=>expect(applicationIsolation).toMatchObject({sharedSessionCookie:false,sharedCsrfSecret:false,sharedAuthAudience:false,partnerDatabaseRoleDistinct:true,publicDatabaseRoleReadOnly:true}));
});
