import { describe, expect, it } from "vitest";
import { decisionIdentityProjection, validateAmazonPrimaryResearch, type ElectronicsAmazonAuditRow, type ElectronicsAmazonCandidate } from "./amazonPrimaryCatalog";
import { ELECTRONICS_CATEGORY_IDS } from "./architectureBaseline";
import { readFileSync } from "node:fs";
import path from "node:path";

const rows = ELECTRONICS_CATEGORY_IDS.map((categoryId, index): ElectronicsAmazonAuditRow => ({ categoryId, wave: index < 6 ? 1 : index < 12 ? 2 : index < 18 ? 3 : 4, query: categoryId, resultText: "bounded", observedAt: "2026-09-05T00:00:00.000Z", asin: `B0000000${String(index).padStart(2, "0")}`, title: categoryId, canonicalAmazonUrl: `https://www.amazon.com.tr/dp/B0000000${String(index).padStart(2, "0")}`, disposition: index === 0 ? "EXACT_ACTIVE" : "BLOCKED_UNVERIFIABLE", priceObserved: { display: "1 TL", observedAt: "2026-09-05T00:00:00.000Z", authority: "L10_NONE" }, seller: null, fulfilment: null, stockState: "OBSERVED_PRICE", sponsored: false, confidence: index === 0 ? "HIGH" : "LOW", reason: "fixture" }));
const candidate: ElectronicsAmazonCandidate = { exactProductId: "exact:1", categoryId: "SMARTPHONE", wave: 1, brand: "Brand", commercialModel: "Model", manufacturerModelCode: "MPN", configurationIdentity: "Brand|Model|MPN|TR", asin: rows[0].asin!, amazonSourceId: "amazon", trApplicabilitySourceId: "manufacturer-tr", lifecycle: "RESEARCH_CATALOG_ADMISSIBLE", technicalAuthorityFromAmazon: false, decisionAuthority: "NONE" };

describe("Electronics Amazon primary research contract", () => {
  it("accepts all-category coverage with strict exact admission", () => expect(validateAmazonPrimaryResearch({ auditRows: rows, candidates: [candidate], categoryIds: ELECTRONICS_CATEGORY_IDS })).toEqual([]));
  it("rejects family/accessory rows as candidates", () => expect(validateAmazonPrimaryResearch({ auditRows: rows.map((row, index) => index ? row : { ...row, disposition: "ACCESSORY_OR_BUNDLE" }), candidates: [candidate], categoryIds: ELECTRONICS_CATEGORY_IDS })).toContain("CANDIDATE_WITHOUT_EXACT_AMAZON_AUDIT"));
  it("proves L10 changes cannot alter the decision identity projection", () => { const projection = decisionIdentityProjection([candidate]); const changed = rows.map(row => ({ ...row, priceObserved: row.priceObserved && { ...row.priceObserved, display: "999999 TL" }, sponsored: !row.sponsored })); expect(decisionIdentityProjection([candidate])).toEqual(projection); expect(changed[0].priceObserved?.display).not.toBe(rows[0].priceObserved?.display); });
  it("materializes multi-query and page-two coverage for every category", () => {
    const artifact = JSON.parse(readFileSync(path.join(process.cwd(), "data/research/electronics/amazon-tr-primary-catalog-01/amazon-primary-research.json"), "utf8"));
    expect(artifact.queryRuns).toHaveLength(96);
    for (const categoryId of ELECTRONICS_CATEGORY_IDS) {
      const runs = artifact.queryRuns.filter((run: { categoryId: string }) => run.categoryId === categoryId);
      expect(runs).toHaveLength(4);
      expect(new Set(runs.map((run: { query: string }) => run.query)).size).toBe(3);
      expect(runs.some((run: { page: number }) => run.page === 2)).toBe(true);
      expect(artifact.auditRows.some((row: { categoryId: string }) => row.categoryId === categoryId)).toBe(true);
    }
    expect(new Set(artifact.auditRows.map((row: { asin: string }) => row.asin)).size).toBe(artifact.auditRows.length);
    expect(artifact.candidates).toHaveLength(6);
    expect(artifact.boundaries).toMatchObject({ amazonTechnicalAuthority: "NONE", amazonDecisionAuthority: "NONE", priceStockSellerAffiliateSponsorship: "L10_NONE", activePointersMutated: false });
  });
});
