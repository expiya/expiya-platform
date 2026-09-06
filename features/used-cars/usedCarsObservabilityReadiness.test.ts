import {describe,expect,it} from "vitest";
import {currentUsedCarsObservabilityReadiness,usedCarsObservabilityReadinessSnapshot} from "./readiness/observabilityReadiness";
describe("observability readiness",()=>{
 it("records internal telemetry controls without claiming provider setup",()=>{expect(usedCarsObservabilityReadinessSnapshot.prerequisites.telemetrySchemaReady).toBe(true);expect(usedCarsObservabilityReadinessSnapshot.prerequisites.telemetryProviderConfigured).toBe(false);});
 it("keeps export and production alerts blocked",()=>expect(currentUsedCarsObservabilityReadiness).toMatchObject({ready:false,realTelemetryExportAuthorized:false,productionAlertingAuthorized:false}));
});
