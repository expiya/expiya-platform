import { describe, expect, it } from "vitest";
import { APPLIANCES_PRODUCT_TYPES, type AppliancesProductType } from "../contracts";
import type { AppliancesDecisionCard } from "../recommendation/publicCard";
import { APPLIANCES_STAGE_TWO_CONTENT } from "./categoryContent";
import { buildAppliancesStageTwoProjection } from "./projection";
import { answerAppliancesAdvisor } from "./advisor";

function card(id: string, value: string | null = "60"): AppliancesDecisionCard {
  return {
    schemaVersion: "appliances-public-card/v1", identity: { productId: id, brand: "Örnek Marka", model: `Model ${id}`, configurationIdentity: "EXACT|TR" }, reasons: ["Yetkili tek exact karar."],
    acceptedNeeds: [], nonSelectionNeeds: [], technicalEvidence: value === null ? [] : [{ evidenceRef: "SRC-1", statement: `widthMm: ${value}`, evidence: { sourceAuthority: "MANUFACTURER", canonicalReference: "https://example.com/product" } }], capabilities: [], dailyLife: value === null ? [] : [{ semanticRef: "SEM-1", statement: "Yerleşim ölçüsü kurulum alanıyla birlikte değerlendirilir." }], limitations: ["Sonuç garantisi değildir."], disclosures: [], price: { status: "UNAVAILABLE", products: [], observations: [], budgetUnknownAlternatives: [], snapshot: { expiresAt: "unknown" } }, lifecycleAndMarket: { market: "TR", status: "CURRENT_TR" }, warranty: [],
    provenance: { authorizationFingerprint: "auth", artifactFingerprint: "artifact", catalog: { release: "release", digest: "digest" }, semantic: { id: "semantic", digest: "semantic-digest" }, selectionFingerprint: "selection", constructionPolicyDigest: "construction", questionPolicy: { id: "q", digest: "q-digest" }, sufficiencyPolicy: { id: "s", digest: "s-digest" }, selectionPolicy: { id: "p", digest: "p-digest" }, contextRevision: 2, contextFingerprint: "context", candidateEvaluationFingerprint: "candidate", sufficiencyFingerprint: "sufficiency", candidatePoolFingerprint: "pool" },
  } as unknown as AppliancesDecisionCard;
}

describe("Appliances AŞAMA 2 contract matrix", () => {
  it("owns content and a bounded single-decision projection for all 24 categories", () => {
    expect(APPLIANCES_PRODUCT_TYPES).toHaveLength(24);
    for (const type of APPLIANCES_PRODUCT_TYPES) {
      expect(APPLIANCES_STAGE_TWO_CONTENT[type].chartDimensions).toHaveLength(3);
      const result = buildAppliancesStageTwoProjection({ productType: type, selectedCard: card(type), entitlement: { status: "NOT_PURCHASED" } });
      expect(result).toMatchObject({ productType: type, authorizedExactProductIds: [type], manualKnowledge: { status: "NOT_AVAILABLE", entries: [] }, comparison: { access: "LOCKED", products: [], rows: [] }, comparisonOffer: { action: "EXPLAIN_ACCESS" }, boundaries: { canChangeContext: false, canRerunDecision: false, canAddProducts: false, recommendationAuthority: false, commerceIsTechnicalTruth: false } });
      expect(JSON.stringify(result)).not.toMatch(/authorizationFingerprint|artifactFingerprint|sha256|debug/iu);
    }
  });

  it.each<AppliancesProductType>(["WASHING_MACHINE", "DRYER", "REFRIGERATOR", "DISHWASHER", "VACUUM", "ROBOT_VACUUM", "BUILT_IN_OVEN", "AIR_PURIFIER", "SPLIT_AIR_CONDITIONER"])("keeps representative %s projections human-readable with owned fallback media and missing price", type => {
    const result = buildAppliancesStageTwoProjection({ productType: type, selectedCard: card(type), entitlement: { status: "NOT_PURCHASED" } });
    expect(result.selected.media).toMatchObject({ src: "/appliances/representative/owned-category-catalog.svg", disclosure: expect.stringContaining("birebir fotoğrafı değildir") }); expect(result.selected.price.display).toBe("Bilinmiyor"); expect(result.selected.facts[0]).toMatchObject({ label: "Genişlik", value: "60 mm" });
  });

  it("includes only an entitled exact set and renders neutral unknown cells without scores", () => {
    const selected = card("A"), other = card("B", null), unauthorized = card("C", "90");
    const result = buildAppliancesStageTwoProjection({ productType: "WASHING_MACHINE", selectedCard: selected, authorizedComparisonCards: [other, unauthorized], entitlement: { status: "PURCHASED", entitlementId: "ent-1", authorizedExactProductIds: ["A", "B"] } });
    expect(result.comparison.products.map(item => item.id)).toEqual(["A", "B"]); expect(result.comparison.rows[0].values[1].value).toBe("Bilinmiyor"); expect(Object.keys(result.comparison)).toEqual(["access", "products", "rows"]);
  });

  it("keeps the advisor inside the read projection", () => {
    const unpaid = buildAppliancesStageTwoProjection({ productType: "WASHING_MACHINE", selectedCard: card("A"), entitlement: { status: "NOT_PURCHASED" } });
    expect(answerAppliancesAdvisor(unpaid, "başka ürün öner").status).toBe("REFUSED");
    expect(answerAppliancesAdvisor(unpaid, "Bununla başka modeli karşılaştır").status).toBe("REFUSED");
    expect(answerAppliancesAdvisor(unpaid, "genişliği nedir?")).toMatchObject({ status: "ANSWERED", message: expect.stringContaining("60 mm") });
    expect(answerAppliancesAdvisor(unpaid, "motor ömrü nedir?").status).toBe("UNKNOWN");
  });

  it("uses product-bound manual knowledge only for explanation and treats absence honestly", () => {
    const manualKnowledge = { status: "AVAILABLE" as const, entries: [{ topic: "Bakım ve temizlik", statement: "Filtre, kılavuzdaki bakım adımlarına göre temizlenmelidir.", sourceLabel: "Üretici kullanım kılavuzu", pageNumber: 4, sectionLabel: "filtre", professionalInstallationRequired: false }] };
    const withManual = buildAppliancesStageTwoProjection({ productType: "DRYER", selectedCard: card("A"), entitlement: { status: "NOT_PURCHASED" }, manualKnowledge });
    const withoutManual = buildAppliancesStageTwoProjection({ productType: "DRYER", selectedCard: card("A"), entitlement: { status: "NOT_PURCHASED" } });
    expect(answerAppliancesAdvisor(withManual, "Bakımı nasıl yapılır?")).toMatchObject({ status: "ANSWERED", message: expect.stringContaining("Üretici kullanım kılavuzu") });
    expect(answerAppliancesAdvisor(withoutManual, "Bakımı nasıl yapılır?")).toMatchObject({ status: "UNKNOWN", message: expect.stringContaining("henüz bulunmuyor") });
    expect(withManual.selected).toEqual(withoutManual.selected);
    expect(withManual.comparison).toEqual(withoutManual.comparison);
    expect(withManual.boundaries).toEqual(withoutManual.boundaries);
  });
});
