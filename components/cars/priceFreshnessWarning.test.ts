import { describe, expect, it } from "vitest";

import type { RecommendedCarPricePresentation } from "@/types/recommendation";

import { priceFreshnessWarning } from "./priceFreshnessWarning";
import { internalEstimateDisclosure, recommendationRevealCopy } from "@/features/decision/conversation/presentGovernedRecommendation";

const basePrice: RecommendedCarPricePresentation = {
  amountTry: 1_830_000,
  priceType: "LIST",
  validityStatus: "CURRENT",
};

describe("priceFreshnessWarning", () => {
  it("formats an expired price end date in Turkish", () => {
    expect(priceFreshnessWarning({
      ...basePrice,
      validityStatus: "EXPIRED",
      validUntil: "2026-08-31T23:59:59.999Z",
    })).toBe("Güncel olmayabilir · 31 Ağustos 2026 tarihine kadar geçerli fiyat");
  });

  it("uses the general warning when an expired price has no end date", () => {
    expect(priceFreshnessWarning({ ...basePrice, validityStatus: "EXPIRED" }))
      .toBe("Bu fiyat güncel olmayabilir. Fiyat kaydının geçerlilik tarihi sona ermiştir.");
  });

  it.each(["CURRENT", "NOT_YET_VALID", "ABSENT", "NOT_EVALUATED"] as const)(
    "does not warn for %s prices",
    (validityStatus) => {
      expect(priceFreshnessWarning({ ...basePrice, validityStatus, validUntil: "2026-08-31T23:59:59.999Z" }))
        .toBeUndefined();
    },
  );

  it("does not describe an expired observation as a current price in the decision copy", () => {
    expect(recommendationRevealCopy({
      identity: "Renault Clio",
      reasons: [],
      memory: { offerPurpose: "NEW_CONFIGURATION_OFFER" } as never,
      amountTry: 1_830_000,
      priceType: "LIST",
      validityStatus: "EXPIRED",
    })).toContain("Kayıtlı liste fiyatı");
  });

  it("never includes the internal estimate amount in recommendation or budget disclosures", () => {
    const recommendation = recommendationRevealCopy({
      identity: "Alpine A110",
      reasons: [],
      memory: { offerPurpose: "NEW_CONFIGURATION_OFFER" } as never,
      internalEstimateResult: "PASS",
    });
    expect(recommendation).toContain("yaklaşık bütçe aralığında");
    expect(recommendation).not.toMatch(/5[.]500[.]000|5,5 milyon|tahmini fiyat/iu);
    expect(internalEstimateDisclosure("FAIL")).toBe(
      "Araç yaklaşık fiyat konumlandırmasına göre bütçe dışında değerlendirildi; güncel fiyat doğrulanmalıdır.",
    );
  });
});
