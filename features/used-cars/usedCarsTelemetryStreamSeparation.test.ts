import {describe,expect,it} from "vitest";
import {telemetrySinkPolicies,validateStreamSeparation} from "./analytics/streamSeparation";
import type {UsedCarsTelemetryEvent} from "./analytics/telemetry";
const event:UsedCarsTelemetryEvent={schemaVersion:"used-cars-telemetry/v1",eventId:"e1",traceId:"t1",stream:"B2C_ORGANIC",name:"organic.impression",occurredAt:"2026-09-01",service:"USED_CARS_B2C",environment:"LOCAL",attributes:{positionBucket:"1-3"},containsRawPii:false,exported:false};
describe("telemetry stream separation",()=>{
 it("keeps every stream on a distinct sink with no ranking consumer",()=>{expect(new Set(telemetrySinkPolicies.map(policy=>policy.sink)).size).toBe(telemetrySinkPolicies.length);expect(telemetrySinkPolicies.every(policy=>!policy.rankingConsumerAllowed)).toBe(true);});
 it("rejects commercial fields in organic telemetry",()=>expect(validateStreamSeparation({...event,attributes:{campaignId:"c1"}})).toContain("COMMERCIAL_FIELD_IN_ORGANIC_STREAM"));
 it("requires sponsored attribution",()=>expect(validateStreamSeparation({...event,stream:"B2C_SPONSORED",name:"sponsored.impression",attributes:{}})).toContain("SPONSORED_ATTRIBUTION_REQUIRED"));
});
