import type { UsedCarsPrincipal } from "./contracts";
export interface ProviderTokenClaims { readonly issuer: string; readonly audience: string; readonly subject: string; readonly tokenId: string; readonly issuedAt: number; readonly expiresAt: number; readonly authenticationTime: number; readonly assurance: "AAL1" | "AAL2"; readonly emailVerified: boolean; readonly providerTenantClaim?: string; readonly providerRoleClaim?: string }
export interface ServerResolvedMembership { readonly subject: string; readonly principal: UsedCarsPrincipal; readonly active: boolean; readonly authVersion: number; readonly tokenAuthVersion: number }
export function resolveProviderPrincipal(input: { readonly claims: ProviderTokenClaims; readonly membership: ServerResolvedMembership | null; readonly expectedIssuer: string; readonly expectedAudience: string; readonly now: number; readonly consumedTokenIds: ReadonlySet<string> }) {
  const codes: string[] = [];
  if (input.claims.issuer !== input.expectedIssuer) codes.push("ISSUER_MISMATCH");
  if (input.claims.audience !== input.expectedAudience) codes.push("AUDIENCE_MISMATCH");
  if (input.claims.expiresAt <= input.now || input.claims.issuedAt > input.now || input.claims.authenticationTime > input.now) codes.push("TOKEN_TIME_INVALID");
  if (input.consumedTokenIds.has(input.claims.tokenId)) codes.push("TOKEN_REPLAY");
  if (!input.claims.emailVerified) codes.push("EMAIL_NOT_VERIFIED");
  if (!input.membership || !input.membership.active || input.membership.subject !== input.claims.subject) codes.push("ACTIVE_SERVER_MEMBERSHIP_REQUIRED");
  if (input.membership && input.membership.authVersion !== input.membership.tokenAuthVersion) codes.push("AUTH_VERSION_REVOKED");
  return Object.freeze({ accepted: codes.length === 0, codes: Object.freeze(codes), principal: codes.length === 0 ? input.membership!.principal : null, providerTenantAndRoleClaimsTrusted: false as const });
}
