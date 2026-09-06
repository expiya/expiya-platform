import { describe, expect, it } from "vitest";
import { resolveProviderPrincipal } from "./identity/providerClaims";
const principal = { kind: "DEALER_USER" as const, subjectId: "sub", actorId: "actor", tenantId: "tenant", role: "DEALER_ADMIN" as const, branchIds: ["branch"] };
const claims = { issuer: "issuer", audience: "aud", subject: "sub", tokenId: "jti", issuedAt: 10, expiresAt: 100, authenticationTime: 10, assurance: "AAL2" as const, emailVerified: true, providerTenantClaim: "attacker-tenant", providerRoleClaim: "PLATFORM_ADMIN" };
describe("used-cars provider claim resolution", () => {
  it("resolves authorization from server membership, not provider role claims", () => expect(resolveProviderPrincipal({ claims, membership: { subject: "sub", principal, active: true, authVersion: 2, tokenAuthVersion: 2 }, expectedIssuer: "issuer", expectedAudience: "aud", now: 20, consumedTokenIds: new Set() })).toMatchObject({ accepted: true, principal, providerTenantAndRoleClaimsTrusted: false }));
  it("fails closed for revoked auth version", () => expect(resolveProviderPrincipal({ claims, membership: { subject: "sub", principal, active: true, authVersion: 3, tokenAuthVersion: 2 }, expectedIssuer: "issuer", expectedAudience: "aud", now: 20, consumedTokenIds: new Set() }).codes).toContain("AUTH_VERSION_REVOKED"));
  it("rejects missing server membership", () => expect(resolveProviderPrincipal({ claims, membership: null, expectedIssuer: "issuer", expectedAudience: "aud", now: 20, consumedTokenIds: new Set() }).accepted).toBe(false));
});
