import { describe, expect, it } from "vitest";

import { deterministicHyundaiUuid, stagedHyundaiBatch01Records } from "@/data/production/hyundaiBatch01";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";
import { validatePilotRecordConsistency } from "@/features/vehicle-data/validatePilotRecordConsistency";

describe("Hyundai Batch 01 staged production candidates", () => {
  it("contains 21 unique, deterministic MY2026 configurations", () => {
    expect(stagedHyundaiBatch01Records).toHaveLength(21);
    expect(new Set(stagedHyundaiBatch01Records.map((record) => record.identity.id)).size).toBe(21);
    expect(stagedHyundaiBatch01Records.every((record) => record.identity.modelYear.value === 2026)).toBe(true);
    expect(deterministicHyundaiUuid("same")).toBe(deterministicHyundaiUuid("same"));
  });

  it("passes consistency and catalog readiness without activating the batch", () => {
    for (const record of stagedHyundaiBatch01Records) {
      expect(validatePilotRecordConsistency(record)).toEqual([]);
      expect(assessCatalogReadiness(record, new Date("2026-08-16T12:00:00.000Z"))).toMatchObject({ ready: true, issues: [] });
    }
  });

  it("retains GSR2C and E-Call configuration distinctions", () => {
    const gsr = stagedHyundaiBatch01Records.find((record) => record.identity.trim.value.includes("GSR2C & E-Call"));
    expect(gsr?.technicalVariant?.safetyFeatureCodes.map((field) => field.value)).toEqual(expect.arrayContaining(["ICC", "ECALL"]));
  });
});
