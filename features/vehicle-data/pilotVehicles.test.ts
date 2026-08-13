import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { vehicleDataSourceById } from "@/data/production/vehicleDataSources";
import { validateProductionVehicleIdentity } from "@/features/vehicle-data/validateProductionVehicle";
import { validatePriceObservations } from "@/features/vehicle-data/validatePriceObservations";

describe("production pilot records", () => {
  it("have approved provenance and non-expired August prices", () => {
    for (const record of pilotVehicleRecords) {
      expect(validateProductionVehicleIdentity(record.identity, vehicleDataSourceById, new Date("2026-08-13"))).toEqual({ ok: true });
      expect(record.prices.every((price) => price.condition === "NEW")).toBe(true);
      expect(record.prices.every((price) => price.validUntil === undefined || new Date(price.validUntil).getTime() >= new Date("2026-08-13").getTime())).toBe(true);
      expect(validatePriceObservations(record.prices)).toEqual([]);
    }
  });

  it("keeps Corolla gasoline and hybrid variants distinct", () => {
    const corollas = pilotVehicleRecords.filter((record) => record.identity.model.value === "Corolla");
    expect(corollas).toHaveLength(2);
    expect(corollas.map((record) => record.technicalVariant?.powertrain.fuelType.value)).toEqual(["GASOLINE", "HEV"]);
    expect(corollas.map((record) => record.prices[0].amountTry)).toEqual([1_850_000, 2_500_000]);
  });
});
