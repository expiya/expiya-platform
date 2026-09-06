import { describe, expect, it } from "vitest";
import catalog from "../../data/research/electronics/all-category-expansion-02/candidate-catalog.json";
import ledger from "../../data/research/electronics/all-category-expansion-02/progress-ledger.json";
import matrix from "../../data/research/electronics/all-category-expansion-02/category-24x16-matrix.json";
import approval from "../../data/research/electronics/all-category-expansion-02/consolidated-owner-approval-package.json";

describe("all-category expansion candidate", () => {
  it("materially expands non-headphones without changing the 68-product baseline", () => {
    expect(catalog.retainedBaselineProductIds).toHaveLength(68);
    expect(ledger.totals.nonHeadphonesAfterCandidateCount).toBeGreaterThan(70);
    expect(catalog.newAdmissions.some(p => p.categoryId === "HEADPHONES")).toBe(false);
  });
  it("has unique exact identities and no silent membership drops", () => {
    const ids=[...catalog.retainedBaselineProductIds,...catalog.newAdmissions.map(p=>p.exactProductId)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ledger.categories.every(c=>c.removedMembership.length===0 && c.reconciled===c.observations)).toBe(true);
  });
  it("proves every category pass and preserves unknowns", () => {
    expect(ledger.categories).toHaveLength(24);
    expect(ledger.categories.every(c=>c.expansionPassState==="COMPLETE_EVIDENCED" && c.technicalCatalogReadyForProgram)).toBe(true);
    expect(catalog.newAdmissions.every(p=>p.unknownCodes.length>0 && p.facts.length>=5)).toBe(true);
    expect(ledger.categories.filter(c=>c.admitted===0).every(c=>Boolean(c.zeroAdditionExplanation))).toBe(true);
  });
  it("executes the 24x16 acceptance surface and stays fail closed", () => {
    expect(matrix).toHaveLength(384);
    expect(matrix.filter(c=>c.dimension==="amazon_tr").every(c=>c.state==="INCOMPLETE_APPROVED_API_UNAVAILABLE" && c.failClosed)).toBe(true);
    expect(matrix.filter(c=>c.dimension==="activation_readiness").every(c=>c.state==="PENDING_OWNER_APPROVAL" && c.failClosed)).toBe(true);
    expect(approval.semanticRuntimeChanges.xpyPolicy).toContain("NON_DOMINATED_SET");
  });
});
