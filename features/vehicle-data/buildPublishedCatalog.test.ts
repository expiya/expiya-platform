import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";

describe("buildPublishedCatalog", () => {
  it("publishes only complete records with active prices", () => {
    const catalog = buildPublishedCatalog(pilotVehicleRecords, new Date("2026-08-13T12:00:00.000Z"));
    expect(catalog.records.map(({ variant }) => variant.model.value)).toEqual(["TUCSON", "IONIQ 5", "IONIQ 9"]);
    expect(catalog.records[1].activeNewPrice.amountTry).toBe(2_484_602);
    expect(catalog.rejected).toEqual([]);
  });

  it("publishes no stale prices", () => {
    const catalog = buildPublishedCatalog(pilotVehicleRecords, new Date("2026-09-01T00:00:00.000Z"));
    expect(catalog.records).toHaveLength(0);
    expect(catalog.rejected.every(({ issues }) => issues.includes("ACTIVE_NEW_PRICE_MISSING"))).toBe(true);
  });
});
