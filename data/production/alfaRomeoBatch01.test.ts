import { describe, expect, it } from "vitest";

import { deterministicAlfaRomeoUuid, stagedAlfaRomeoBatch01Records } from "@/data/production/alfaRomeoBatch01";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";
import { validatePilotRecordConsistency } from "@/features/vehicle-data/validatePilotRecordConsistency";

describe("Alfa Romeo Batch 01 production candidates", () => {
  it("contains four unique deterministic MY2026 configurations", () => {
    expect(stagedAlfaRomeoBatch01Records).toHaveLength(4);
    expect(new Set(stagedAlfaRomeoBatch01Records.map((record) => record.identity.id)).size).toBe(4);
    expect(stagedAlfaRomeoBatch01Records.every((record) => record.identity.modelYear.value === 2026)).toBe(true);
    expect(deterministicAlfaRomeoUuid("same")).toBe(deterministicAlfaRomeoUuid("same"));
  });

  it("passes consistency and production-readiness gates", () => {
    for (const record of stagedAlfaRomeoBatch01Records) {
      expect(validatePilotRecordConsistency(record)).toEqual([]);
      expect(assessCatalogReadiness(record, new Date("2026-08-16T18:00:00.000Z"))).toMatchObject({ ready: true, issues: [] });
    }
  });

  it("retains system-power and battery semantics", () => {
    const juniorEv = stagedAlfaRomeoBatch01Records.find((record) => record.identity.trim.value.includes("Elettrica"));
    expect(juniorEv?.technicalVariant?.efficiency).toMatchObject({ batteryCapacityKwh: { value: 54 }, batteryUsableKwh: { value: 51 } });
    const tonaleHybrid = stagedAlfaRomeoBatch01Records.find((record) => record.identity.trim.value.includes("Hybrid 175"));
    expect(tonaleHybrid?.technicalVariant?.powertrain.powerKw).toMatchObject({ value: 128.7, confidence: "MEDIUM" });
  });

  it("keeps dated prices eligible without an artificial expiry", () => {
    expect(stagedAlfaRomeoBatch01Records.every((record) => record.prices[0].validUntil === undefined)).toBe(true);
    expect(stagedAlfaRomeoBatch01Records.every((record) => assessCatalogReadiness(record, new Date("2028-01-01T00:00:00.000Z")).ready)).toBe(true);
  });
});
