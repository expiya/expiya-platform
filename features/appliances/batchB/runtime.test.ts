import { describe, expect, it } from "vitest";
import { loadActiveBoundedAuthority, type BoundedProductType } from "../bounded/authority.server";
import { enterAppliancesDepartment } from "../entry.server";

const categories: readonly BoundedProductType[] = ["COUNTERTOP_MICROWAVE_OVEN", "BUILT_IN_MICROWAVE_OVEN", "AIR_PURIFIER"];
describe("Batch B public runtime authority", () => {
  it.each(categories)("loads and admits %s with a useful exact Türkiye set", async categoryId => {
    const loaded = await loadActiveBoundedAuthority(process.cwd(), categoryId);
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    expect(loaded.snapshot.pack.products).toHaveLength(3);
    expect(new Set(loaded.snapshot.pack.products.map(product => product.brand)).size).toBeGreaterThanOrEqual(2);
    expect(loaded.snapshot.pack.products.every(product => product.runtimeSelectable && product.runtimeBlockers.length === 0)).toBe(true);
    expect(await enterAppliancesDepartment({ repository: {} as never, productType: categoryId, conversationId: `batch-b-${categoryId}` })).toMatchObject({ status: "READY", state: { productType: categoryId, pinnedCatalogRelease: loaded.snapshot.releaseVersion } });
  });
  it("admits split AC only through its later exact-pair authority", async () => expect(await enterAppliancesDepartment({ repository: {} as never, productType: "SPLIT_AIR_CONDITIONER" })).toMatchObject({ status: "READY", state: { productType: "SPLIT_AIR_CONDITIONER", pinnedCatalogRelease: "APPLIANCES-SPLIT-AIR-CONDITIONER-TR-v0.1" } }));
});
