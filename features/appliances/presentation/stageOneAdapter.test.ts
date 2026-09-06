import { describe, expect, it } from "vitest";
import { APPLIANCES_STAGE_ONE_PRESENTATION } from "./stageOneAdapter";
import type { AppliancesDecisionCard } from "../recommendation/publicCard";

function card(conceptId: string): AppliancesDecisionCard {
  return { schemaVersion: "appliances-public-card/v1", identity: { productId: "BOSCH_BGC41PET_TR", brand: "Bosch", model: "BGC41PET", configurationIdentity: "Bosch|BGC41PET|TR", market: "TR" }, reasons: ["Doğrulanmış ölçüte uyan tek aday."], acceptedNeeds: [{ eventId: "private-event", conceptId, value: true, decisionUse: "HARD" }], nonSelectionNeeds: [], technicalEvidence: [{ productId: "BOSCH_BGC41PET_TR", evidenceRef: "private-ref", statement: "Çalışma yarıçapı: 10 m", evidence: { sourceAuthority: "PRIMARY" } }], capabilities: [{ productId: "BOSCH_BGC41PET_TR", evidenceRef: "private-cap", statement: "PET_HEAD: mevcut", evidence: { capabilityId: "PET_HEAD" } }], dailyLife: [{ productId: "BOSCH_BGC41PET_TR", semanticRef: "private-semantic", evidenceRefs: ["private-ref"], statement: "Priz değiştirmeden erişilebilecek alan için bir sınır verir; ev planına göre değişir." }], limitations: ["Sonuç garantisi değildir."], disclosures: [], price: { status: "UNAVAILABLE", snapshot: null, products: [], observations: [], budgetUnknownAlternatives: [] }, lifecycleAndMarket: [], warranty: [], provenance: { authorizationFingerprint: "auth", artifactFingerprint: "artifact", catalog: {}, semantic: {}, selectionFingerprint: "selection", constructionPolicyDigest: "construction", questionPolicy: {}, sufficiencyPolicy: {}, selectionPolicy: {}, contextRevision: 1, contextFingerprint: "context", candidateEvaluationFingerprint: "candidate", sufficiencyFingerprint: "sufficiency", candidatePoolFingerprint: "pool" } };
}

describe("universal appliance stage-one presentation", () => {
  it.each(["CAPACITY", "FIT", "AUTO_OPEN_DRY", "PET_HEAD", "AUTO_EMPTY", "LOW_NOISE"])("humanizes %s without leaking code-shaped values", (conceptId) => {
    const presented = APPLIANCES_STAGE_ONE_PRESENTATION.project(card(conceptId)); const publicText = JSON.stringify({ ...presented, audit: undefined });
    expect(publicText).not.toContain(conceptId); expect(publicText).not.toContain("private-ref"); expect(publicText).not.toContain(":true");
    expect(presented.media.status).toBe("REPRESENTATIVE"); expect(presented.media.src).toBe("/appliances/representative/owned-category-catalog.svg"); expect(presented.technicalFacts[0].explanation).toContain("ev planına göre değişir");
  });
});
