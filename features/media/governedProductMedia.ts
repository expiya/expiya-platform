export const GOVERNED_PRODUCT_MEDIA_SCHEMA = "governed-product-media/v1" as const;

export type GovernedMediaDisposition =
  | "EXACT_LICENSED"
  | "MODEL_FAMILY_LICENSED"
  | "AFFILIATE_API_TRANSIENT"
  | "OWNED_REPRESENTATIVE"
  | "DISCOVERED_RIGHTS_UNPROVEN"
  | "IDENTITY_UNPROVEN"
  | "UNAVAILABLE";

export type GovernedMediaSurface = "STAGE_1_CARD" | "STAGE_2_HERO" | "DETAIL_GALLERY";
export type GovernedMediaRightsBasis =
  | "MANUFACTURER_PRESS_MEDIA_LICENSE"
  | "DEALER_AFFILIATE_CATALOG_LICENSE"
  | "AMAZON_ASSOCIATES_CREATORS_API"
  | "MERCHANT_API_OR_FEED_LICENSE"
  | "OPEN_LICENSE"
  | "OWNED_OR_COMMISSIONED";

export interface GovernedProductMedia {
  readonly schemaVersion: typeof GOVERNED_PRODUCT_MEDIA_SCHEMA;
  readonly disposition: GovernedMediaDisposition;
  readonly rightsBasis: GovernedMediaRightsBasis | null;
  readonly provider: string | null;
  /** Contract, feed, media-kit terms, license, or owned-asset ledger entry. */
  readonly permissionReference: string | null;
  readonly allowedSurfaces: readonly GovernedMediaSurface[];
  readonly requiredLinkTarget: string | null;
  readonly requiredDisclosure: string | null;
  readonly requiredAttribution: string | null;
  readonly cache: {
    readonly mode: "PERSISTENT" | "TRANSIENT_URL_ONLY" | "NO_STORE";
    readonly expiresAt: string | null;
    readonly maxAgeSeconds: number | null;
  };
  readonly retrievedAt: string | null;
  readonly identity: {
    readonly scope: "EXACT_PRODUCT" | "MODEL_FAMILY" | "CATEGORY_REPRESENTATIVE" | "UNVERIFIED";
    readonly evidence: readonly string[];
  };
  readonly revokedAt: string | null;
}

export interface GovernedMediaCandidate {
  readonly governance: GovernedProductMedia;
  readonly localSrc?: string;
  readonly remoteSrc?: string;
}

export type GovernedMediaValidationIssue =
  | "RIGHTS_BASIS_REQUIRED"
  | "PROVIDER_REQUIRED"
  | "PERMISSION_REFERENCE_REQUIRED"
  | "SURFACE_REQUIRED"
  | "IDENTITY_BINDING_INVALID"
  | "IDENTITY_EVIDENCE_REQUIRED"
  | "AFFILIATE_LINK_REQUIRED"
  | "AFFILIATE_DISCLOSURE_REQUIRED"
  | "AFFILIATE_TRANSIENT_CACHE_REQUIRED"
  | "AMAZON_IMAGE_CACHE_WINDOW_INVALID"
  | "PERSISTED_TRANSIENT_ASSET_FORBIDDEN"
  | "RUNTIME_SOURCE_FOR_UNPUBLISHABLE_DISPOSITION"
  | "SOURCE_REQUIRED"
  | "EXPIRED_OR_REVOKED";

const publishable = new Set<GovernedMediaDisposition>([
  "EXACT_LICENSED", "MODEL_FAMILY_LICENSED", "AFFILIATE_API_TRANSIENT", "OWNED_REPRESENTATIVE",
]);

