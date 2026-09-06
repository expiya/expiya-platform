import { createHash } from "node:crypto";
import { hasExactModelMatch } from "./authority";
import type { ExactCommerceLookup, ProviderNeutralCommerceObservation } from "./providerContracts";

export interface ManualAffiliateLinkInput {
  readonly lookup: ExactCommerceLookup;
  readonly canonicalDetailUrl: string;
  readonly observedTitle: string;
  readonly observedBrand: string;
  readonly observedModelEvidence: readonly string[];
  readonly suppliedAt: string;
  readonly expiresAt: string;
  readonly auditReference: string;
}

function stableId(input: ManualAffiliateLinkInput): string {
  return createHash("sha256").update(`${input.lookup.exactProductId}|${input.lookup.providerItemId}|${input.canonicalDetailUrl}|${input.suppliedAt}`).digest("hex");
}

/** Manual links are provisional observations: tagged, auditable, and short-lived. */
export function admitManualAmazonAffiliateLink(input: ManualAffiliateLinkInput): ProviderNeutralCommerceObservation | null {
  const supplied = Date.parse(input.suppliedAt), expires = Date.parse(input.expiresAt);
  let url: URL;
  try { url = new URL(input.canonicalDetailUrl); } catch { return null; }
  const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/u)?.[1];
  const matchedModelTokens = input.lookup.exactModelTokens.filter(token => input.observedModelEvidence.some(evidence => hasExactModelMatch(token, evidence)));
  if (!Number.isFinite(supplied) || !Number.isFinite(expires) || expires <= supplied || expires - supplied > 7 * 86_400_000
    || !input.auditReference.trim() || url.protocol !== "https:" || url.hostname !== "www.amazon.com.tr"
    || !/^[A-Za-z0-9][A-Za-z0-9-]{1,63}$/u.test(url.searchParams.get("tag")?.trim() ?? "") || asin !== input.lookup.providerItemId
    || !hasExactModelMatch(input.lookup.brand, input.observedBrand) || matchedModelTokens.length !== input.lookup.exactModelTokens.length) return null;
  return Object.freeze({
    schemaVersion: "appliances-commerce-provider/v1",
    observationId: `manual-amazon:${stableId(input)}`,
    provider: "AMAZON_CREATORS_API",
    source: "MANUAL_AFFILIATE_LINK",
    exactProductId: input.lookup.exactProductId,
    categoryId: input.lookup.categoryId,
    providerItemId: input.lookup.providerItemId,
    canonicalDetailUrl: input.canonicalDetailUrl,
    availability: "IN_STOCK",
    retrievedAt: input.suppliedAt,
    expiresAt: input.expiresAt,
    identityEvidence: { providerItemIdMatched: true as const, categoryIdMatched: true as const, brandMatched: true as const, matchedModelTokens, observedTitle: input.observedTitle, observedManufacturerModel: input.observedModelEvidence.join(" | ") },
    provenance: { manuallySuppliedAuditReference: input.auditReference, attributionRequired: true as const, license: "EXTERNALLY_SUPPLIED_LINK_ONLY" as const },
  });
}
