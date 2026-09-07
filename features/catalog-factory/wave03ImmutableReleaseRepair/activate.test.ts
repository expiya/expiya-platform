import { describe, expect, it } from "vitest";
import { activateWave03RepairedExact3 } from "./activate";

describe("Wave-03 repaired exact3 atomic activation", () => {
  it("prepares exactly one 102→105 pointer transition", async () => {
    const result = await activateWave03RepairedExact3(process.cwd(), true);
    expect(result.pointer.totals).toEqual({ before: 102, additions: 3, active: 105 });
    expect(result.overlay.categories.flatMap((row: { additions: unknown[] }) => row.additions)).toHaveLength(25);
    expect(result.pointer).toMatchObject({ pReady: false, yReady: false, runtimeConsumption: "BLOCKED_PENDING_SEPARATE_LOADER_INTEGRATION" });
    expect(result.receipt).toMatchObject({ status: "SUCCESS", oldPointerSha256: "494f01bd0221f9323a450b6105a10086f127e625aed52c96f07e30e6e6967108" });
  });

  it("keeps every excluded mutation outside the activation event", async () => {
    const result = await activateWave03RepairedExact3(process.cwd(), true);
    expect(result.activation).toMatchObject({ independentRuntimeIntegration: false, databaseMigration: "NONE", productionDeployment: false, preview: false, push: false, pReady: false, yReady: false });
  });
});
