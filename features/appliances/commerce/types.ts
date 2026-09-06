export const APPLIANCES_COMMERCE_SCHEMA_VERSION = "appliances-commerce-snapshot/v2" as const;

export type GovernedMediaStatus = "EXACT_APPROVED" | "REPRESENTATIVE_DISCLOSED" | "UNAVAILABLE";
export interface GovernedProductMedia {
  readonly assetId: string; readonly exactProductId: string; readonly sourceUrl: string;
  readonly canonicalProductPage: string; readonly mediaUrl?: string; readonly localAssetPath?: string;
  readonly sourceType: "MANUFACTURER_TR" | "MANUFACTURER_CDN" | "REPOSITORY";
  readonly retrievedAt: string; readonly verifiedAt: string;
  readonly rightsStatus: "MANUFACTURER_PUBLISHED_REMOTE_DISPLAY" | "LICENSE_VERIFIED" | "RIGHTS_UNCLEAR";
  readonly identityMatchEvidence: readonly string[];
  readonly file?: { readonly sha256: string; readonly width: number; readonly height: number; readonly contentType: string };
  readonly status: GovernedMediaStatus;
}

export interface ExactOfferObservation {
  readonly exactProductId: string; readonly categoryId: string; readonly merchant: string; readonly marketplace: boolean;
  /** The party fulfilling the order. Merchant independence is counted by this normalized identity. */
  readonly seller: string; readonly sellerIdentity: string; readonly canonicalListingUrl: string; readonly amount: number;
  readonly currency: "TRY"; readonly shippingInclusion: "INCLUDED" | "EXCLUDED" | "UNKNOWN";
  readonly availability: "IN_STOCK" | "LIMITED" | "OUT_OF_STOCK" | "UNKNOWN";
  readonly observedAt: string; readonly expiresAt: string;
  readonly sourceKind: "MANUFACTURER_DIRECT" | "MARKETPLACE" | "INDEPENDENT_MERCHANT";
  readonly discoveredVia?: { readonly aggregator: "AKAKCE"; readonly url: string };
  readonly identityMatchEvidence: readonly string[]; readonly exactModelMatched: true;
  readonly affiliate?: { readonly program: string; readonly attributionOnly: true; readonly url?: string };
  readonly observationFingerprint: string;
}

export interface CommerceSourceAttempt {
  readonly exactProductId: string;
  readonly channel: "MANUFACTURER_TR" | "AMAZON_TR" | "HEPSIBURADA" | "TRENDYOL" | "AKAKCE" | "INDEPENDENT_TR";
  readonly discoveryUrl: string; readonly attemptedAt: string;
  readonly outcome: "EXACT_OFFER_ACCEPTED" | "NO_CANONICAL_EXACT_LISTING_VERIFIED" | "IDENTITY_MISMATCH" | "UNAVAILABLE" | "BLOCKED" | "FETCH_FAILED" | "MEDIA_EXACT_APPROVED" | "MEDIA_UNAVAILABLE_FAIL_CLOSED";
  readonly evidence: string; readonly attemptNumber: number; readonly retryable: boolean; readonly httpStatus?: number;
}

export interface AppliancesCommerceSnapshot {
  readonly schemaVersion: typeof APPLIANCES_COMMERCE_SCHEMA_VERSION; readonly snapshotId: string;
  readonly publishedAt: string; readonly freshnessPolicy: { readonly maxAgeHours: number; readonly unavailableRetention: true };
  readonly productScope: readonly { readonly exactProductId: string; readonly categoryId: string; readonly brand: string; readonly model: string }[];
  readonly media: readonly GovernedProductMedia[]; readonly offers: readonly ExactOfferObservation[];
  readonly sourceAttempts: readonly CommerceSourceAttempt[];
  readonly snapshotDigest: string;
}

export interface CurrentProductCommerce {
  readonly snapshotId: string; readonly snapshotDigest: string;
  readonly media: GovernedProductMedia | null; readonly offers: readonly ExactOfferObservation[];
  readonly independentFreshOfferCount: number; readonly priceRange: { readonly minimumTry: number; readonly maximumTry: number; readonly observedAtLatest: string } | null;
  readonly coverageNotice: string;
}
