import { normalizeExactModel } from "./authority";
import type { ExactCommerceLookup, ExternalCommerceActionProjection, ProviderNeutralCommerceObservation } from "./providerContracts";

export const AMAZON_ASSOCIATE_DISCLOSURE_TR = "(ücretli bağlantı) Amazon Satış Ortağı olarak uygun alışverişlerden gelir elde ederiz." as const;

function amazonTarget(value: string, asin: string, requiredPartnerTag?: string): boolean {
  try {
    const url = new URL(value);
    const pathAsin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/u)?.[1];
    const tag = url.searchParams.get("tag")?.trim();
    return url.protocol === "https:" && url.hostname === "www.amazon.com.tr" && pathAsin === asin && Boolean(tag)
      && /^[A-Za-z0-9][A-Za-z0-9-]{1,63}$/u.test(tag ?? "")
      && (!requiredPartnerTag || tag === requiredPartnerTag);
  } catch {
    return false;
  }
}

export function exactObservationMatchesLookup(observation: ProviderNeutralCommerceObservation, lookup: ExactCommerceLookup): boolean {
  const evidence = observation.identityEvidence;
  return observation.exactProductId === lookup.exactProductId
    && observation.categoryId === lookup.categoryId
    && observation.providerItemId === lookup.providerItemId
    && evidence.providerItemIdMatched && evidence.categoryIdMatched && evidence.brandMatched
    && lookup.exactModelTokens.length > 0
    && lookup.exactModelTokens.every(token => evidence.matchedModelTokens.some(matched => normalizeExactModel(matched) === normalizeExactModel(token)));
}

/** Presentation-only projection. No ordering, scoring, or authorization input is returned. */
export function projectExternalCommerceAction(
  observation: ProviderNeutralCommerceObservation,
  lookup: ExactCommerceLookup,
  now: Date,
  requiredPartnerTag?: string,
): ExternalCommerceActionProjection | null {
  const retrieved = Date.parse(observation.retrievedAt), expires = Date.parse(observation.expiresAt);
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(retrieved) || !Number.isFinite(expires)
    || expires <= now.getTime() || expires <= retrieved || !["IN_STOCK", "LIMITED"].includes(observation.availability)
    || !exactObservationMatchesLookup(observation, lookup)) return null;
  if (observation.provider !== "AMAZON_CREATORS_API"
    || !/^[A-Z0-9]{10}$/u.test(observation.providerItemId)
    || !amazonTarget(observation.canonicalDetailUrl, observation.providerItemId, requiredPartnerTag)) return null;
  return Object.freeze({
    schemaVersion: "external-commerce-action/v1",
    exactProductId: lookup.exactProductId,
    provider: observation.provider,
    label: "Amazon’da görüntüle",
    href: observation.canonicalDetailUrl,
    disclosure: AMAZON_ASSOCIATE_DISCLOSURE_TR,
    sourceLabel: observation.source === "PROVIDER_API" ? "Amazon Creators API" : "Haricen sağlanan süreli Amazon satış ortaklığı bağlantısı",
    retrievedAt: observation.retrievedAt,
    expiresAt: observation.expiresAt,
    rel: "nofollow sponsored noreferrer",
  });
}
