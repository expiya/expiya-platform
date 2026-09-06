import { describe, expect, it } from "vitest";
import { draftMembershipOffers, evaluateDraftCheckout, validateDraftMembershipOffers } from "./memberships/draftOffers";

describe("draft partner membership offers", () => {
  it("defines four increasing, valid offers", () => { expect(validateDraftMembershipOffers(draftMembershipOffers)).toEqual([]); expect(draftMembershipOffers.map(item => item.code)).toEqual(["BASIC", "STANDARD", "PREMIUM", "GOLD"]); });
  it("applies exactly twenty percent annual discount", () => { for (const offer of draftMembershipOffers) expect(offer.yearlyPriceMinor).toBe(offer.monthlyPriceMinor * 12 * 0.8); });
  it("keeps card checkout and subscription mutation disabled", () => expect(evaluateDraftCheckout({ offer: draftMembershipOffers[3], period: "YEARLY" })).toMatchObject({ paymentMethod: "CREDIT_CARD", checkoutAuthorized: false, subscriptionMutationAuthorized: false, reason: "DRAFT_ONLY" }));
  it("never sells organic ranking", () => expect(draftMembershipOffers.every(item => !item.organicRankingBenefit)).toBe(true));
  it("uses the approved listing limits and Basic price multiples", () => {
    expect(draftMembershipOffers.map(item => item.activeListingLimit)).toEqual([10, 25, 50, 100]);
    expect(draftMembershipOffers.map(item => item.monthlyPriceMinor)).toEqual([99_000, 247_500, 495_000, 990_000]);
  });
});
