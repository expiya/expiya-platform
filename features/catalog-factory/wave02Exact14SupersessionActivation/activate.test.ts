import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { activateWave02Exact14Supersession } from "./activate";

describe("Wave-02 exact-14 supersession atomic activation", () => {
  it("selects exactly 94 memberships and records the duplicate with zero effect", async () => {
    const result = await activateWave02Exact14Supersession(process.cwd(), { dryRun: true });
    expect(result.overlay.totals).toEqual({ before: 80, additions: 14, active: 94 });
    expect(result.overlay.categories.flatMap((row: { additions: unknown[] }) => row.additions)).toHaveLength(14);
    expect(result.overlay.duplicateTerminal).toMatchObject({ canonicalExistingExactProductId: "LG_GC_B569NLLM_TR", membershipEffect: 0 });
  });

  it("keeps every excluded mutation boundary out of scope", async () => {
    const result = await activateWave02Exact14Supersession(process.cwd(), { dryRun: true });
    expect(result.activation).toMatchObject({ runtimeEffect: 0, databaseMigration: "NONE", domainPointerMutation: false, preview: false, productionDeployment: false, push: false });
    expect(result.pointer.oldExact15RuntimeAuthority).toBe("PROHIBITED_SUPERSEDED");
  });

  it("matches the materialized active pointer after activation", async () => {
    const active = JSON.parse(await readFile("data/production/catalog-factory/active.json", "utf8"));
    expect(active.activeReleaseId).toBe("CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01");
    expect(active.totals).toEqual({ before: 80, additions: 14, active: 94 });
  });
});
