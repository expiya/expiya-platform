import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { activateWave02Exact15 } from "./activate";

describe("Wave-02 exact-15 atomic activation", () => {
  it("is digest-bound and idempotently selects exactly 95 memberships", async () => {
    const dryRun = await activateWave02Exact15(process.cwd(), { dryRun: true });
    const active = await activateWave02Exact15();
    expect(active.pointer).toEqual(dryRun.pointer);
    expect(active.overlay.totals).toEqual({ before: 80, additions: 15, active: 95 });
    expect(active.overlay.categories).toHaveLength(8);
    expect(active.overlay.categories.flatMap(row => row.additions)).toHaveLength(15);
    expect(JSON.parse(await readFile("data/production/catalog-factory/active.json", "utf8"))).toEqual(active.pointer);
  });

  it("keeps deployment, database migration and push out of scope", async () => {
    const result = await activateWave02Exact15(process.cwd(), { dryRun: true });
    expect(result.activation).toMatchObject({ databaseMigration: "NONE", deployment: false, push: false });
    expect(result.overlay.boundaries).toMatchObject({ databaseMigration: "NONE", deployment: false, push: false, newCategories: 0 });
  });
});
