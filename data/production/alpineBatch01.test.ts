import { describe, expect, it } from "vitest";
import { deterministicAlpineUuid, stagedAlpineBatch01Records } from "@/data/production/alpineBatch01";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";
import { validatePilotRecordConsistency } from "@/features/vehicle-data/validatePilotRecordConsistency";

describe("Alpine Batch 01 production candidates", () => {
  it("contains the two current exact-priced Turkey configurations", () => {
    expect(stagedAlpineBatch01Records).toHaveLength(2);
    expect(stagedAlpineBatch01Records.map((r) => `${r.identity.model.value} ${r.identity.trim.value}`)).toEqual(["A290 GT Performance", "A390 GT"]);
    expect(deterministicAlpineUuid("same")).toBe(deterministicAlpineUuid("same"));
  });
  it("passes consistency and readiness gates", () => {
    for (const record of stagedAlpineBatch01Records) { expect(validatePilotRecordConsistency(record)).toEqual([]); expect(assessCatalogReadiness(record, new Date("2026-08-16T21:00:00.000Z"))).toMatchObject({ ready: true, issues: [] }); }
  });
  it("retains the official A290 range conflict and reported battery semantics", () => {
    const a290 = stagedAlpineBatch01Records[0].technicalVariant!;
    expect(a290.efficiency.electricRangeKm).toMatchObject({ value: 361, confidence: "MEDIUM", conflictGroupId: "alpine-a290-gt-performance-wltp-range-2025-2026" });
    expect(a290.efficiency.batteryCapacityKwh?.provenance[0].limitations).toContain("Manufacturer-reported battery capacity is not interpreted as gross or usable");
  });
  it("keeps prices eligible without artificial expiry", () => {
    expect(stagedAlpineBatch01Records.every((r) => r.prices[0].validUntil === undefined)).toBe(true);
    expect(stagedAlpineBatch01Records.every((r) => assessCatalogReadiness(r, new Date("2028-01-01T00:00:00.000Z")).ready)).toBe(true);
  });
});
