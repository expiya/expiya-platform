export const COMMERCE_PROVIDER_CONTRACT_VERSION = "appliances-commerce-provider/v1" as const;

export type CommerceProviderId = "AMAZON_CREATORS_API" | "HEPSIBURADA_PROVIDER" | "TRENDYOL_PROVIDER" | "MANUFACTURER_PROVIDER" | "EXTERNAL_MERCHANT_PROVIDER";
export type CommerceObservationSource = "PROVIDER_API" | "MANUAL_AFFILIATE_LINK";
export type CommerceAvailability = "IN_STOCK" | "LIMITED" | "UNAVAILABLE" | "UNKNOWN";

/**
 * A provider lookup is anchored in the frozen catalog identity, but never feeds
 * back into candidate eligibility, ranking, sufficiency, or authorization.
 */
export interface ExactCommerceLookup {
  readonly exactProductId: string;
  readonly categoryId: string;
  readonly brand: string;
  readonly model: string;
  /** Provider IDs are secondary joins; they are never product identity alone. */
  readonly providerItemId: string;
  readonly exactModelTokens: readonly string[];
}

export interface ExactCommerceIdentityEvidence {
  readonly providerItemIdMatched: true;
  readonly categoryIdMatched: true;
  readonly brandMatched: true;
  readonly matchedModelTokens: readonly string[];
  readonly observedTitle: string;
  readonly observedManufacturerModel?: string;
  readonly observedManufacturerPartNumber?: string;
}

export interface ProviderNeutralCommerceObservation {
  readonly schemaVersion: typeof COMMERCE_PROVIDER_CONTRACT_VERSION;
  readonly observationId: string;
  readonly provider: CommerceProviderId;
  readonly source: CommerceObservationSource;
  readonly exactProductId: string;
  readonly categoryId: string;
  readonly providerItemId: string;
  readonly canonicalDetailUrl: string;
  readonly availability: CommerceAvailability;
  readonly retrievedAt: string;
  readonly expiresAt: string;
  readonly identityEvidence: ExactCommerceIdentityEvidence;
  readonly merchant?: string;
  readonly amount?: number;
  readonly currency?: "TRY";
  readonly image?: {
    readonly url: string;
    readonly width?: number;
    readonly height?: number;
    readonly expiresAt: string;
    readonly cacheMode: "TRANSIENT_URL_ONLY";
  };
  readonly provenance: {
    readonly providerResponseReference?: string;
    readonly manuallySuppliedAuditReference?: string;
    readonly attributionRequired: true;
    readonly license: "AMAZON_ASSOCIATES_CREATORS_API" | "EXTERNALLY_SUPPLIED_LINK_ONLY";
  };
}

export type CommerceProviderResult =
  | { readonly status: "READY"; readonly observations: readonly ProviderNeutralCommerceObservation[] }
  | { readonly status: "DISABLED_NO_CREDENTIALS" | "MISCONFIGURED" | "AUTHORIZATION_FAILED" | "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "RESPONSE_REJECTED"; readonly observations: readonly []; readonly reason: string };

export interface CommerceProviderPort {
  readonly provider: CommerceProviderId;
  observeExactProducts(lookups: readonly ExactCommerceLookup[]): Promise<CommerceProviderResult>;
}

export interface ExternalCommerceActionProjection {
  readonly schemaVersion: "external-commerce-action/v1";
  readonly exactProductId: string;
  readonly provider: CommerceProviderId;
  readonly label: string;
  readonly href: string;
  readonly disclosure: string;
  readonly sourceLabel: string;
  readonly retrievedAt: string;
  readonly expiresAt: string;
  readonly rel: "nofollow sponsored noreferrer";
}
