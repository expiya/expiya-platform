import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { adaptPublishedCatalogToCars } from "@/features/vehicle-data/adaptPublishedCatalogToCars";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";

describe("adaptPublishedCatalogToCars", () => {
  it("maps ready new Turkish variants without mixing in used prices", () => {
    const published = buildPublishedCatalog(pilotVehicleRecords, new Date("2026-08-13T12:00:00.000Z"));
    const result = adaptPublishedCatalogToCars(published);
    expect(result.rejectedVehicleVariantIds).toEqual([]);
    expect(result.cars).toHaveLength(4);
    expect(result.cars[0]).toMatchObject({ brand: "Hyundai", fuel: "Gasoline", km: 0, price: 2_386_974 });
    expect(result.cars[1]).toMatchObject({ fuel: "Electric", transmission: "Automatic", km: 0 });
  });
});
