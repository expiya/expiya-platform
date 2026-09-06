import { describe, expect, it } from "vitest";
import ledger from "../../outputs/catalog-factory-coverage-audit-2026-09-07/coverage-ledger.json";

describe("catalog factory coverage audit", () => {
  it("keeps active lineage counts separate and exact", () => {
    const counts = Object.fromEntries(ledger.departmentSummary.map(x => [x.departmentId, x.activeExactVariantCount]));
    expect(counts).toMatchObject({ CARS: 549, ELECTRONICS: 93, BABY_AND_CHILD: 4, MOBILITY: 10, TOOLS: 16 });
    expect(ledger.lineage.smartphonePending).toMatchObject({ lifecycle: "PENDING_NOT_ACTIVE", exactVariantCount: 33, activeCountImpact: 0 });
  });

  it("covers every declared active category exactly once", () => {
    expect(new Set(ledger.rows.map(x => `${x.categoryId}:${x.lifecycle}`)).size).toBe(ledger.rows.length);
    expect(ledger.departmentSummary.reduce((n, x) => n + x.categoryCount, 0)).toBe(ledger.rows.length);
  });

  it("records rates as numeric or explicitly unauditable", () => {
    for (const row of ledger.rows) {
      const hard = row.hardFilterCoverage;
      expect(hard.fillRatePct === null || (hard.fillRatePct >= 0 && hard.fillRatePct <= 100)).toBe(true);
      expect(hard.discriminatingFieldRatePct === null || (hard.discriminatingFieldRatePct >= 0 && hard.discriminatingFieldRatePct <= 100)).toBe(true);
      expect(row.unknownRatePct === null || (row.unknownRatePct >= 0 && row.unknownRatePct <= 100)).toBe(true);
    }
  });

  it("is audit-only and proposes a bounded first wave", () => {
    expect(Object.values(ledger.invariants).every(value => value === false)).toBe(true);
    expect(ledger.expansionWave).toHaveLength(6);
    expect(ledger.expansionWave.every(x => x.targetExactVariants > 0 && x.targetBrands > 0 && x.targetSegments > 0)).toBe(true);
  });
});
