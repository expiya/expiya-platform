export type PartnerSellerRole = "SELLER_FULL_ACCESS";

export const partnerSellerRole = Object.freeze({
  code: "SELLER_FULL_ACCESS" as const,
  label: "Tam yetkili",
  description: "Firma, şube, kullanıcı, stok, talep, analitik, üyelik ve audit işlemlerinin tamamına erişir.",
  tenantWide: true as const,
  mfaRequired: true as const,
  assignableRoles: Object.freeze(["SELLER_FULL_ACCESS"] as const),
  productionAssignmentAuthorized: false as const,
});

export function evaluatePartnerRoleAssignment(role: string) {
  return Object.freeze({
    allowed: role === partnerSellerRole.code,
    role: role === partnerSellerRole.code ? partnerSellerRole.code : null,
    productionMutationAuthorized: false as const,
    reason: role === partnerSellerRole.code ? null : "ONLY_FULL_ACCESS_ROLE_IS_ASSIGNABLE" as const,
  });
}
