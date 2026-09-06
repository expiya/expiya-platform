export const opsAuthenticationBoundary = Object.freeze({
  productionAuthenticationEnabled: false as const,
  issuer: "https://identity.expiya.com/ops",
  audience: "urn:expiya:ops",
  cookieName: "__Host-expiya_ops_session",
  cookieDomain: null,
  cookiePath: "/",
  cookieSecure: true as const,
  cookieHttpOnly: true as const,
  cookieSameSite: "strict" as const,
  idleTimeoutSeconds: 15 * 60,
  absoluteTimeoutSeconds: 8 * 60 * 60,
  rotationSeconds: 10 * 60,
  mandatoryMfa: true as const,
  phishingResistantMfaForCriticalActions: true as const,
});

export const opsMfaPolicy = Object.freeze({
  primary: "PASSKEY" as const,
  backup: "HARDWARE_SECURITY_KEY" as const,
  recovery: "TOTP" as const,
  forbidden: ["SMS", "EMAIL_OTP"] as const,
  enrollmentRequiresTwoPhishingResistantCredentials: true as const,
  recoveryRequiresSecurityReview: true as const,
  criticalActionFreshnessSeconds: 5 * 60,
});

export type OpsMfaMethod = "PASSKEY" | "HARDWARE_SECURITY_KEY" | "TOTP" | "SMS" | "EMAIL_OTP";
export function evaluateOpsMfa(input:{readonly method:OpsMfaMethod;readonly verifiedAt:number;readonly now:number;readonly critical:boolean}) {
  if (opsMfaPolicy.forbidden.includes(input.method as "SMS"|"EMAIL_OTP")) return {allowed:false as const,reason:"METHOD_FORBIDDEN" as const};
  if (input.critical && input.method === "TOTP") return {allowed:false as const,reason:"PHISHING_RESISTANT_METHOD_REQUIRED" as const};
  if (input.critical && input.now >= input.verifiedAt + opsMfaPolicy.criticalActionFreshnessSeconds) return {allowed:false as const,reason:"STEP_UP_STALE" as const};
  return {allowed:true as const,assurance:"AAL2" as const};
}

export const syntheticPlatformOwner = Object.freeze({
  actorId:"ops-owner-synthetic-001",
  displayName:"Serdar Akgül",
  role:"SUPER_ADMIN" as const,
  soleUserAndRoleAdministrator:true as const,
  productionAccountCreated:false as const,
});

export interface OpsTokenClaims { readonly issuer:string; readonly audience:string; readonly subjectId:string; readonly expiresAt:number; readonly assurance:"AAL1"|"AAL2"; readonly tokenRoleClaims:readonly string[] }
export interface AuthoritativeOpsIdentity { readonly subjectId:string; readonly active:boolean; readonly authzVersion:number; readonly roles:readonly string[] }

export function authenticateOpsPrincipal(input:{readonly claims:OpsTokenClaims;readonly authoritative:AuthoritativeOpsIdentity;readonly now:number}) {
  if (input.claims.issuer !== opsAuthenticationBoundary.issuer) return { accepted:false as const, reason:"ISSUER_MISMATCH" as const };
  if (input.claims.audience !== opsAuthenticationBoundary.audience) return { accepted:false as const, reason:"AUDIENCE_MISMATCH" as const };
  if (input.claims.subjectId !== input.authoritative.subjectId || !input.authoritative.active) return { accepted:false as const, reason:"AUTHORITATIVE_IDENTITY_REJECTED" as const };
  if (input.claims.expiresAt <= input.now) return { accepted:false as const, reason:"EXPIRED" as const };
  if (input.claims.assurance !== "AAL2") return { accepted:false as const, reason:"MFA_REQUIRED" as const };
  return { accepted:true as const, roles:input.authoritative.roles, ignoredTokenRoleClaims:true as const };
}
