import { describe, expect, it } from "vitest";
import { APPLIANCES_PRODUCT_TYPES, type AppliancesProductType } from "../contracts";
import type { AppliancesDecisionCard } from "../recommendation/publicCard";
import { APPLIANCES_XPY_STAGE_TWO_ADAPTER, APPLIANCES_STAGE_TWO_READINESS, answerAppliancesXpyStageTwo, projectAppliancesXpyStageTwo, toXpyAppliancesEntitlement, type AppliancesStageTwoOpened } from "./xpyStageTwoAdapter.server";

const NOW = Math.floor(Date.now() / 1000);
function card(id: string): AppliancesDecisionCard {
  return { schemaVersion: "appliances-public-card/v1", identity: { productId: id, brand: "Örnek", model: id, configurationIdentity: `${id}|TR` }, reasons: ["Yetkili exact karar"], acceptedNeeds: [], nonSelectionNeeds: [], technicalEvidence: [{ evidenceRef: "SRC", statement: "widthMm: 60", evidence: { sourceAuthority: "MANUFACTURER", canonicalReference: "https://example.com" } }], capabilities: [], dailyLife: [{ semanticRef: "SEM", statement: "Yerleşim ölçüsü kurulum alanıyla birlikte değerlendirilir." }], limitations: ["Sonuç garantisi değildir."], disclosures: [], price: { status: "UNAVAILABLE", products: [], observations: [], budgetUnknownAlternatives: [], snapshot: { expiresAt: "unknown" } }, lifecycleAndMarket: { market: "TR", status: "CURRENT_TR" }, warranty: [], provenance: { authorizationFingerprint: "auth", artifactFingerprint: "artifact", catalog: { release: "release", digest: "digest" }, semantic: { id: "semantic", digest: "semantic-digest" }, selectionFingerprint: "selection", constructionPolicyDigest: "construction", questionPolicy: { id: "q", digest: "q-digest" }, sufficiencyPolicy: { id: "s", digest: "s-digest" }, selectionPolicy: { id: "p", digest: "p-digest" }, contextRevision: 2, contextFingerprint: "context", candidateEvaluationFingerprint: "candidate", sufficiencyFingerprint: "sufficiency", candidatePoolFingerprint: "pool" } } as unknown as AppliancesDecisionCard;
}

function opened(productType: AppliancesProductType = "WASHING_MACHINE", id = "exact-a"): AppliancesStageTwoOpened {
  return { claims: { version: "appliances-stage2-handoff/v2", kid: "k1", purpose: "ASAMA2_VIEW", departmentId: "APPLIANCES", category: productType, conversationId: "11111111-1111-4111-8111-111111111111", revision: 4, catalogRelease: "release", catalogDigest: "digest", semanticAuthorityVersion: "semantic", semanticAuthorityDigest: "semantic-digest", exactProductId: id, configurationIdentity: `${id}|TR`, decisionFingerprint: "decision", issuedAt: NOW - 30, expiresAt: NOW + 870, nonce: "1234567890123456", replayPolicy: "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY" }, productType, revision: 4, catalogRelease: "release", selectedCard: card(id), comparisonEntitlement: { status: "NOT_PURCHASED" }, manualKnowledge: { status: "NOT_AVAILABLE", entries: [] } };
}

describe("Appliances shared Stage 2 adapter", () => {
  it("registers one adapter family and an authority-complete readiness row for all 24 categories", () => {
    expect(APPLIANCES_XPY_STAGE_TWO_ADAPTER.categories).toEqual(APPLIANCES_PRODUCT_TYPES);
    expect(APPLIANCES_STAGE_TWO_READINESS).toHaveLength(24);
    expect(APPLIANCES_STAGE_TWO_READINESS.every(item => item.readiness === "AUTHORIZED_EXISTING_RUNTIME" && item.failClosedReason === null)).toBe(true);
    for (const productType of APPLIANCES_PRODUCT_TYPES) expect(projectAppliancesXpyStageTwo(opened(productType), { status: "NOT_PURCHASED" }).authority.categoryId).toBe(productType);
  });

  it.each<AppliancesProductType>(["WASHING_MACHINE", "REFRIGERATOR", "DRYER", "ROBOT_VACUUM", "FILTER_COFFEE_MACHINE", "SPLIT_AIR_CONDITIONER"])("projects representative persisted category %s through the shared contract", productType => {
    const projection = projectAppliancesXpyStageTwo(opened(productType), { status: "NOT_PURCHASED" });
    expect(projection).toMatchObject({ schemaVersion: "xpy-stage2-projection/v1", authority: { departmentId: "APPLIANCES", categoryId: productType, exactProductId: "exact-a", configurationIdentity: "exact-a|TR", evidence: { release: "release", fingerprint: "digest" } }, selected: { exactProductId: "exact-a", configurationIdentity: "exact-a|TR" }, comparison: { access: "LOCKED", offerPlacement: "AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR", products: [], rows: [] } });
  });

  it("keeps comparison locked for revoked, expired and not-purchased states", () => {
    for (const status of ["REVOKED", "EXPIRED", "NOT_PURCHASED"] as const) expect(projectAppliancesXpyStageTwo(opened(), { status }).comparison).toEqual({ access: "LOCKED", offerPlacement: "AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR", products: [], rows: [] });
  });

  it("requires the selected exact product in a purchased entitlement", () => {
    expect(() => projectAppliancesXpyStageTwo(opened(), { status: "PURCHASED", entitlementId: "e", authorizedExactProductIds: ["other"], evidenceSetFingerprint: "fp" })).toThrow("APPLIANCES_COMPARISON_ENTITLEMENT_MISMATCH");
    const entitlement = toXpyAppliancesEntitlement({ status: "PURCHASED", entitlementId: "e", authorizedExactProductIds: ["exact-a"] });
    expect(projectAppliancesXpyStageTwo(opened(), entitlement).comparison).toMatchObject({ access: "ENTITLED", products: [{ exactProductId: "exact-a" }] });
  });

  it("fails closed on cross-category, exact identity, revision and evidence mismatch", () => {
    const base = opened();
    expect(() => projectAppliancesXpyStageTwo({ ...base, productType: "DRYER" }, { status: "NOT_PURCHASED" })).toThrow("APPLIANCES_STAGE_TWO_AUTHORITY_MISMATCH");
    expect(() => projectAppliancesXpyStageTwo({ ...base, revision: 5 }, { status: "NOT_PURCHASED" })).toThrow("APPLIANCES_STAGE_TWO_AUTHORITY_MISMATCH");
    expect(() => projectAppliancesXpyStageTwo({ ...base, selectedCard: card("other") }, { status: "NOT_PURCHASED" })).toThrow();
  });

  it("keeps Advisor bounded by the shared guard and existing category evidence", () => {
    const context = opened(); const projection = projectAppliancesXpyStageTwo(context, { status: "NOT_PURCHASED" });
    expect(answerAppliancesXpyStageTwo(context, projection, "başka ürün öner").status).toBe("REFUSED");
    expect(answerAppliancesXpyStageTwo(context, projection, "bunu başka ürünle karşılaştır").status).toBe("REFUSED");
    expect(answerAppliancesXpyStageTwo(context, projection, "genişliği nedir?")).toMatchObject({ status: "ANSWERED", message: expect.stringContaining("60 mm") });
  });
});
