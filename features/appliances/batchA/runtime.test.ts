import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadActiveBoundedAuthority, type BoundedProductType } from "../bounded/authority.server";
import { enterAppliancesDepartment } from "../entry.server";

const categories = ["FREEZER", "BUILT_IN_OVEN", "FREESTANDING_COOKER", "HOB", "RANGE_HOOD"] as const satisfies readonly BoundedProductType[];
const categorySlugs: Record<(typeof categories)[number], string> = {
  FREEZER: "freezers",
  BUILT_IN_OVEN: "built-in-ovens",
  FREESTANDING_COOKER: "freestanding-cookers",
  HOB: "hobs",
  RANGE_HOOD: "range-hoods",
};

describe("Batch A public runtime authority", () => {
  it.each(categories)("loads and admits %s with a digest-pinned, multi-brand decision set", async categoryId => {
    const loaded = await loadActiveBoundedAuthority(process.cwd(), categoryId);
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    expect(loaded.snapshot.releaseVersion).toMatch(/-v0\.2$/u);
    expect(loaded.snapshot.pack.products).toHaveLength(3);
    expect(new Set(loaded.snapshot.pack.products.map(product => product.brand)).size).toBeGreaterThanOrEqual(2);
    expect(loaded.snapshot.pack.products.every(product => product.runtimeSelectable && product.runtimeBlockers.length === 0)).toBe(true);
    expect(loaded.snapshot.pack.products.every(product => product.comparisonEligibility?.budgetEligibility === "BUDGET_ELIGIBILITY_UNKNOWN")).toBe(true);
    expect(loaded.snapshot.pack.products.every(product => product.evidenceLayers?.L9 === "INELIGIBLE_NO_FROZEN_MANUAL_BYTES")).toBe(true);
    expect(loaded.snapshot.pack.selectionPolicy).toEqual({ model: "HARD_COMPATIBILITY_THEN_EVIDENCE_BACKED_PARETO", scores: false, weights: false, implicitTieBreak: false });

    const artifact = await readFile(path.join(process.cwd(), "data/production/appliances", categorySlugs[categoryId], "releases", loaded.snapshot.releaseVersion, "domain-pack.json"), "utf8");
    expect(createHash("sha256").update(artifact).digest("hex")).toBe(loaded.snapshot.catalogDigest);
    expect(await enterAppliancesDepartment({ repository: {} as never, productType: categoryId, conversationId: `batch-a-${categoryId}` })).toMatchObject({ status: "READY", state: { productType: categoryId, pinnedCatalogRelease: loaded.snapshot.releaseVersion } });
  });

  it.each(categories)("preserves the v0.1 member in the superseding %s release", async categoryId => {
    const loaded = await loadActiveBoundedAuthority(process.cwd(), categoryId);
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    const oldPack = JSON.parse(await readFile(path.join(process.cwd(), "data/production/appliances", categorySlugs[categoryId], "releases", loaded.snapshot.releaseVersion.replace("v0.2", "v0.1"), "domain-pack.json"), "utf8")) as { products: { productId: string }[] };
    expect(loaded.snapshot.pack.products.map(product => product.productId)).toContain(oldPack.products[0]?.productId);
  });
});
