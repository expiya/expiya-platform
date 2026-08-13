import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { validatePriceObservations } from "@/features/vehicle-data/validatePriceObservations";

describe("validatePriceObservations", () => {
  it("allows simultaneous list and campaign prices", () => {
    expect(validatePriceObservations(pilotVehicleRecords[3].prices)).toEqual([]);
  });

  it("detects overlapping observations of the same semantic price", () => {
    const original = pilotVehicleRecords[3].prices[0];
    expect(validatePriceObservations([
      original,
      { ...original, id: "596a4007-9d0f-471c-9717-a75ace62aee3", amountTry: original.amountTry + 10_000 },
    ])).toContainEqual({
      code: "OVERLAPPING_PRICE_CONFLICT",
      priceIds: [original.id, "596a4007-9d0f-471c-9717-a75ace62aee3"],
    });
  });
});
