export type AuthorizedDealer = { readonly id: string; readonly displayName: string; readonly legalEntity: string; readonly notificationEmail: string; readonly status: "PILOT_FAKE" | "ACTIVE"; readonly locationCoverage: "ALL_TURKEY" | readonly string[]; readonly exactVariantCoverage: "ALL_EXACT_VARIANTS" | readonly string[] };

export const PILOT_FAKE_DEALER: AuthorizedDealer = {
  id: "dealer-pilot-fake-001",
  displayName: "Expiya Pilot Örnek Yetkili Satıcı",
  legalEntity: "PILOT FAKE — Gerçek tüzel kişi değildir",
  notificationEmail: "serdar@expiya.com",
  status: "PILOT_FAKE",
  locationCoverage: "ALL_TURKEY",
  exactVariantCoverage: "ALL_EXACT_VARIANTS",
};

export function isFakeDealerPilotEnabled() {
  const nonProductionRuntime = process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
  return nonProductionRuntime && process.env.CARS_PHASE3_FAKE_DEALER === "true";
}
export function resolveAuthorizedDealer(input: { readonly province: string; readonly district: string; readonly exactVariantId: string }): AuthorizedDealer {
  if (!input.province.trim() || !input.district.trim() || !input.exactVariantId.trim()) throw new TypeError("DEALER_MATCH_INPUT_INVALID");
  if (isFakeDealerPilotEnabled() || process.env.NODE_ENV === "test") return PILOT_FAKE_DEALER;
  throw new TypeError("AUTHORIZED_DEALER_NOT_FOUND");
}
