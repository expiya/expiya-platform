import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { vehicleDataSourceById } from "@/data/production/vehicleDataSources";
import { validateProductionVehicleIdentity } from "@/features/vehicle-data/validateProductionVehicle";

describe("production pilot records", () => {
  it("have approved provenance and non-expired August prices", () => {
    for (const record of pilotVehicleRecords) {
      expect(validateProductionVehicleIdentity(record.identity, vehicleDataSourceById, new Date("2026-08-13"))).toEqual({ ok: true });
      expect(record.prices.every((price) => price.condition === "NEW")).toBe(true);
      expect(record.prices.every((price) => new Date(price.validUntil!).getTime() >= new Date("2026-08-13").getTime())).toBe(true);
    }
  });
});
