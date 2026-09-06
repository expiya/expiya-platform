import { describe, expect, it } from "vitest";
import { createDeliveryWorkstreamReport, usedCarsDeliveryWorkstreams } from "./readiness/deliveryWorkstreams";
describe("used-cars delivery workstreams", () => {
  it("maps every launch domain exactly once", () => { const report = createDeliveryWorkstreamReport(); expect(usedCarsDeliveryWorkstreams).toHaveLength(25); expect(new Set(usedCarsDeliveryWorkstreams.map((item) => item.domain)).size).toBe(25); expect(report.domainCoverageComplete).toBe(true); });
  it("reports the current 176 open checks", () => expect(createDeliveryWorkstreamReport().totalOpenChecks).toBe(176));
  it("keeps planning separate from production authorization", () => expect(createDeliveryWorkstreamReport().productionAuthorizationChanged).toBe(false));
});
