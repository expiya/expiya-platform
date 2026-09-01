import { describe, expect, it } from "vitest";
import { DEMO_MEMBERSHIP_PLANS } from "./plans";
import { DEMO_IMPORT_ROWS, summarizeDemoImport } from "./import";

describe("commercial separation and import demo", () => {
  it("forbids organic ranking benefit in every plan", () => {
    expect(DEMO_MEMBERSHIP_PLANS.every(plan => plan.organicRankingBenefit === false)).toBe(true);
  });
  it("keeps dry-run writes unauthorized and counts every row", () => {
    const result = summarizeDemoImport(DEMO_IMPORT_ROWS);
    expect(result.writeAuthorized).toBe(false);
    expect(result.accepted + result.rejected).toBe(DEMO_IMPORT_ROWS.length);
  });
  it("masks VIN values shown in the report", () => {
    expect(DEMO_IMPORT_ROWS.every(row => row.vinMasked.includes("•"))).toBe(true);
  });
});
