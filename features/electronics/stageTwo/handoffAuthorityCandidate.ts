import { createHash } from "node:crypto";
import { ELECTRONICS_CATEGORY_IDS, ELECTRONICS_CATEGORY_REGISTRY, type ElectronicsCategoryId } from "../architectureBaseline";

export const ELECTRONICS_STAGE_TWO_HANDOFF_VERSION = "electronics-stage2-handoff/v1-candidate" as const;
export const ELECTRONICS_STAGE_TWO_CONSENT_VERSION = "electronics-stage2-consent/v1-candidate" as const;
export const ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMA_VERSION = "electronics-stage2-comparison-schema/v1-candidate" as const;
export const ELECTRONICS_STAGE_TWO_REPLAY_POLICY = "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY" as const;

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
export const electronicsStageTwoDigest = (value: unknown): `sha256:${string}` => `sha256:${createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`;

export const ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS = Object.freeze(Object.fromEntries(ELECTRONICS_CATEGORY_REGISTRY.map(category => {
  const payload = { schemaVersion: ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMA_VERSION, categoryId: category.categoryId, candidateRowKeys: [...category.categoryPolicyRequired], authority: "EXISTING_CATEGORY_POLICY_KEYS_ONLY", lifecycle: "PENDING_OWNER_APPROVAL" } as const;
  return [category.categoryId, Object.freeze({ ...payload, digest: electronicsStageTwoDigest(payload) })];
})) as Readonly<Record<ElectronicsCategoryId, { readonly schemaVersion: typeof ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMA_VERSION; readonly categoryId: ElectronicsCategoryId; readonly candidateRowKeys: readonly string[]; readonly authority: "EXISTING_CATEGORY_POLICY_KEYS_ONLY"; readonly lifecycle: "PENDING_OWNER_APPROVAL"; readonly digest: `sha256:${string}` }>>);

export interface ElectronicsStageTwoConsentEvent {
  readonly schemaVersion: typeof ELECTRONICS_STAGE_TWO_CONSENT_VERSION;
  readonly eventId: string;
  readonly status: "CONSENTED";
  readonly purpose: "OPEN_STAGE_TWO_EXACT_PRODUCT_EVALUATION";
  readonly conversationId: string;
  readonly categoryId: ElectronicsCategoryId;
  readonly decisionRevision: number;
  readonly decisionFingerprint: string;
  readonly exactProductId: string;
  readonly configurationIdentity: string;
  readonly occurredAt: string;
}

export interface ElectronicsStageTwoCurrentAuthority {
  readonly conversationId: string;
  readonly categoryId: ElectronicsCategoryId;
  readonly decisionRevision: number;
  readonly decisionFingerprint: string;
  readonly exactProductId: string;
  readonly configurationIdentity: string;
  readonly catalogRelease: string;
  readonly catalogDigest: string;
  readonly policyVersion: string;
  readonly policyDigest: string;
  readonly consent: ElectronicsStageTwoConsentEvent;
}

export interface ElectronicsStageTwoHandoffClaims extends Omit<ElectronicsStageTwoCurrentAuthority, "consent"> {
  readonly version: typeof ELECTRONICS_STAGE_TWO_HANDOFF_VERSION;
  readonly kid: string;
  readonly purpose: "ASAMA2_VIEW";
  readonly departmentId: "ELECTRONICS";
  readonly consentEventId: string;
  readonly consentOccurredAt: string;
  readonly comparisonSchemaVersion: typeof ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMA_VERSION;
  readonly comparisonSchemaDigest: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly nonce: string;
  readonly replayPolicy: typeof ELECTRONICS_STAGE_TWO_REPLAY_POLICY;
}

export const ELECTRONICS_STAGE_TWO_AUTHORITY_CANDIDATE = Object.freeze({
  authorityVersion: ELECTRONICS_STAGE_TWO_HANDOFF_VERSION,
  departmentId: "ELECTRONICS" as const,
  categories: ELECTRONICS_CATEGORY_IDS,
  consentVersion: ELECTRONICS_STAGE_TWO_CONSENT_VERSION,
  comparisonSchemaVersion: ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMA_VERSION,
  keyLifecycle: Object.freeze({ active: "SIGN_AND_VERIFY", verifyOnly: "VERIFY_DURING_ROTATION", revoked: "REJECT", rollback: "RESTORE_PRIOR_KEY_AS_ACTIVE_ONLY_BY_SEPARATE_ENV_CHANGE_AND_AUDIT" }),
  activation: "OWNER_APPROVAL_AND_PERSISTENCE_REQUIRED" as const,
});

export function validateElectronicsStageTwoBinding(claims: ElectronicsStageTwoHandoffClaims, current: ElectronicsStageTwoCurrentAuthority, now = new Date()): readonly string[] {
  const issues: string[] = [], schema = ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS[current.categoryId];
  if (claims.version !== ELECTRONICS_STAGE_TWO_HANDOFF_VERSION || claims.departmentId !== "ELECTRONICS" || claims.purpose !== "ASAMA2_VIEW" || claims.replayPolicy !== ELECTRONICS_STAGE_TWO_REPLAY_POLICY) issues.push("HANDOFF_PROTOCOL_INVALID");
  if (!ELECTRONICS_CATEGORY_IDS.includes(claims.categoryId) || claims.categoryId !== current.categoryId || claims.comparisonSchemaVersion !== schema.schemaVersion || claims.comparisonSchemaDigest !== schema.digest) issues.push("CATEGORY_AUTHORITY_MISMATCH");
  if (claims.conversationId !== current.conversationId || claims.decisionRevision !== current.decisionRevision || claims.decisionFingerprint !== current.decisionFingerprint || claims.exactProductId !== current.exactProductId || claims.configurationIdentity !== current.configurationIdentity) issues.push("DECISION_IDENTITY_MISMATCH");
  if (claims.catalogRelease !== current.catalogRelease || claims.catalogDigest !== current.catalogDigest || claims.policyVersion !== current.policyVersion || claims.policyDigest !== current.policyDigest) issues.push("EVIDENCE_AUTHORITY_MISMATCH");
  const consent = current.consent;
  if (consent.schemaVersion !== ELECTRONICS_STAGE_TWO_CONSENT_VERSION || consent.status !== "CONSENTED" || consent.purpose !== "OPEN_STAGE_TWO_EXACT_PRODUCT_EVALUATION" || claims.consentEventId !== consent.eventId || claims.consentOccurredAt !== consent.occurredAt || consent.conversationId !== current.conversationId || consent.categoryId !== current.categoryId || consent.decisionRevision !== current.decisionRevision || consent.decisionFingerprint !== current.decisionFingerprint || consent.exactProductId !== current.exactProductId || consent.configurationIdentity !== current.configurationIdentity) issues.push("CONSENT_MISMATCH");
  const issued = claims.issuedAt * 1000, expires = claims.expiresAt * 1000, consentTime = Date.parse(consent.occurredAt);
  if (!Number.isFinite(consentTime) || consentTime > issued || issued > now.getTime() + 30_000 || expires - issued < 60_000 || expires - issued > 3_600_000 || expires <= now.getTime()) issues.push("TIME_AUTHORITY_INVALID");
  return Object.freeze(issues);
}
