/** Domain-neutral, read-only AŞAMA 2 protocol. Product meaning remains Domain Pack-owned. */
export const XPY_STAGE_TWO_PROTOCOL_VERSION = "xpy-stage2/v1" as const;

export type StageTwoEvidenceState = "VERIFIED" | "SCOPED" | "REPRESENTATIVE" | "UNKNOWN";
export type StageTwoMediaState = "VERIFIED" | "UNAVAILABLE" | "RESTRICTED";
export type StageTwoPriceState = "VERIFIED" | "OBSERVED" | "UNAVAILABLE";

export interface XpyStageTwoAuthorityBinding {
  readonly protocolVersion: typeof XPY_STAGE_TWO_PROTOCOL_VERSION;
  readonly handoffAuthorityVersion: string;
  readonly departmentId: string;
  readonly categoryId: string;
  readonly conversationId: string;
  readonly decisionRevision: number;
  readonly decisionFingerprint: string;
  readonly exactProductId: string;
  readonly configurationIdentity: string;
  readonly evidence: { readonly release: string; readonly fingerprint: string };
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly replayPolicy: "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY";
}

export interface XpyStageTwoCurrentAuthority {
  readonly departmentId: string;
  readonly categoryId: string;
  readonly conversationId: string;
  readonly decisionRevision: number;
  readonly decisionFingerprint: string;
  readonly exactProductId: string;
  readonly configurationIdentity: string;
  readonly evidence: { readonly release: string; readonly fingerprint: string };
}

export interface XpyStageTwoFact {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly evidenceState: StageTwoEvidenceState;
  readonly dailyMeaning?: string;
  readonly limitation?: string;
  readonly sourceLabel?: string;
}

export interface XpyStageTwoProductPresentation {
  readonly exactProductId: string;
  readonly configurationIdentity: string;
  readonly title: string;
  readonly media: { readonly state: StageTwoMediaState; readonly src?: string; readonly alt: string; readonly disclosure: string };
  readonly facts: readonly XpyStageTwoFact[];
  readonly capabilities: readonly string[];
  readonly limitations: readonly string[];
  readonly price: { readonly state: StageTwoPriceState; readonly display: string; readonly note: string };
}

export type XpyStageTwoComparisonEntitlement =
  | { readonly status: "NOT_PURCHASED" | "REVOKED" | "EXPIRED" }
  | { readonly status: "PURCHASED"; readonly entitlementId: string; readonly authorizedExactProductIds: readonly string[]; readonly evidenceSetFingerprint: string };

export interface XpyStageTwoComparisonRow {
  readonly key: string;
  readonly label: string;
  readonly values: readonly { readonly exactProductId: string; readonly value: string; readonly evidenceState: StageTwoEvidenceState }[];
}

export interface XpyStageTwoProjection {
  readonly schemaVersion: "xpy-stage2-projection/v1";
  readonly authority: XpyStageTwoAuthorityBinding;
  readonly selected: XpyStageTwoProductPresentation;
  readonly comparison: {
    readonly access: "LOCKED" | "ENTITLED";
    readonly offerPlacement: "AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR";
    readonly products: readonly XpyStageTwoProductPresentation[];
    /** Rows are emitted by the category adapter; the shared renderer never invents them. */
    readonly rows: readonly XpyStageTwoComparisonRow[];
  };
  readonly boundaries: {
    readonly canReopenStageOneSelection: false;
    readonly canAddUnentitledProducts: false;
    readonly salesActionsActive: false;
    readonly stageThreeActive: false;
  };
}

export interface XpyStageTwoAdvisorAnswer { readonly status: "ANSWERED" | "REFUSED" | "UNKNOWN"; readonly message: string }

export interface XpyStageTwoDomainAdapter<Opened = unknown> {
  readonly adapterVersion: string;
  readonly departmentId: string;
  readonly categories: readonly string[];
  readonly handoffAuthorityVersions: readonly string[];
  readonly projectionSchemaVersions: readonly string[];
  readonly comparisonRowsOwnedBy: "CATEGORY_DOMAIN_PACK";
  readonly openSignedHandoff: (handoff: string, now?: Date) => Promise<Opened>;
  readonly project: (opened: Opened, entitlement: XpyStageTwoComparisonEntitlement) => XpyStageTwoProjection;
  readonly answer: (projection: XpyStageTwoProjection, question: string) => XpyStageTwoAdvisorAnswer;
}

export type XpyStageTwoEntryResult =
  | { readonly status: "AUTHORIZED"; readonly authority: XpyStageTwoAuthorityBinding }
  | { readonly status: "FAILED_CLOSED"; readonly reason: "INVALID_TIME" | "EXPIRED" | "FUTURE_ISSUE" | "AUTHORITY_MISMATCH" | "INVALID_BINDING" };

const same = (left: XpyStageTwoAuthorityBinding, right: XpyStageTwoCurrentAuthority) =>
  left.departmentId === right.departmentId && left.categoryId === right.categoryId && left.conversationId === right.conversationId &&
  left.decisionRevision === right.decisionRevision && left.decisionFingerprint === right.decisionFingerprint &&
  left.exactProductId === right.exactProductId && left.configurationIdentity === right.configurationIdentity &&
  left.evidence.release === right.evidence.release && left.evidence.fingerprint === right.evidence.fingerprint;

/** Signature verification happens in the domain adapter before this revision/current-authority check. */
export function validateXpyStageTwoEntry(binding: XpyStageTwoAuthorityBinding, current: XpyStageTwoCurrentAuthority, now = new Date()): XpyStageTwoEntryResult {
  if (binding.protocolVersion !== XPY_STAGE_TWO_PROTOCOL_VERSION || binding.replayPolicy !== "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY" || binding.decisionRevision < 1 || !binding.handoffAuthorityVersion || !binding.decisionFingerprint || !binding.exactProductId || !binding.configurationIdentity || !binding.evidence.release || !binding.evidence.fingerprint) return { status: "FAILED_CLOSED", reason: "INVALID_BINDING" };
  const issued = Date.parse(binding.issuedAt), expires = Date.parse(binding.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued) return { status: "FAILED_CLOSED", reason: "INVALID_TIME" };
  if (expires <= now.getTime()) return { status: "FAILED_CLOSED", reason: "EXPIRED" };
  if (issued > now.getTime() + 60_000) return { status: "FAILED_CLOSED", reason: "FUTURE_ISSUE" };
  if (!same(binding, current)) return { status: "FAILED_CLOSED", reason: "AUTHORITY_MISMATCH" };
  return { status: "AUTHORIZED", authority: binding };
}