export function validateGovernedProductMedia(candidate: GovernedMediaCandidate, now = new Date()): readonly GovernedMediaValidationIssue[] {
  const { governance, localSrc, remoteSrc } = candidate;
  const issues: GovernedMediaValidationIssue[] = [];
  const hasSource = Boolean(localSrc || remoteSrc);
  if (!publishable.has(governance.disposition)) {
    if (hasSource) issues.push("RUNTIME_SOURCE_FOR_UNPUBLISHABLE_DISPOSITION");
    return issues;
  }
  if (!governance.rightsBasis) issues.push("RIGHTS_BASIS_REQUIRED");
  if (!governance.provider?.trim()) issues.push("PROVIDER_REQUIRED");
  if (!governance.permissionReference?.trim()) issues.push("PERMISSION_REFERENCE_REQUIRED");
  if (!governance.allowedSurfaces.length) issues.push("SURFACE_REQUIRED");
  if (!governance.identity.evidence.length) issues.push("IDENTITY_EVIDENCE_REQUIRED");
  if (!hasSource || (localSrc && remoteSrc)) issues.push("SOURCE_REQUIRED");
  if (governance.revokedAt || (governance.cache.expiresAt && Date.parse(governance.cache.expiresAt) <= now.getTime())) issues.push("EXPIRED_OR_REVOKED");

  const expectedScope = governance.disposition === "EXACT_LICENSED" || governance.disposition === "AFFILIATE_API_TRANSIENT"
    ? "EXACT_PRODUCT"
    : governance.disposition === "MODEL_FAMILY_LICENSED" ? "MODEL_FAMILY" : "CATEGORY_REPRESENTATIVE";
  if (governance.identity.scope !== expectedScope) issues.push("IDENTITY_BINDING_INVALID");

  if (governance.disposition === "AFFILIATE_API_TRANSIENT") {
    if (!governance.requiredLinkTarget?.startsWith("https://")) issues.push("AFFILIATE_LINK_REQUIRED");
    if (!governance.requiredDisclosure?.trim()) issues.push("AFFILIATE_DISCLOSURE_REQUIRED");
    if (governance.cache.mode !== "TRANSIENT_URL_ONLY" || !remoteSrc || localSrc) issues.push("AFFILIATE_TRANSIENT_CACHE_REQUIRED");
    if (localSrc) issues.push("PERSISTED_TRANSIENT_ASSET_FORBIDDEN");
    if (governance.rightsBasis === "AMAZON_ASSOCIATES_CREATORS_API"
      && (!governance.cache.expiresAt || !governance.cache.maxAgeSeconds || governance.cache.maxAgeSeconds > 86_400)) {
      issues.push("AMAZON_IMAGE_CACHE_WINDOW_INVALID");
    }
  }
  return [...new Set(issues)];
}

export function isGovernedMediaUsableOn(candidate: GovernedMediaCandidate, surface: GovernedMediaSurface, now = new Date()): boolean {
  return candidate.governance.allowedSurfaces.includes(surface) && validateGovernedProductMedia(candidate, now).length === 0;
}

export function buildOwnedRepresentativeGovernance(input: {
  readonly provider: string;
  readonly permissionReference: string;
  readonly evidence: readonly string[];
}): GovernedProductMedia {
  return {
    schemaVersion: GOVERNED_PRODUCT_MEDIA_SCHEMA,
    disposition: "OWNED_REPRESENTATIVE",
    rightsBasis: "OWNED_OR_COMMISSIONED",
    provider: input.provider,
    permissionReference: input.permissionReference,
    allowedSurfaces: ["STAGE_1_CARD", "STAGE_2_HERO", "DETAIL_GALLERY"],
    requiredLinkTarget: null,
    requiredDisclosure: "Temsilî illüstrasyon; ürünün birebir fotoğrafı değildir.",
    requiredAttribution: "Expiya görseli",
    cache: { mode: "PERSISTENT", expiresAt: null, maxAgeSeconds: null },
    retrievedAt: null,
    identity: { scope: "CATEGORY_REPRESENTATIVE", evidence: input.evidence },
    revokedAt: null,
  };
}
