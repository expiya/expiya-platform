import { describe, expect, it } from "vitest";
import report from "../../outputs/catalog-factory-active-coverage-wave-01/WAVE_REPORT.json";

describe("Catalog Factory active coverage wave 01", () => {
  it("keeps Smartphone separate and production lineage pinned", () => {
    expect(report.lineage.correctedLedgerDigest).toBe("4fc7ccce5b7837b59b719c1e1b364b3458503b59978ec99399c5d6b21a380df8");
    expect(report.smartphoneDependency).toMatchObject({ treatment: "STATUS_ONLY_DO_NOT_RESEARCH_MODIFY_OR_ACTIVATE", activeCountImpactFromThisWave: 0 });
  });

  it("meets the owner-requested diversity targets without activation", () => {
    expect(report.categories).toHaveLength(5);
    for (const category of report.categories) {
      expect(category.actual.exact).toBeGreaterThanOrEqual(category.target.exact);
      expect(category.actual.brands).toBeGreaterThanOrEqual(category.target.brands);
      expect(category.actual.segments).toBeGreaterThanOrEqual(category.target.segments);
      expect(category.gates.ownerApproval).toBe("PENDING");
    }
    expect(report.activationBoundary).toEqual({ ownerApprovalRequired: true, activePointerWrite: false, runtimeMutation: false, databaseMutation: false, deployment: false });
  });
});
