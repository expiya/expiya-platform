export const V2_PUBLIC_CARD_POLICY = Object.freeze({
  policyId: "cars-v2-authorized-card-projection",
  version: "1.0.0",
  placeholderImage: "/cars/production-placeholder.svg",
  maximumCards: 3,
});

export const PUBLIC_CARD_REASON_TEXT = Object.freeze({
  FULLY_ELIGIBLE_VERIFIED_PRICE: "Teknik ihtiyaçlarla ve doğrulanmış bütçe sınırıyla uyumlu.",
  ELIGIBLE_INTERNAL_ESTIMATE_WITHIN_BUDGET: "Teknik ihtiyaçlarla uyumlu; bütçe değerlendirmesi yaklaşık fiyat seviyesine dayanıyor.",
  ELIGIBLE_BUDGET_NOT_APPLIED: "Teknik ihtiyaçlarla uyumlu; bütçe filtre olarak uygulanmadı.",
  CONDITIONALLY_ELIGIBLE_ESTIMATED_OVER_BUDGET: "Teknik ihtiyaçlarla uyumlu; doğrulanmamış fiyat seviyesine göre bütçe sınırını aşabilir.",
  TECHNICALLY_ELIGIBLE_PRICE_UNRESOLVED: "Teknik ihtiyaçlarla uyumlu; güncel fiyat henüz doğrulanamadı.",
} as const);
