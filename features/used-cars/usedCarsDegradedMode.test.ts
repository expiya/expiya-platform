import {describe,expect,it} from "vitest";
import {determineDegradedCapabilities,type ResilienceHealth} from "./resilience/degradedMode";
const healthy:ResilienceHealth={primaryDatabase:"HEALTHY",identityProvider:"HEALTHY",objectStorage:"HEALTHY",taxonomyStore:"HEALTHY",kms:"HEALTHY",moderationQueue:"HEALTHY",leadGateway:"HEALTHY",paymentProvider:"HEALTHY"};
describe("degraded mode",()=>{
 it("allows capabilities without automatic failover when healthy",()=>expect(determineDegradedCapabilities(healthy)).toMatchObject({publicRead:true,partnerWrite:true,publication:true,automaticFailover:false}));
 it("keeps public reads but blocks writes on degraded database",()=>expect(determineDegradedCapabilities({...healthy,primaryDatabase:"DEGRADED"})).toMatchObject({publicRead:true,partnerRead:true,partnerWrite:false,publication:false}));
 it("fails closed on unknown integrity",()=>expect(determineDegradedCapabilities({...healthy,objectStorage:"INTEGRITY_UNKNOWN"})).toMatchObject({publicRead:false,partnerRead:false,partnerWrite:false,leadHandoff:false,payments:false}));
 it("blocks sensitive identifier writes when KMS is unavailable",()=>expect(determineDegradedCapabilities({...healthy,kms:"UNAVAILABLE"})).toMatchObject({partnerWrite:false,publication:false}));
});
