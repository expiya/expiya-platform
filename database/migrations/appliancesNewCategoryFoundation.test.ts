import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { APPLIANCES_CATEGORY_IDS } from "../../features/appliances/categoryRegistry";

describe("new appliance category foundation migration", () => {
  it("idempotently widens only the existing product-type constraint", async () => {
    const sql = await readFile("database/migrations/0013_appliances_new_category_foundation.sql", "utf8");
    for (const categoryId of APPLIANCES_CATEGORY_IDS) expect(sql).toContain(`'${categoryId}'`);
    expect(sql).toContain("drop constraint if exists appliances_conversations_product_type_check");
    expect(sql).not.toMatch(/create\s+table|drop\s+table|truncate|delete\s+from|update\s+/iu);
  });
});
