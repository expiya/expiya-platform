import { describe, expect, it } from "vitest";
import { createEquipmentExplanationCtas, EQUIPMENT_EXPLANATION_ACTIONS, explainEquipment, inactiveEquipmentIntegrationPolicy, reduceEquipmentExplanationPreference, type EquipmentIntegrationPolicy } from "./equipmentPublicExplanationFacade.server";

const bydAction = "EPEA_EXPLAIN_BYD_DOLPHIN_COMFORT_MY2025";
const byd = EQUIPMENT_EXPLANATION_ACTIONS[bydAction];
const nissanAction = "EPEA_EXPLAIN_NISSAN_QASHQAI_PLATINUM_PREMIUM_EPOWER_MY2026";
const enabled = Object.freeze({ ...inactiveEquipmentIntegrationPolicy, state: "ACTIVE", publicEffect: "ENABLED" }) as EquipmentIntegrationPolicy;
const authorization = (exactVariantId: string = byd) => ({ conversationId: "conv-1", recommendationTermsAccepted: true, recommendationTermsVersion: "REC-2026.08-v1.1", recommendationTermsAcceptanceEventId: "evt-1",
  recommendationTermsAcceptedAt: "2026-08-20T10:00:00.000Z", recommendationTermsAcceptanceConversationId: "conv-1", recommendationTermsAcceptanceOfferId: "offer-1", recommendationTermsAcceptanceSequence: 4,
  offerConsentCompleted: true, offer: { offerId: "offer-1", conversationId: "conv-1", lifecycleState: "REVEALED" as const, catalogFingerprint: "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9",
    candidateRefs: [{ exactVariantId }], expiresAt: "2026-08-21T10:00:00.000Z", revealAt: "2026-08-20T10:00:01.000Z", revealSequence: 5 },
  revealedCardExactVariantIds: [exactVariantId], catalogFingerprint: "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9", now: "2026-08-20T11:00:00.000Z",
  publicContext: { market: "Türkiye" as const, modelYear: exactVariantId === byd ? 2025 : 2026, source: "REVEALED_CARD" as const } });
const session = (exactVariantId: string = byd) => ({ conversationId: "conv-1", exactVariantId, offerId: "offer-1", preference: "ACCEPTED" as const, noticeShown: false });

describe("bounded public Equipment explanation facade", () => {
  it("is disabled without a governed active integration pointer", () => {
    expect(createEquipmentExplanationCtas({ policy: inactiveEquipmentIntegrationPolicy, conversationId: "conv-1", offerId: "offer-1", lifecycleState: "REVEALED", revealedExactVariantIds: [byd] })).toEqual([]);
    expect(explainEquipment({ policy: inactiveEquipmentIntegrationPolicy, actionId: bydAction, authorization: authorization(), session: session() }).ok).toBe(false);
  });
  it.each([[bydAction, byd], [nissanAction, EQUIPMENT_EXPLANATION_ACTIONS[nissanAction]]])("authorizes bounded controlled units for %s", (actionId, exactVariantId) => {
    const result = explainEquipment({ policy: enabled, actionId, authorization: authorization(exactVariantId), session: session(exactVariantId) });
    expect(result.ok).toBe(true); expect(result.items.length).toBeGreaterThanOrEqual(3); expect(result.items.length).toBeLessThanOrEqual(5); expect(result.notice).toContain("Türkiye pazarı");
    expect(JSON.stringify(result)).not.toMatch(/assertion|evidence|recommendationTerms|reasonCode|sequence|acceptedAt/);
  });
  it("shows notice once and re-shows for a different exact vehicle session", () => {
    const first = explainEquipment({ policy: enabled, actionId: bydAction, authorization: authorization(), session: session() });
    const second = explainEquipment({ policy: enabled, actionId: bydAction, authorization: authorization(), session: first.nextSession });
    const other = explainEquipment({ policy: enabled, actionId: nissanAction, authorization: authorization(EQUIPMENT_EXPLANATION_ACTIONS[nissanAction]), session: session(EQUIPMENT_EXPLANATION_ACTIONS[nissanAction]) });
    expect(first.notice).not.toBeNull(); expect(second.notice).toBeNull(); expect(other.notice).not.toBeNull();
  });
  it("uses controlled vocabulary, rejects provider allowlist expansion and clarifies jargon", () => {
    const positive = explainEquipment({ policy: enabled, actionId: bydAction, authorization: authorization(), session: session(), userQuestion: "Bunda adaptif hız sabitleyici var mı?", preferredFeatureCode: "LOCKING_REAR_DIFFERENTIAL" });
    const jargon = explainEquipment({ policy: enabled, actionId: bydAction, authorization: authorization(), session: session(), userQuestion: "Hayalet ekran var mı?" });
    expect(positive.ok).toBe(true); expect(positive.items[0]?.featureCode).toBe("ADAPTIVE_CRUISE_CONTROL"); expect(jargon.message).toContain("dijital gösterge panelini");
  });
  it("fails closed for equal sequencing/timestamps, forged action and binding/checksum mismatches", () => {
    const equalSequence = { ...authorization(), recommendationTermsAcceptanceSequence: 5 };
    const equalTime = { ...authorization(), recommendationTermsAcceptedAt: "2026-08-20T10:00:01.000Z" };
    expect(explainEquipment({ policy: enabled, actionId: bydAction, authorization: equalSequence, session: session() }).ok).toBe(false);
    expect(explainEquipment({ policy: enabled, actionId: bydAction, authorization: equalTime, session: session() }).ok).toBe(false);
    expect(explainEquipment({ policy: enabled, actionId: "FORGED", authorization: authorization(), session: session() }).ok).toBe(false);
    expect(explainEquipment({ policy: { ...enabled, productionCompositeChecksum: "sha256:bad" }, actionId: bydAction, authorization: authorization(), session: session() }).ok).toBe(false);
  });
  it("isolates preference by conversation + exact variant + offer and remains decision-neutral", () => {
    const before = JSON.stringify({ eligibleCandidates: ["a", "b"], rankedOrder: ["b", "a"], readiness: "READY", materialQuestion: null, revealedCardIds: [byd] });
    const original = { ...session(), preference: "UNSET" as const };
    expect(reduceEquipmentExplanationPreference(original, { conversationId: "other", exactVariantId: byd, offerId: "offer-1", preference: "DECLINED" })).toBe(original);
    explainEquipment({ policy: enabled, actionId: bydAction, authorization: authorization(), session: session() });
    expect(JSON.stringify({ eligibleCandidates: ["a", "b"], rankedOrder: ["b", "a"], readiness: "READY", materialQuestion: null, revealedCardIds: [byd] })).toBe(before);
  });
});
