import type { DealerRole } from "./contracts";

export interface VerifiedPartnerSessionClaims {
  readonly source: "VERIFIED_IDENTITY_PROVIDER";
  readonly tenantId: string;
  readonly actorId: string;
  readonly role: DealerRole;
  readonly branchIds: readonly string[];
  readonly mfaVerified: boolean;
  readonly sessionExpiresAt: string;
}

export interface TransactionLocalSetting {
  readonly statement: "select set_config($1, $2, true)";
  readonly parameters: readonly [string, string];
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function buildTransactionLocalContext(claims: VerifiedPartnerSessionClaims, nowIso: string): readonly TransactionLocalSetting[] {
  if (claims.source !== "VERIFIED_IDENTITY_PROVIDER") throw new Error("UNVERIFIED_SESSION_SOURCE");
  if (!claims.mfaVerified) throw new Error("MFA_REQUIRED");
  const expiresAt = Date.parse(claims.sessionExpiresAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(now)) throw new Error("INVALID_SESSION_TIME");
  if (expiresAt <= now) throw new Error("SESSION_EXPIRED");
  if (!uuidPattern.test(claims.tenantId) || !uuidPattern.test(claims.actorId) || claims.branchIds.some(id => !uuidPattern.test(id))) throw new Error("INVALID_SESSION_IDENTIFIER");
  return Object.freeze([
    { statement: "select set_config($1, $2, true)", parameters: ["app.tenant_id", claims.tenantId] },
    { statement: "select set_config($1, $2, true)", parameters: ["app.actor_id", claims.actorId] },
    { statement: "select set_config($1, $2, true)", parameters: ["app.actor_role", claims.role] },
    { statement: "select set_config($1, $2, true)", parameters: ["app.branch_ids", JSON.stringify(claims.branchIds)] },
  ]);
}

export function contextIsTransactionLocal(settings: readonly TransactionLocalSetting[]): boolean {
  return settings.length === 4 && settings.every(setting => setting.statement.endsWith("true)"));
}
