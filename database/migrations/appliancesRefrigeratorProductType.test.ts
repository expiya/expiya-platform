import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Appliances refrigerator product type migration", () => {
  it("widens the existing table constraint without creating a persistence subsystem", async () => {
    const sql = await readFile("database/migrations/0011_appliances_refrigerator_product_type.sql", "utf8");
    expect(sql).toContain("'WASHING_MACHINE', 'DRYER', 'REFRIGERATOR'");
    expect(sql).toContain("drop constraint if exists appliances_conversations_product_type_check");
    expect(sql).not.toMatch(/create\s+table/iu);
  });
});
