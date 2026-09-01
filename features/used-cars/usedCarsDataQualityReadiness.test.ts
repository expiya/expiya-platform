import { describe, expect, it } from "vitest";
import { assessDataQualityReadiness } from "./readiness/dataQualityReadiness";
describe("used-cars data quality readiness", () => {
  it("blocks public monitoring, republish and waivers", () => expect(assessDataQualityReadiness()).toMatchObject({ ready: false, publicInventoryMonitoringAuthorized: false, automaticRepublishAuthorized: false, qualityWaiverAuthorized: false }));
  it("recognizes internal policy and workflow", () => { expect(assessDataQualityReadiness().missing).not.toContain("qualityThresholdsReady"); expect(assessDataQualityReadiness().missing).not.toContain("correctionWorkflowReady"); });
});
