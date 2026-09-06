export type ClaimStatus = "EXPIYA_VERIFIED" | "DEALER_DECLARATION" | "DOCUMENT_UNVERIFIED" | "UNVERIFIED" | "MISSING" | "CONFLICTING" | "EXPIRED";
export interface GroundedClaim { readonly claimId: string; readonly status: ClaimStatus; readonly evidenceRefs: readonly string[]; readonly wording: string }

const unsafePatterns = [/\bkesin al\b/i, /\bkesin alma\b/i, /hasarsızlık garantisi/i, /kilometre garantisi/i];
export function evaluateGroundedResponse(claims: readonly GroundedClaim[], response: string) {
  const codes: string[] = [];
  if (unsafePatterns.some((pattern) => pattern.test(response))) codes.push("PRESCRIPTIVE_OR_GUARANTEE_LANGUAGE");
  if (claims.some((claim) => claim.status === "EXPIYA_VERIFIED" && claim.evidenceRefs.length === 0)) codes.push("VERIFIED_CLAIM_WITHOUT_EVIDENCE");
  if (claims.some((claim) => claim.status === "DEALER_DECLARATION" && /expiya.*doğrulad/i.test(claim.wording))) codes.push("DEALER_CLAIM_MISREPRESENTED");
  if (claims.some((claim) => ["CONFLICTING", "MISSING", "UNVERIFIED", "EXPIRED"].includes(claim.status)) && !/(eksik|doğrulan|çeliş|güncel değil|satıcı|ekspertiz)/i.test(response)) codes.push("UNCERTAINTY_NOT_DISCLOSED");
  return Object.freeze({ allowed: codes.length === 0, codes: Object.freeze(codes), humanHandoffAvailable: true as const, purchaseDecisionAuthorized: false as const });
}
