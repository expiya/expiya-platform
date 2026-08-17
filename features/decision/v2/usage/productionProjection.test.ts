import { describe, expect, it } from "vitest";

import { loadProductionCatalogSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import { USAGE_CARGO_POLICIES_V1 } from "./policy";
import { projectCatalogUsageArchitectures } from "./projection";

describe("V2 production usage projection diagnostics", () => {
  it("projects all 577 variants with catalog-derived architecture and missingness counts", async () => {
    const result = await loadProductionCatalogSnapshotForTest(new Date("2026-08-19T00:00:00.000Z"));
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    const projections = projectCatalogUsageArchitectures(result.snapshot, USAGE_CARGO_POLICIES_V1);
    const architectureCounts = Object.fromEntries(["PASSENGER_CAR", "PASSENGER_CARRIER", "ENCLOSED_CARGO", "OPEN_CARGO", "CAB_CHASSIS", "UNKNOWN"].map((architecture) => [architecture, projections.values().filter((projection) => projection.architecture === architecture).length]));
    const bodyCounts = Object.fromEntries(["Panel Van", "Passenger Van", "Pickup", "Chassis Cab", "MPV"].map((body) => [body, result.snapshot.variants.filter((variant) => variant.decisionFacts.bodyStyle.value === body).length]));
    expect(projections.size).toBe(577);
    expect(bodyCounts).toEqual({ "Panel Van": 45, "Passenger Van": 14, Pickup: 9, "Chassis Cab": 9, MPV: 16 });
    expect(architectureCounts).toEqual({ PASSENGER_CAR: 484, PASSENGER_CARRIER: 30, ENCLOSED_CARGO: 45, OPEN_CARGO: 9, CAB_CHASSIS: 9, UNKNOWN: 0 });
    expect(projections.values().filter((projection) => projection.diagnostics.includes("USE_CLASS_MISSING"))).toHaveLength(142);
    expect(result.snapshot.variants.filter((variant) => variant.decisionFacts.dimensions.cargoVolumeLitres === undefined)).toHaveLength(532);
    expect(result.snapshot.variants.filter((variant) => variant.decisionFacts.dimensions.payloadKg === undefined)).toHaveLength(540);
  });

  it("loads the temporal correction as ready after its evidenced August 16 activation", async () => {
    const result = await loadProductionCatalogSnapshotForTest(new Date("2026-08-16T19:33:14.000Z"));
    expect(result).toMatchObject({ status: "READY" });
  });
});
