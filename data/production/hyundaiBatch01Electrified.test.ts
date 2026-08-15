import { describe, expect, it } from "vitest";

import { stagedHyundaiBatch01ElectrifiedRecords } from "@/data/production/hyundaiBatch01Electrified";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";
import { validatePilotRecordConsistency } from "@/features/vehicle-data/validatePilotRecordConsistency";

describe("Hyundai Batch 01 electrified and SUV staged candidates", () => {
  it("contains 15 unique official price configurations", () => {
    expect(stagedHyundaiBatch01ElectrifiedRecords).toHaveLength(15);
    expect(new Set(stagedHyundaiBatch01ElectrifiedRecords.map((record) => record.identity.id)).size).toBe(15);
  });

  it("passes consistency and production-readiness gates", () => {
    for (const record of stagedHyundaiBatch01ElectrifiedRecords) {
      expect(validatePilotRecordConsistency(record)).toEqual([]);
      expect(assessCatalogReadiness(record, new Date("2026-08-16T12:00:00.000Z"))).toMatchObject({ ready: true, issues: [] });
    }
  });

  it("retains reported battery capacity without inventing usable capacity", () => {
    const electric = stagedHyundaiBatch01ElectrifiedRecords.filter((record) => record.technicalVariant?.powertrain.fuelType.value === "BEV");
    expect(electric).toHaveLength(12);
    expect(electric.every((record) => record.technicalVariant?.efficiency.batteryCapacityKwh && !record.technicalVariant.efficiency.batteryUsableKwh)).toBe(true);
  });
});
