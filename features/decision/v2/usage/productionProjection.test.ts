import { describe, expect, it } from "vitest";

import { loadProductionCatalogSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import { USAGE_CARGO_POLICIES_V1 } from "./policy";
import { projectCatalogUsageArchitectures } from "./projection";

describe("V2 production usage projection diagnostics", () => {
  it("projects every active pinned variant with catalog-derived architecture", async () => {
    const result = await loadProductionCatalogSnapshotForTest(new Date("2026-08-19T00:00:00.000Z"));
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    const projections = projectCatalogUsageArchitectures(result.snapshot, USAGE_CARGO_POLICIES_V1);
    const architectureCounts = Object.fromEntries(["PASSENGER_CAR", "PASSENGER_CARRIER", "ENCLOSED_CARGO", "OPEN_CARGO", "CAB_CHASSIS", "UNKNOWN"].map((architecture) => [architecture, projections.values().filter((projection) => projection.architecture === architecture).length]));
    const bodyCounts = Object.fromEntries(["Panel Van", "Passenger Van", "Pickup", "Chassis Cab", "MPV"].map((body) => [body, result.snapshot.variants.filter((variant) => variant.decisionFacts.bodyStyle.value === body).length]));
    expect(projections.size).toBe(result.snapshot.variants.length);
    expect(Object.values(architectureCounts).reduce((sum, count) => sum + count, 0)).toBe(result.snapshot.variants.length);
    expect(Object.values(bodyCounts).every((count) => count >= 0)).toBe(true);
    expect(architectureCounts.UNKNOWN).toBe(0);
    expect(projections.values().filter((projection) => projection.diagnostics.includes("USE_CLASS_MISSING")).length).toBeGreaterThan(0);
    expect(result.snapshot.variants.filter((variant) => variant.decisionFacts.dimensions.cargoVolumeLitres === undefined).length).toBeGreaterThan(0);
    expect(result.snapshot.variants.filter((variant) => variant.decisionFacts.dimensions.payloadKg === undefined).length).toBeGreaterThan(0);
  });

  it("loads the active catalog as ready after its evidenced activation", async () => {
    const result = await loadProductionCatalogSnapshotForTest(new Date("2026-08-19T00:00:00.000Z"));
    expect(result).toMatchObject({ status: "READY" });
  });
});
