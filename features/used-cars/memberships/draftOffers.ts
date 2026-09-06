export type DraftPlanCode = "BASIC" | "STANDARD" | "PREMIUM" | "GOLD";
export type BillingPeriod = "MONTHLY" | "YEARLY";
export type DraftPlanCapability = "DETAILED_LISTING_SHARING" | "SELLER_PROFILE_VISIBLE" | "CONSENTED_LEAD_DETAILS" | "LIVE_CHAT" | "VIDEO_DEMO" | "WEEKLY_MARKET_ANALYSIS" | "SPONSORED_PLACEMENTS" | "AI_ASSISTED_RESPONSES";

export interface DraftMembershipOffer {
  readonly code: DraftPlanCode; readonly name: string; readonly audience: string; readonly activeListingLimit: number;
  readonly monthlyPriceMinor: number; readonly yearlyPriceMinor: number; readonly currency: "TRY"; readonly annualDiscountPercent: 20;
  readonly capabilities: readonly DraftPlanCapability[]; readonly paymentMethod: "CREDIT_CARD"; readonly priceIncludesVat: false;
  readonly organicRankingBenefit: false; readonly productionCheckoutAuthorized: false; readonly productionSubscriptionMutationAuthorized: false;
}

const offer = (input: Omit<DraftMembershipOffer, "yearlyPriceMinor" | "currency" | "annualDiscountPercent" | "paymentMethod" | "priceIncludesVat" | "organicRankingBenefit" | "productionCheckoutAuthorized" | "productionSubscriptionMutationAuthorized">): DraftMembershipOffer => Object.freeze({
  ...input, yearlyPriceMinor: input.monthlyPriceMinor * 12 * 0.8, currency: "TRY", annualDiscountPercent: 20, paymentMethod: "CREDIT_CARD",
  priceIncludesVat: false, organicRankingBenefit: false, productionCheckoutAuthorized: false, productionSubscriptionMutationAuthorized: false,
});

export const draftMembershipOffers: readonly DraftMembershipOffer[] = Object.freeze([
  offer({ code: "BASIC", name: "Basic", audience: "Küçük ve tek şubeli kurumsal satıcılar", activeListingLimit: 10, monthlyPriceMinor: 99_000, capabilities: ["DETAILED_LISTING_SHARING", "SELLER_PROFILE_VISIBLE"] }),
  offer({ code: "STANDARD", name: "Standart", audience: "Düzenli talep yöneten büyüyen galeriler", activeListingLimit: 25, monthlyPriceMinor: 247_500, capabilities: ["DETAILED_LISTING_SHARING", "SELLER_PROFILE_VISIBLE", "CONSENTED_LEAD_DETAILS"] }),
  offer({ code: "PREMIUM", name: "Premium", audience: "Yoğun satış ve uzaktan sunum ekipleri", activeListingLimit: 50, monthlyPriceMinor: 495_000, capabilities: ["DETAILED_LISTING_SHARING", "SELLER_PROFILE_VISIBLE", "CONSENTED_LEAD_DETAILS", "LIVE_CHAT", "VIDEO_DEMO", "WEEKLY_MARKET_ANALYSIS"] }),
  offer({ code: "GOLD", name: "Gold", audience: "Yüksek hacimli ve çok kanallı kurumsal operasyonlar", activeListingLimit: 100, monthlyPriceMinor: 990_000, capabilities: ["DETAILED_LISTING_SHARING", "SELLER_PROFILE_VISIBLE", "CONSENTED_LEAD_DETAILS", "LIVE_CHAT", "VIDEO_DEMO", "WEEKLY_MARKET_ANALYSIS", "SPONSORED_PLACEMENTS", "AI_ASSISTED_RESPONSES"] }),
]);

export function validateDraftMembershipOffers(offers: readonly DraftMembershipOffer[]): readonly string[] {
  const codes: string[] = [];
  if (offers.length !== 4 || new Set(offers.map(item => item.code)).size !== 4) codes.push("FOUR_UNIQUE_PLANS_REQUIRED");
  for (const [index, item] of offers.entries()) {
    if (item.activeListingLimit < 1 || item.monthlyPriceMinor < 1) codes.push("POSITIVE_LIMIT_AND_PRICE_REQUIRED");
    if (item.yearlyPriceMinor !== item.monthlyPriceMinor * 12 * 0.8) codes.push("ANNUAL_DISCOUNT_MISMATCH");
    if (index > 0 && item.activeListingLimit <= offers[index - 1].activeListingLimit) codes.push("LISTING_LIMIT_NOT_INCREASING");
    if (item.organicRankingBenefit || item.productionCheckoutAuthorized || item.productionSubscriptionMutationAuthorized) codes.push("COMMERCIAL_BOUNDARY_VIOLATION");
  }
  return Object.freeze([...new Set(codes)]);
}

export function evaluateDraftCheckout(input: { readonly offer: DraftMembershipOffer; readonly period: BillingPeriod }) {
  return Object.freeze({ amountMinor: input.period === "MONTHLY" ? input.offer.monthlyPriceMinor : input.offer.yearlyPriceMinor, currency: input.offer.currency, paymentMethod: input.offer.paymentMethod, checkoutAuthorized: false as const, subscriptionMutationAuthorized: false as const, reason: "DRAFT_ONLY" as const });
}
