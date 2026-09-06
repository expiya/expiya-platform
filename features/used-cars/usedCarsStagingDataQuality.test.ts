import { describe, expect, it } from "vitest";
import { usedCarsStagingDataQualityJobs, validateDataQualityJobManifest } from "./staging/dataQualityJobManifest";
import { assessDataQualityRehearsal, requiredDataQualityRehearsals } from "./staging/dataQualityRehearsal";
import { assessDataQualityDashboard } from "./staging/dataQualityDashboardGate";
describe("used-cars staging data quality bootstrap", () => {
  it("defines six safe disabled jobs", () => expect(validateDataQualityJobManifest(usedCarsStagingDataQualityJobs)).toEqual({ valid: true, missing: [], unsafeCadence: [], productionJobsAuthorized: false }));
  it("requires nine fail-closed rehearsals", () => expect(assessDataQualityRehearsal([]).missing).toEqual(requiredDataQualityRehearsals));
  it("requires independent dashboard review", () => expect(assessDataQualityDashboard({ measuredAt: "2026-09-01", tenantAggregationOnly: true, rawVinOrPlateVisible: false, allSixJobSignalsVisible: true, thresholdVersion: "v1", alertRoutesTested: true, primaryReviewerId: "same", independentReviewerId: "same", evidenceChecksum: `sha256:${"a".repeat(64)}` }).codes).toContain("INDEPENDENT_REVIEW_REQUIRED"));
});
