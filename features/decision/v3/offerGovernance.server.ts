import { randomBytes, randomUUID } from "node:crypto";
import { createHmacOfferSigner } from "../v2/offer/signer.server";
import type { PersistedGovernedOffer } from "../v2/offer/types";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";

const signer = createHmacOfferSigner({ secret: process.env.CARS_DECISION_V2_SIGNING_SECRET || process.env.CARS_PILOT_SESSION_SECRET || randomBytes(32).toString("hex"), now: () => new Date() });
const offers = new Map<string, PersistedGovernedOffer>();

export function createV31Offer(input: { readonly conversationId: string; readonly variants: readonly CatalogVariantSnapshot[]; readonly catalogReleaseVersion: string; readonly catalogFingerprint: string; readonly decisionFingerprint: string; readonly limit: 1 | 3 }) {
  const createdAt = new Date(); const offerId = randomUUID();
  const refs = input.variants.slice(0, input.limit).map((variant, index) => ({ exactVariantId: variant.id, modelFamilyId: `${variant.brand}:${variant.model}`.toLocaleLowerCase("tr"), finalDisposition: "TECHNICALLY_ELIGIBLE_PRICE_NOT_REQUESTED" as const, rankingOrdinal: index + 1, caveatFactIds: [] as readonly string[], priceRealizationPermission: "NOT_PERMITTED" as const }));
  if (!refs.length) throw new TypeError("V31_OFFER_EMPTY");
  const offer: PersistedGovernedOffer = { offerId, conversationId: input.conversationId, candidateRefs: refs as unknown as PersistedGovernedOffer["candidateRefs"], mode: input.limit === 1 ? "SINGLE_REQUESTED" : "FAMILY_DIVERSE", catalogReleaseVersion: input.catalogReleaseVersion, catalogFingerprint: input.catalogFingerprint, decisionFingerprint: input.decisionFingerprint, lifecycleState: "CREATED", createdAt: createdAt.toISOString(), expiresAt: new Date(createdAt.getTime() + 10 * 60_000).toISOString(), authorizationVersion: "1.0.0", nonce: randomBytes(16).toString("hex") };
  offers.set(offerId, offer); return { offer, token: signer.sign(offer) };
}

export function revealV31Offer(input: { readonly conversationId: string; readonly token: string; readonly candidateIds: readonly string[] }) {
  const verified = signer.verify(input.token); if (verified.status !== "VALID" || verified.conversationId !== input.conversationId) throw new TypeError("V31_OFFER_UNAUTHORIZED");
  const offer = offers.get(verified.offerId); if (!offer || offer.lifecycleState !== "CREATED" || offer.candidateRefs.map((item) => item.exactVariantId).join("|") !== input.candidateIds.join("|")) throw new TypeError("V31_OFFER_BINDING_INVALID");
  const consentedAt = new Date(); const revealedAt = new Date(consentedAt.getTime() + 1);
  offers.set(offer.offerId, { ...offer, lifecycleState: "REVEALED", consentedAt: consentedAt.toISOString(), revealedAt: revealedAt.toISOString() });
  return offer;
}

export function resetV31OffersForTests() { offers.clear(); }
