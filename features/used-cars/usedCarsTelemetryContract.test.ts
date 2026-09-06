import {describe,expect,it} from "vitest";
import {validateTelemetryEvent,type UsedCarsTelemetryEvent} from "./analytics/telemetry";
const event:UsedCarsTelemetryEvent={schemaVersion:"used-cars-telemetry/v1",eventId:"e1",traceId:"t1",stream:"B2C_ORGANIC",name:"organic.detail_opened",occurredAt:"2026-09-01T00:00:00.000Z",service:"USED_CARS_B2C",environment:"LOCAL",attributes:{surface:"matches"},containsRawPii:false,exported:false};
describe("used-cars telemetry contract",()=>{
 it("accepts namespaced non-exported telemetry",()=>expect(validateTelemetryEvent(event)).toEqual([]));
 it("rejects stream confusion",()=>expect(validateTelemetryEvent({...event,stream:"B2C_SPONSORED"})).toContain("STREAM_NAME_MISMATCH"));
 it("requires trace correlation and keeps export off",()=>expect(validateTelemetryEvent({...event,traceId:""})).toContain("CORRELATION_REQUIRED"));
});
