export type UsedCarsCommercialProduct = "DEALER_MEMBERSHIP" | "VEHICLE_ALERT_PRO" | "SPONSORED_SHOWCASE";
export interface CommercialOfferSnapshot { readonly offerId: string; readonly product: UsedCarsCommercialProduct; readonly productCode: string; readonly priceMinor: number; readonly currency: "TRY"; readonly taxIncluded: boolean; readonly billingPeriod: "ONE_TIME" | "MONTHLY" | "YEARLY"; readonly entitlementVersion: string; readonly termsVersion: string; readonly cancellationRefundVersion: string; readonly validUntil: string; readonly approvedByCommercialId: string | null; readonly approvedByLegalId: string | null; readonly checksum: string; readonly organicRankingBenefit: false; readonly productionEnabled: false }
export function validateCommercialOfferSnapshot(offer: CommercialOfferSnapshot, now: string) {
  const codes: string[] = [];
  if (!offer.productCode.startsWith("USED_CARS_")) codes.push("USED_CARS_PRODUCT_CODE_REQUIRED");
  if (!Number.isInteger(offer.priceMinor) || offer.priceMinor <= 0) codes.push("PRICE_INVALID");
  if (!offer.entitlementVersion || !offer.termsVersion || !offer.cancellationRefundVersion) codes.push("VERSIONED_TERMS_REQUIRED");
  if (new Date(offer.validUntil) <= new Date(now)) codes.push("OFFER_EXPIRED");
  if (!offer.approvedByCommercialId || !offer.approvedByLegalId || offer.approvedByCommercialId === offer.approvedByLegalId) codes.push("SEPARATE_COMMERCIAL_LEGAL_APPROVAL_REQUIRED");
  if (!/^sha256:[a-f0-9]{64}$/u.test(offer.checksum)) codes.push("CHECKSUM_INVALID");
  if (offer.organicRankingBenefit || offer.productionEnabled) codes.push("COMMERCIAL_BOUNDARY_VIOLATION");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), checkoutAuthorized: false as const, chargeAuthorized: false as const });
}
