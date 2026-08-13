import { describe, expect, it } from "vitest";

import { validateProductionVehicleIdentity } from "@/features/vehicle-data/validateProductionVehicle";
import type { DataSource } from "@/types/productionVehicle";

const source: DataSource = {
  id: "toyota-tr", name: "Toyota Türkiye", authority: "PRIMARY",
  homepageUrl: "https://www.toyota.com.tr", usagePermission: "PUBLIC_FACTS_ONLY",
  reviewedAt: "2026-08-13T00:00:00.000Z", reviewNotes: ["Manual/document import only"],
};
const provenance = { sourceId: source.id, sourceUrl: source.homepageUrl, accessedAt: "2026-08-13T00:00:00.000Z", extractionMethod: "DOCUMENT_IMPORT" as const, confidence: "HIGH" as const, limitations: [] };
const field = (value: string | number) => ({ value, provenance: [provenance], confidence: "HIGH" as const });
const valid = { id: "70a9dc5d-c796-4cdd-a8c9-64214a8215bb", market: "TR", lifecycleStatus: "ON_SALE", brand: field("Toyota"), model: field("Yaris"), bodyStyle: field("Hatchback"), trim: field("Hybrid Flame e-CVT"), modelYear: field(2026) };

describe("validateProductionVehicleIdentity", () => {
  it("accepts sourced Turkish-market identity fields", () => {
    expect(validateProductionVehicleIdentity(valid, new Map([[source.id, source]]), new Date("2026-08-13"))).toEqual({ ok: true });
  });

  it("blocks sources that require a contract", () => {
    const licensed = { ...source, usagePermission: "CONTRACT_REQUIRED" as const };
    expect(validateProductionVehicleIdentity(valid, new Map([[source.id, licensed]]), new Date("2026-08-13"))).toMatchObject({ ok: false, errors: [{ code: "SOURCE_NOT_APPROVED" }] });
  });

  it("blocks unknown provenance", () => {
    expect(validateProductionVehicleIdentity(valid, new Map(), new Date("2026-08-13"))).toMatchObject({ ok: false, errors: [{ code: "UNKNOWN_SOURCE" }] });
  });
});
