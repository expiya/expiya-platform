import type { GovernedProductMedia } from "./types";

export const CREDENTIALED_PROVIDER_SPECS = [
  { provider: "AMAZON_TR_CREATORS_API", credentialRefs: ["APPLIANCES_AMAZON_CREATORS_CLIENT_ID", "APPLIANCES_AMAZON_CREATORS_CLIENT_SECRET", "APPLIANCES_AMAZON_CREATORS_PARTNER_TAG"], rightsRef: "APPLIANCES_AMAZON_ASSOCIATES_ACCEPTANCE_REFERENCE" },
  { provider: "HEPSIBURADA_FEED", credentialRefs: ["APPLIANCES_HEPSIBURADA_FEED_URL", "APPLIANCES_HEPSIBURADA_FEED_TOKEN"], rightsRef: "APPLIANCES_HEPSIBURADA_MEDIA_RIGHTS" },
  { provider: "TRENDYOL_FEED", credentialRefs: ["APPLIANCES_TRENDYOL_FEED_URL", "APPLIANCES_TRENDYOL_FEED_TOKEN"], rightsRef: "APPLIANCES_TRENDYOL_MEDIA_RIGHTS" },
  { provider: "MANUFACTURER_FEED", credentialRefs: ["APPLIANCES_MANUFACTURER_FEED_URL", "APPLIANCES_MANUFACTURER_FEED_TOKEN"], rightsRef: "APPLIANCES_MANUFACTURER_MEDIA_RIGHTS" },
] as const;

export type CredentialEnvironment = Readonly<Record<string, string | undefined>>;
export type ProviderName = typeof CREDENTIALED_PROVIDER_SPECS[number]["provider"];
export type CredentialInventoryRow = { readonly provider: ProviderName; readonly credentialReferences: readonly string[]; readonly rightsReference: string; readonly presentReferences: readonly string[]; readonly status: "READY" | "CREDENTIALS_ABSENT" | "INCOMPLETE"; readonly mediaRightsDeclarationPresent: boolean };

/** Reports names and presence only. Values never leave the process boundary. */
export function inventoryCredentialReferences(environment: CredentialEnvironment): readonly CredentialInventoryRow[] {
  return CREDENTIALED_PROVIDER_SPECS.map(spec => {
    const presentReferences = spec.credentialRefs.filter(ref => Boolean(environment[ref]?.trim()));
    return { provider: spec.provider, credentialReferences: spec.credentialRefs, rightsReference: spec.rightsRef, presentReferences, status: presentReferences.length === 0 ? "CREDENTIALS_ABSENT" : presentReferences.length === spec.credentialRefs.length ? "READY" : "INCOMPLETE", mediaRightsDeclarationPresent: Boolean(environment[spec.rightsRef]?.trim()) };
  });
}

export type MediaRightsGrant = { readonly exactProductId: string; readonly sourceUrl: string; readonly canonicalProductPage: string; readonly mode: "CACHE_LOCAL" | "REMOTE_DISPLAY"; readonly grantReference: string; readonly exactModelMatched: boolean; readonly expiresAt?: string };
export function admitCredentialedMedia(grant: MediaRightsGrant, now: Date): GovernedProductMedia | null {
  if (!grant.exactModelMatched || !grant.grantReference.trim() || !grant.sourceUrl.startsWith("https://") || !grant.canonicalProductPage.startsWith("https://") || (grant.expiresAt && Date.parse(grant.expiresAt) <= now.getTime())) return null;
  if (grant.mode === "CACHE_LOCAL") return null; // Local bytes require hash/dimensions after a separate permitted download step.
  return { assetId: `credentialed-remote-${grant.exactProductId}`, exactProductId: grant.exactProductId, sourceUrl: grant.sourceUrl, canonicalProductPage: grant.canonicalProductPage, mediaUrl: grant.sourceUrl, sourceType: "MANUFACTURER_CDN", retrievedAt: now.toISOString(), verifiedAt: now.toISOString(), rightsStatus: "MANUFACTURER_PUBLISHED_REMOTE_DISPLAY", identityMatchEvidence: [`Exact product binding verified; display grant reference ${grant.grantReference}.`], status: "EXACT_APPROVED" };
}

export type BoundedRequestResult = { readonly status: "OK"; readonly response: Response; readonly attempts: number } | { readonly status: "AUTHORIZATION_FAILED" | "RATE_LIMITED" | "FETCH_FAILED"; readonly attempts: number; readonly httpStatus?: number };
export async function boundedProviderRequest(url: string, init: RequestInit, fetcher: typeof fetch = fetch, maximumAttempts = 2): Promise<BoundedRequestResult> {
  const attemptsLimit = Math.max(1, Math.min(3, Math.trunc(maximumAttempts)));
  for (let attempt = 1; attempt <= attemptsLimit; attempt++) {
    try {
      const response = await fetcher(url, { ...init, signal: init.signal ?? AbortSignal.timeout(8_000) });
      if (response.status === 401 || response.status === 403) return { status: "AUTHORIZATION_FAILED", attempts: attempt, httpStatus: response.status };
      if (response.status === 429) return { status: "RATE_LIMITED", attempts: attempt, httpStatus: 429 };
      if (response.ok) return { status: "OK", response, attempts: attempt };
      if (attempt === attemptsLimit || response.status < 500) return { status: "FETCH_FAILED", attempts: attempt, httpStatus: response.status };
    } catch { if (attempt === attemptsLimit) return { status: "FETCH_FAILED", attempts: attempt }; }
  }
  return { status: "FETCH_FAILED", attempts: attemptsLimit };
}
