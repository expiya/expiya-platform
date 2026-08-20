import type { PostgresV2ConversationStore } from "@/features/decision/v2/persistence/postgresStore.server";
import type { OfferSigner } from "@/features/decision/v2/offer/types";
import { adaptVerifiedRecommendationOfferAudit } from "./equipmentRecommendationOfferAuditAdapter.server";

export async function resolveEquipmentAuditAuthorization(input: { readonly store: Pick<PostgresV2ConversationStore, "get" | "resolveRecommendationOfferAuditProof">; readonly signer: OfferSigner; readonly conversationId: string; readonly offerToken: string; readonly expectedCatalogFingerprint: string }) {
  const verified = input.signer.verify(input.offerToken); if (verified.status !== "VALID" || verified.conversationId !== input.conversationId || verified.catalogFingerprint !== input.expectedCatalogFingerprint) return null;
  const offer = await input.store.get(verified.offerId); if (!offer || offer.lifecycleState !== "REVEALED" || offer.conversationId !== input.conversationId) return null;
  const proof = await input.store.resolveRecommendationOfferAuditProof(input.conversationId, offer.offerId, input.expectedCatalogFingerprint); const audit = adaptVerifiedRecommendationOfferAudit(proof); if (!audit) return null;
  return Object.freeze({ audit, offer, revealedCardExactVariantIds: Object.freeze(offer.candidateRefs.map((candidate) => candidate.exactVariantId)) });
}
