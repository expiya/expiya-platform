import { describe, expect, it } from "vitest";
import { usedCarsStagingTelemetrySinks, validateStagingTelemetrySinks } from "./staging/observabilityManifest";
import { runRedactionCanary, usedCarsRedactionCanaryCases } from "./staging/redactionCanary";
describe("used-cars staging observability", () => {
  it("keeps five telemetry pipelines disabled", () => { expect(usedCarsStagingTelemetrySinks).toHaveLength(5); expect(validateStagingTelemetrySinks(usedCarsStagingTelemetrySinks)).toMatchObject({ valid: true, telemetryExportAuthorized: false }); });
  it("passes local synthetic redaction canaries", () => expect(runRedactionCanary(usedCarsRedactionCanaryCases)).toMatchObject({ passed: true, externalExportPerformed: false }));
});
