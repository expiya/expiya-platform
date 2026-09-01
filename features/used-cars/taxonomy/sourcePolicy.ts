export type UsedTaxonomySourceAuthority = "PRIMARY" | "OFFICIAL" | "LICENSED_PROVIDER" | "TRUSTED_SECONDARY" | "DEALER_SUBMISSION";
export type UsedTaxonomyUsagePermission = "OPEN_LICENSE" | "PUBLIC_FACTS_ONLY" | "LICENSED" | "CONTRACT_REQUIRED" | "PERMISSION_REQUIRED" | "INTERNAL_ONLY" | "PROHIBITED";

export interface UsedTaxonomySource {
  readonly id: string;
  readonly authority: UsedTaxonomySourceAuthority;
  readonly usagePermission: UsedTaxonomyUsagePermission;
  readonly reviewedAt: string;
  readonly licenseValidUntil?: string;
  readonly marketApplicability: "TR" | "GLOBAL" | "OTHER_MARKET";
  readonly automatedAcquisitionApproved: boolean;
}

export type TaxonomySourceGateCode =
  | "SOURCE_REVIEW_STALE" | "PUBLIC_USE_NOT_PERMITTED" | "LICENSE_EXPIRED"
  | "TR_MARKET_APPLICABILITY_MISSING" | "DEALER_SOURCE_CANNOT_VERIFY_CANONICAL_IDENTITY";

export function evaluateTaxonomySourceForPublicUse(source: UsedTaxonomySource, now: string): { readonly allowed: boolean; readonly codes: readonly TaxonomySourceGateCode[] } {
  const codes: TaxonomySourceGateCode[] = [];
  const reviewAgeMs = Date.parse(now) - Date.parse(source.reviewedAt);
  if (!Number.isFinite(reviewAgeMs) || reviewAgeMs < 0 || reviewAgeMs > 180 * 86_400_000) codes.push("SOURCE_REVIEW_STALE");
  if (!["OPEN_LICENSE", "PUBLIC_FACTS_ONLY", "LICENSED"].includes(source.usagePermission)) codes.push("PUBLIC_USE_NOT_PERMITTED");
  if (source.usagePermission === "LICENSED" && (!source.licenseValidUntil || source.licenseValidUntil < now)) codes.push("LICENSE_EXPIRED");
  if (source.marketApplicability === "OTHER_MARKET") codes.push("TR_MARKET_APPLICABILITY_MISSING");
  if (source.authority === "DEALER_SUBMISSION") codes.push("DEALER_SOURCE_CANNOT_VERIFY_CANONICAL_IDENTITY");
  return Object.freeze({ allowed: codes.length === 0, codes: Object.freeze(codes) });
}

export function isAutomatedAcquisitionAllowed(source: UsedTaxonomySource): boolean {
  return source.automatedAcquisitionApproved
    && ["OPEN_LICENSE", "LICENSED"].includes(source.usagePermission)
    && source.authority !== "DEALER_SUBMISSION";
}

