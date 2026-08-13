import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";

describe("buildPublishedCatalog", () => {
  it("publishes only complete records with active prices", () => {
    const catalog = buildPublishedCatalog(pilotVehicleRecords, new Date("2026-08-14T12:00:00.000Z"));
    expect(catalog.records.map(({ variant }) => variant.model.value)).toEqual([
      "TUCSON", "IONIQ 5", "IONIQ 9", "Yaris", "Yaris", "Corolla", "Corolla", "Clio", "Captur", "Megane Sedan",
    ]);
    expect(catalog.records[1].activeNewPrice.amountTry).toBe(2_484_602);
    expect(catalog.records[5].activeNewPrice).toMatchObject({ amountTry: 1_850_000, priceType: "CAMPAIGN" });
    expect(catalog.rejected).toEqual([]);
  });

  it("expires campaigns while retaining an open-ended list-price observation", () => {
    const catalog = buildPublishedCatalog(pilotVehicleRecords, new Date("2026-09-01T00:00:00.000Z"));
    expect(catalog.records.map(({ variant }) => variant.model.value)).toEqual(["Yaris", "Yaris", "Corolla", "Corolla", "Clio", "Captur", "Megane Sedan"]);
    expect(catalog.records[0].activeNewPrice.priceType).toBe("LIST");
    expect(catalog.records[2].activeNewPrice).toMatchObject({ amountTry: 2_284_000, priceType: "LIST" });
    expect(catalog.rejected).toHaveLength(3);
    expect(catalog.rejected.every(({ issues }) => issues.includes("ACTIVE_NEW_PRICE_MISSING"))).toBe(true);
  });
});
