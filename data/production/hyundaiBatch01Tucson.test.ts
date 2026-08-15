import { describe, expect, it } from "vitest";

import { CORRECTED_TUCSON_VARIANT_ID, stagedHyundaiBatch01TucsonRecords, TUCSON_FACT_SUPERSESSION_REASON } from "@/data/production/hyundaiBatch01Tucson";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";
import { validatePilotRecordConsistency } from "@/features/vehicle-data/validatePilotRecordConsistency";

describe("Hyundai Batch 01 TUCSON conflict closure", () => {
  it("stages six exact current price configurations while retaining the stable corrected identity", () => {
    expect(stagedHyundaiBatch01TucsonRecords).toHaveLength(6);
    expect(stagedHyundaiBatch01TucsonRecords.some((record) => record.identity.id === CORRECTED_TUCSON_VARIANT_ID)).toBe(true);
    expect(TUCSON_FACT_SUPERSESSION_REASON).toContain("180 PS");
  });

  it("publishes 180 PS as 132.4 kW and passes readiness", () => {
    const comfort = stagedHyundaiBatch01TucsonRecords.find((record) => record.identity.trim.value.endsWith("Comfort"));
    expect(comfort?.technicalVariant?.powertrain.powerKw.value).toBe(132.4);
    for (const record of stagedHyundaiBatch01TucsonRecords) {
      expect(validatePilotRecordConsistency(record)).toEqual([]);
      expect(assessCatalogReadiness(record, new Date("2026-08-16T12:00:00.000Z"))).toMatchObject({ ready: true, issues: [] });
    }
  });
});
