import { describe, expect, it } from "vitest";
import { buildCurrentCatalogStageTwoReadiness } from "./currentCatalogReadiness.server";

describe("current production catalog Stage 2 readiness", () => {
  it("preserves the 6-department, 54-category and 813-exact-offering inventory", async () => {
    const matrix = await buildCurrentCatalogStageTwoReadiness();
    expect(matrix).toHaveLength(54);
    expect(new Set(matrix.map(item => item.departmentId))).toHaveLength(6);
    expect(matrix.reduce((sum, item) => sum + item.exactOfferingCount, 0)).toBe(813);
    expect(matrix.every(item => item.exactOfferingCount > 0)).toBe(true);
  });

  it("keeps Cars and Appliances authorized and every Electronics category activation-ready", async () => {
    const matrix = await buildCurrentCatalogStageTwoReadiness();
    expect(matrix.filter(item => item.readiness === "AUTHORIZED_EXISTING_RUNTIME")).toHaveLength(25);
    const electronics = matrix.filter(item => item.departmentId === "ELECTRONICS");
    expect(electronics).toHaveLength(24);
    expect(electronics.every(item => item.readiness === "ACTIVATION_READY" && item.missing.includes("MIGRATION_0018_APPLY"))).toBe(true);
  });
});
