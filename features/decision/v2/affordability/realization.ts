import type { AffordabilityCandidateResult, PriceRealizationPermission } from "./types";

export type ConsumerVisiblePriceFact =
  | { readonly permission: "EXACT_PUBLIC_PRICE_ALLOWED"; readonly amountTry: number; readonly claimType: "PUBLIC_CURRENT_LIST_PRICE" }
  | { readonly permission: "APPROXIMATE_BUDGET_LANGUAGE_ONLY"; readonly requiredLanguage: readonly ["TAHMINEN_OR_APPROXIMATELY", "NOT_A_VERIFIED_PRICE"]; readonly exactEstimateDisclosureAllowed: false }
  | { readonly permission: "NO_PRICE_LANGUAGE" };

export function projectConsumerVisiblePriceFact(candidate: AffordabilityCandidateResult): ConsumerVisiblePriceFact {
  const permission: PriceRealizationPermission = candidate.priceAuthority.realizationPermission;
  if (permission === "EXACT_PUBLIC_PRICE_ALLOWED" && candidate.priceAuthority.publicExactAmountTry !== undefined) return Object.freeze({ permission, amountTry: candidate.priceAuthority.publicExactAmountTry, claimType: "PUBLIC_CURRENT_LIST_PRICE" });
  if (permission === "APPROXIMATE_BUDGET_LANGUAGE_ONLY") return Object.freeze({ permission, requiredLanguage: ["TAHMINEN_OR_APPROXIMATELY", "NOT_A_VERIFIED_PRICE"] as const, exactEstimateDisclosureAllowed: false });
  return Object.freeze({ permission: "NO_PRICE_LANGUAGE" });
}
