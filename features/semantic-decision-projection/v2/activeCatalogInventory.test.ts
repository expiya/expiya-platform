import { describe, expect, it } from "vitest";
import { buildActiveCatalogInventory } from "./activeCatalogInventory.server";

describe("active catalog P-materiality inventory", () => {
  it("covers every active registry category and exact production membership", async () => {
    const inventory = await buildActiveCatalogInventory(process.cwd());
    expect(inventory).toHaveLength(54);
    expect(inventory.every((entry) => entry.exactOfferingIds.length > 0)).toBe(true);
    expect(inventory.find((entry) => entry.departmentId === "CARS")?.exactOfferingIds).toHaveLength(549);
    expect(inventory.find((entry) => entry.categoryId === "SMARTPHONE")?.exactOfferingIds).toHaveLength(34);
    expect(inventory.filter((entry) => entry.departmentId === "ELECTRONICS").reduce((sum, entry) => sum + entry.exactOfferingIds.length, 0)).toBe(121);
    expect(new Set(inventory.map((entry) => `${entry.departmentId}:${entry.categoryId}`)).size).toBe(inventory.length);
  });
});
