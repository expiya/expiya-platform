import { randomBytes, randomUUID } from "node:crypto";
import { createHmacOfferSigner } from "../v2/offer/signer.server";
import type { PersistedGovernedOffer } from "../v2/offer/types";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import { RECOMMENDATION_TERMS_VERSION, type RecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";

const signer = createHmacOfferSigner({ secret: process.env.CARS_DECISION_V2_SIGNING_SECRET || process.env.CARS_PILOT_SESSION_SECRET || randomBytes(32).toString("hex"), now: () => new Date() });
const offers = new Map<string, PersistedGovernedOffer>();
const OFFER_CREATED_TTL_MS = 15 * 60_000;
const OFFER_REVEALED_TTL_MS = 25 * 60 * 60_000;
const isProduction = () => process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
const redisConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : undefined;
};

async function redisCommand(command: readonly string[]): Promise<unknown> {
  const redis = redisConfig();
  if (!redis) {
    if (isProduction()) throw new TypeError("V31_OFFER_STORE_UNAVAILABLE");
    return undefined;
  }
  try {
    const response = await fetch(redis.url, { method: "POST", headers: { Authorization: `Bearer ${redis.token}`, "Content-Type": "application/json" }, body: JSON.stringify(command), cache: "no-store", signal: AbortSignal.timeout(2_000) });
    if (!response.ok) throw new Error("OFFER_STORE_RESPONSE");
    return (await response.json() as { result?: unknown }).result;
  } catch {
    throw new TypeError("V31_OFFER_STORE_UNAVAILABLE");
  }
}

const offerKey = (offerId: string) => `cars:v31:offer:${offerId}`;
async function persistOffer(offer: PersistedGovernedOffer, ttlMs: number): Promise<void> {
  offers.set(offer.offerId, offer);
  if (redisConfig() || isProduction()) await redisCommand(["SET", offerKey(offer.offerId), JSON.stringify(offer), "PX", String(ttlMs)]);
}

async function loadOffer(offerId: string): Promise<PersistedGovernedOffer | undefined> {
  const local = offers.get(offerId);
  if (local) return local;
  if (!redisConfig() && !isProduction()) return undefined;
  const raw = await redisCommand(["GET", offerKey(offerId)]);
  if (typeof raw !== "string") return undefined;
  const offer = JSON.parse(raw) as Partial<PersistedGovernedOffer>;
  if (offer.offerId !== offerId || typeof offer.conversationId !== "string" || !Array.isArray(offer.candidateRefs) || !offer.candidateRefs.length || !["CREATED", "REVEALED"].includes(String(offer.lifecycleState))) throw new TypeError("V31_OFFER_STORE_INVALID");
  const validated = offer as PersistedGovernedOffer;
  offers.set(offerId, validated);
  return validated;
}

export async function createV31Offer(input: { readonly conversationId: string; readonly variants: readonly CatalogVariantSnapshot[]; readonly catalogReleaseVersion: string; readonly catalogFingerprint: string; readonly decisionFingerprint: string; readonly limit: 1 | 3 }) {
  const createdAt = new Date(); const offerId = randomUUID();
  const refs = input.variants.slice(0, input.limit).map((variant, index) => ({ exactVariantId: variant.id, modelFamilyId: `${variant.brand}:${variant.model}`.toLocaleLowerCase("tr"), finalDisposition: "TECHNICALLY_ELIGIBLE_PRICE_NOT_REQUESTED" as const, rankingOrdinal: index + 1, caveatFactIds: [] as readonly string[], priceRealizationPermission: "NOT_PERMITTED" as const }));
  if (!refs.length) throw new TypeError("V31_OFFER_EMPTY");
  const offer: PersistedGovernedOffer = { offerId, conversationId: input.conversationId, candidateRefs: refs as unknown as PersistedGovernedOffer["candidateRefs"], mode: input.limit === 1 ? "SINGLE_REQUESTED" : "FAMILY_DIVERSE", catalogReleaseVersion: input.catalogReleaseVersion, catalogFingerprint: input.catalogFingerprint, decisionFingerprint: input.decisionFingerprint, lifecycleState: "CREATED", createdAt: createdAt.toISOString(), expiresAt: new Date(createdAt.getTime() + 10 * 60_000).toISOString(), authorizationVersion: "1.0.0", nonce: randomBytes(16).toString("hex") };
  await persistOffer(offer, OFFER_CREATED_TTL_MS); return { offer, token: signer.sign(offer) };
}

export async function revealV31Offer(input: { readonly conversationId: string; readonly token: string; readonly candidateIds: readonly string[]; readonly recommendationTermsAcceptance?: RecommendationTermsAcceptance }) {
  const verified = signer.verify(input.token); if (verified.status !== "VALID" || verified.conversationId !== input.conversationId) throw new TypeError("V31_OFFER_UNAUTHORIZED");
  const offer = await loadOffer(verified.offerId); if (!offer || offer.lifecycleState !== "CREATED" || offer.candidateRefs.map((item) => item.exactVariantId).join("|") !== input.candidateIds.join("|")) throw new TypeError("V31_OFFER_BINDING_INVALID");
  const acceptance = input.recommendationTermsAcceptance;
  const acceptedAt = acceptance ? Date.parse(acceptance.acceptedAt) : Number.NaN;
  const now = Date.now();
  if (!acceptance || acceptance.version !== RECOMMENDATION_TERMS_VERSION || !Number.isFinite(acceptedAt) || acceptedAt < Date.parse(offer.createdAt) || acceptedAt > now + 60_000) throw new TypeError("V3_RECOMMENDATION_TERMS_REQUIRED");
  const consentedAt = new Date(acceptedAt); const revealedAt = new Date(Math.max(now, acceptedAt + 1));
  await persistOffer({ ...offer, lifecycleState: "REVEALED", consentedAt: consentedAt.toISOString(), revealedAt: revealedAt.toISOString() }, OFFER_REVEALED_TTL_MS);
  return offer;
}

/** Read-only, decision-neutral integration seam for a post-reveal experience. */
export async function getRevealedV31Offer(offerId: string): Promise<PersistedGovernedOffer | undefined> {
  const offer = await loadOffer(offerId);
  return offer?.lifecycleState === "REVEALED" ? offer : undefined;
}

export function resetV31OffersForTests() { offers.clear(); }
