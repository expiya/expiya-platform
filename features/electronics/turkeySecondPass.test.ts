import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decisionNeutralIdentitySet, validateTurkeySecondPass, type TurkeySecondPassCandidate, type TurkeySecondPassInvestigation } from "./turkeySecondPass";
import { ELECTRONICS_CATEGORY_IDS } from "./architectureBaseline";

const investigations = ELECTRONICS_CATEGORY_IDS.flatMap((categoryId, categoryIndex) => [0, 1].map((index): TurkeySecondPassInvestigation => ({ investigationId: `${categoryId}:${index}`, categoryId, wave: categoryIndex < 6 ? 1 : categoryIndex < 12 ? 2 : categoryIndex < 18 ? 3 : 4, brand: "Brand", model: `Model ${categoryIndex}-${index}`, manufacturerModelCode: index ? null : `MPN-${categoryIndex}`, configurationIdentity: index ? null : `Brand|MPN-${categoryIndex}|TR`, sourceId: `${categoryId}:${index}`, sourceUri: "https://example.com/tr/product", sourceKind: index ? "AUTHORIZED_TR_CHANNEL" : "OFFICIAL_TR_MANUFACTURER", observedAt: "2026-09-05T00:00:00.000Z", amazonRelation: "NOT_OBSERVED_ON_AMAZON_TR", disposition: categoryIndex === 0 && index === 0 ? "ADMITTED" : "REJECTED_IDENTITY_INCOMPLETE", reason: "fixture", retailerTechnicalAuthority: "NONE", internationalTrApplicabilityAuthority: "NONE" })));
const candidate: TurkeySecondPassCandidate = { exactProductId: "electronics:test:1", categoryId: "SMARTPHONE", wave: 1, brand: "Brand", model: "Model 0-0", manufacturerModelCode: "MPN-0", configurationIdentity: "Brand|MPN-0|TR", trApplicabilitySourceId: "SMARTPHONE:0", amazonRelation: "NOT_OBSERVED_ON_AMAZON_TR", lifecycle: "GOVERNED_CATALOG_CANDIDATE", amazonPriorityEffect: "NONE", decisionAuthority: "NONE" };

describe("Electronics Türkiye second-pass contract", () => {
  it("requires all-category multi-candidate investigation and accepts exact independent candidates", () => expect(validateTurkeySecondPass({ categoryIds: ELECTRONICS_CATEGORY_IDS, investigations, candidates: [candidate], amazonExactIds: [], amazonConfigurations: [] })).toEqual([]));
  it("rejects collisions with the Amazon-first pass", () => expect(validateTurkeySecondPass({ categoryIds: ELECTRONICS_CATEGORY_IDS, investigations, candidates: [candidate], amazonExactIds: [candidate.exactProductId], amazonConfigurations: [] })).toContain("AMAZON_PASS_DUPLICATION"));
  it("keeps Amazon relation and volatile commerce outside the identity set", () => { const base = decisionNeutralIdentitySet([candidate]); expect(decisionNeutralIdentitySet([{ ...candidate, amazonRelation: "OBSERVED_UNAVAILABLE" }])).toEqual(base); });
  it("rejects retailer and international authority leakage", () => expect(validateTurkeySecondPass({ categoryIds: ELECTRONICS_CATEGORY_IDS, investigations: investigations.map((row, index) => index ? row : { ...row, retailerTechnicalAuthority: "RETAILER" as never }), candidates: [candidate], amazonExactIds: [], amazonConfigurations: [] })).toContain("SOURCE_AUTHORITY_LEAKAGE"));
  it("materializes a complete, reconciled, decision-neutral evidence bundle", () => {
    const root = path.join(process.cwd(), "data/research/electronics/turkey-non-amazon-catalog-01");
    const artifact = JSON.parse(readFileSync(path.join(root, "turkey-second-pass.json"), "utf8"));
    const reconciliation = JSON.parse(readFileSync(path.join(root, "cross-pass-reconciliation.json"), "utf8"));
    const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));

    expect(artifact.coverage).toHaveLength(24);
    expect(artifact.queryRuns).toHaveLength(48);
    expect(artifact.investigations).toHaveLength(48);
    expect(artifact.candidates).toHaveLength(10);
    expect(artifact.rejectionLedger).toHaveLength(38);
    for (const categoryId of ELECTRONICS_CATEGORY_IDS) {
      expect(artifact.investigations.filter((row: { categoryId: string }) => row.categoryId === categoryId)).toHaveLength(2);
    }
    expect(reconciliation.amazonFirstDigest).toBe("sha256:09ef0e34db66fa00f9fb3b98f83db0370f1e0a2905da805c50282073576e3a20");
    expect(reconciliation.amazonFirstExactIds).toHaveLength(6);
    expect(reconciliation.secondPassExactIds).toHaveLength(10);
    expect(reconciliation.combinedExactIds).toHaveLength(16);
    expect(reconciliation.duplicateExactIds).toEqual([]);
    expect(reconciliation.duplicateConfigurations).toEqual([]);
    expect(reconciliation.amazonRelationHasPriorityEffect).toBe(false);
    expect(manifest.activation).toEqual({ permitted: false, productionAuthority: false });
  });
});
