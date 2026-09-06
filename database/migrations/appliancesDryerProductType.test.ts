import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("DRYER product type migration", () => {
  it("widens only the existing Appliances constraint and preserves the tables", async () => {
    const sql=await readFile("database/migrations/0010_appliances_dryer_product_type.sql","utf8");
    expect(sql).toContain("product_type in ('WASHING_MACHINE', 'DRYER')");
    expect(sql).not.toMatch(/create\s+table|drop\s+table|delete\s+from|truncate/iu);
  });
});
