import {describe,expect,it} from "vitest";
import {redactTelemetryAttributes,validateMetricDimensions} from "./analytics/redaction";
describe("telemetry redaction and metric dimensions",()=>{
 it("drops sensitive keys and redacts sensitive values",()=>expect(redactTelemetryAttributes({phone:"5551112233",contact:"user@example.com",operation:"listing_read",count:2})).toEqual({contact:"[REDACTED]",operation:"listing_read",count:2}));
 it("allows only bounded low-cardinality dimensions",()=>expect(validateMetricDimensions({service:"USED_CARS_PARTNER",routeTemplate:"/inventory/[id]"})).toEqual([]));
 it("rejects tenant, listing and raw identifier dimensions",()=>expect(validateMetricDimensions({tenantId:"t1",listingId:"l1"})).toEqual(["DIMENSION_FORBIDDEN:tenantId","DIMENSION_FORBIDDEN:listingId"]));
});
