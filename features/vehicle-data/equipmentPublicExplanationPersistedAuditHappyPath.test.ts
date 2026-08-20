import { describe, expect, it } from "vitest";
import { InMemoryRecommendationOfferAuditStore } from "@/features/decision/v2/offer/recOfferAuditFoundation.server";
import type { PersistedGovernedOffer } from "@/features/decision/v2/offer/types";
import { adaptVerifiedRecommendationOfferAudit } from "./equipmentRecommendationOfferAuditAdapter.server";
import { EQUIPMENT_EXPLANATION_ACTIONS, explainEquipment, inactiveEquipmentIntegrationPolicy, type EquipmentIntegrationPolicy } from "./equipmentPublicExplanationFacade.server";

const bydAction = "EPEA_EXPLAIN_BYD_DOLPHIN_COMFORT_MY2025"; const nissanAction = "EPEA_EXPLAIN_NISSAN_QASHQAI_PLATINUM_PREMIUM_EPOWER_MY2026";
const byd = EQUIPMENT_EXPLANATION_ACTIONS[bydAction]; const nissan = EQUIPMENT_EXPLANATION_ACTIONS[nissanAction]; const catalogFingerprint = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const policy = { ...inactiveEquipmentIntegrationPolicy, state: "ACTIVE", publicEffect: "ENABLED" } as EquipmentIntegrationPolicy;

describe("persisted REC audit to Equipment facade happy path", () => {
  it.each([[bydAction, byd, 2025], [nissanAction, nissan, 2026]] as const)("uses a resolved durable audit proof for %s", async (actionId, exactVariantId, modelYear) => {
    const offer: PersistedGovernedOffer = { offerId: "offer-real-audit", conversationId: "conversation-real-audit", candidateRefs: [{ exactVariantId, modelFamilyId: `family-${exactVariantId}`, rankingOrdinal: 1, finalDisposition: "FULLY_ELIGIBLE_VERIFIED_PRICE", caveatFactIds: [], priceRealizationPermission: "EXACT_PUBLIC_PRICE_ALLOWED" }], mode: "FAMILY_DIVERSE", catalogReleaseVersion: "0.55.4", catalogFingerprint, decisionFingerprint: `sha256:${"d".repeat(64)}`, lifecycleState: "CREATED", createdAt: "2026-08-20T10:00:00.000Z", expiresAt: "2026-08-20T11:00:00.000Z", authorizationVersion: "1.0.0", nonce: "nonce-real-audit" };
    const instants = [new Date("2026-08-20T10:01:00.000Z"), new Date("2026-08-20T10:01:00.001Z")]; const store = new InMemoryRecommendationOfferAuditStore(() => instants.shift()!, [offer]);
    await store.recordRecommendationTermsAcceptance({ conversationId: offer.conversationId, offerId: offer.offerId, sourceMessageId: "accept", idempotencyKey: "accept", recommendationTermsVersion: "REC-2026.08-v1.1", expectedRevision: 0 }); await store.revealAcceptedOffer({ conversationId: offer.conversationId, offerId: offer.offerId, sourceMessageId: "reveal", idempotencyKey: "reveal", expectedRevision: 1 });
    const proof = await store.resolveRecommendationOfferAuditProof(offer.conversationId, offer.offerId, catalogFingerprint); const audit = adaptVerifiedRecommendationOfferAudit(proof); expect(audit).not.toBeNull();
    const authorization = { ...audit!, conversationId: offer.conversationId, offerConsentCompleted: true, offer: { offerId: offer.offerId, conversationId: offer.conversationId, lifecycleState: "REVEALED" as const, catalogFingerprint, candidateRefs: [{ exactVariantId }], expiresAt: offer.expiresAt, revealAt: audit!.revealAt, revealSequence: audit!.revealSequence }, revealedCardExactVariantIds: [exactVariantId], catalogFingerprint, now: "2026-08-20T10:02:00.000Z", publicContext: { market: "Türkiye" as const, modelYear, source: "REVEALED_CARD" as const } };
    const result = explainEquipment({ policy, actionId, authorization, session: { conversationId: offer.conversationId, exactVariantId, offerId: offer.offerId, preference: "ACCEPTED", noticeShown: false } }); expect(result.ok).toBe(true); expect(JSON.stringify(result)).not.toMatch(/acceptanceEventId|acceptedAt|auditSequence|evidence/iu);
  });
});
