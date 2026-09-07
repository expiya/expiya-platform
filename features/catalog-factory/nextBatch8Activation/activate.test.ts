import { describe, expect, it } from "vitest";
import { activateNextBatch8 } from "./activate";

describe("next-batch8 atomic activation", () => {
  it("prepares exactly 94→102 with P/Y and runtime integration closed", async () => { const result = await activateNextBatch8(process.cwd(), true); expect(result.pointer.totals).toEqual({ before: 94, additions: 8, active: 102 }); expect(result.pointer).toMatchObject({ pReady: false, yReady: false, runtimeConsumption: "BLOCKED_PENDING_SEPARATE_LOADER_INTEGRATION" }); expect(result.overlay.categories.flatMap((row: { additions: unknown[] }) => row.additions)).toHaveLength(22); });
  it("keeps all excluded mutations outside the event", async () => { const result = await activateNextBatch8(process.cwd(), true); expect(result.activation).toMatchObject({ independentRuntimeIntegration: false, databaseMigration: "NONE", productionDeployment: false, preview: false, push: false }); });
});
