import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { activateWave02Exact15 } from "./activate";

describe("Wave-02 exact-15 atomic activation", () => {
  it("keeps the historical exact-95 plan dry-run only on current exact-108 production", async () => {
    const result = await activateWave02Exact15(process.cwd(), { dryRun: true });
    expect(result.overlay.totals).toEqual({ before: 80, additions: 15, active: 95 });
    expect(result.overlay.categories).toHaveLength(8);
    expect(result.overlay.categories.flatMap(row => row.additions)).toHaveLength(15);
    const current = JSON.parse(await readFile("data/production/catalog-factory/active.json", "utf8"));
    expect(current.totals).toEqual({ before: 105, additions: 3, active: 108 });
    expect(current).not.toEqual(result.pointer);
  });

  it("keeps deployment, database migration and push out of scope", async () => {
    const result = await activateWave02Exact15(process.cwd(), { dryRun: true });
    expect(result.activation).toMatchObject({ databaseMigration: "NONE", deployment: false, push: false });
    expect(result.overlay.boundaries).toMatchObject({ databaseMigration: "NONE", deployment: false, push: false, newCategories: 0 });
  });
});
