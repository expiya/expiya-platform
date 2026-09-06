import { z } from "zod";

export const XPY_STAGE_THREE_CONTRACT_VERSION = "xpy-stage-three-entry/v1" as const;
export const XPY_STAGE_THREE_PURPOSE = "PREPARE_AUTHORIZED_POST_EVALUATION_ACTION" as const;
export const XPY_STAGE_THREE_MAX_LIFETIME_SECONDS = 30 * 60;

export const xpyStageThreeAuthorityBindingSchema = z.strictObject({
  version: z.literal(XPY_STAGE_THREE_CONTRACT_VERSION),
  purpose: z.literal(XPY_STAGE_THREE_PURPOSE),
  sourceStage: z.literal("STAGE_2_EVALUATION"),
  departmentId: z.string().min(1).max(80),
  categoryId: z.string().min(1).max(120),
  conversationId: z.string().min(1).max(200),
  decisionRevision: z.number().int().positive(),
  decisionFingerprint: z.string().min(1).max(200),
  exactProductId: z.string().min(1).max(300),
  configurationIdentity: z.string().min(1).max(500),
  evidence: z.strictObject({ release: z.string().min(1).max(160), fingerprint: z.string().min(1).max(200) }),
  parentStageTwoDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  intendedAction: z.string().min(1).max(120),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  replayPolicy: z.literal("REVISION_BOUND_REUSABLE_UNTIL_EXPIRY"),
  externalExecutionAuthorized: z.literal(false),
});

export type XpyStageThreeAuthorityBinding = z.infer<typeof xpyStageThreeAuthorityBindingSchema>;
export type XpyStageThreeAuthorityExpectation = Pick<XpyStageThreeAuthorityBinding,
  "departmentId" | "categoryId" | "conversationId" | "decisionRevision" | "decisionFingerprint" |
  "exactProductId" | "configurationIdentity" | "intendedAction" | "parentStageTwoDigest"
> & { readonly evidence: XpyStageThreeAuthorityBinding["evidence"] };

export type XpyStageThreeEntryFailure =
  | "MALFORMED" | "EXPIRED" | "NOT_YET_VALID" | "INVALID_LIFETIME"
  | "CROSS_DOMAIN" | "CROSS_CATEGORY" | "CROSS_CONVERSATION" | "STALE_REVISION"
  | "CROSS_DECISION" | "CROSS_PRODUCT" | "CROSS_CONFIGURATION" | "EVIDENCE_MISMATCH"
  | "PARENT_HANDOFF_MISMATCH" | "ACTION_MISMATCH";

export type XpyStageThreeEntryResult =
  | { readonly status: "AUTHORIZED"; readonly binding: XpyStageThreeAuthorityBinding }
  | { readonly status: "REJECTED"; readonly reason: XpyStageThreeEntryFailure };

export function createXpyStageThreeAuthorityBinding(input: XpyStageThreeAuthorityExpectation & { readonly issuedAt: Date; readonly expiresAt: Date }): XpyStageThreeAuthorityBinding {
  return xpyStageThreeAuthorityBindingSchema.parse({ ...input, version: XPY_STAGE_THREE_CONTRACT_VERSION, purpose: XPY_STAGE_THREE_PURPOSE, sourceStage: "STAGE_2_EVALUATION", issuedAt: input.issuedAt.toISOString(), expiresAt: input.expiresAt.toISOString(), replayPolicy: "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY", externalExecutionAuthorized: false });
}

export function validateXpyStageThreeEntry(value: unknown, expected: XpyStageThreeAuthorityExpectation, now = new Date()): XpyStageThreeEntryResult {
  const parsed = xpyStageThreeAuthorityBindingSchema.safeParse(value);
  if (!parsed.success) return { status: "REJECTED", reason: "MALFORMED" };
  const binding = parsed.data;
  const issuedAt = Date.parse(binding.issuedAt); const expiresAt = Date.parse(binding.expiresAt); const current = now.getTime();
  if (expiresAt <= current) return { status: "REJECTED", reason: "EXPIRED" };
  if (issuedAt > current + 30_000) return { status: "REJECTED", reason: "NOT_YET_VALID" };
  if (expiresAt <= issuedAt || expiresAt - issuedAt > XPY_STAGE_THREE_MAX_LIFETIME_SECONDS * 1_000) return { status: "REJECTED", reason: "INVALID_LIFETIME" };
  const checks: readonly [boolean, XpyStageThreeEntryFailure][] = [
    [binding.departmentId === expected.departmentId, "CROSS_DOMAIN"],
    [binding.categoryId === expected.categoryId, "CROSS_CATEGORY"],
    [binding.conversationId === expected.conversationId, "CROSS_CONVERSATION"],
    [binding.decisionRevision === expected.decisionRevision, "STALE_REVISION"],
    [binding.decisionFingerprint === expected.decisionFingerprint, "CROSS_DECISION"],
    [binding.exactProductId === expected.exactProductId, "CROSS_PRODUCT"],
    [binding.configurationIdentity === expected.configurationIdentity, "CROSS_CONFIGURATION"],
    [binding.evidence.release === expected.evidence.release && binding.evidence.fingerprint === expected.evidence.fingerprint, "EVIDENCE_MISMATCH"],
    [binding.parentStageTwoDigest === expected.parentStageTwoDigest, "PARENT_HANDOFF_MISMATCH"],
    [binding.intendedAction === expected.intendedAction, "ACTION_MISMATCH"],
  ];
  const failed = checks.find(([matches]) => !matches);
  return failed ? { status: "REJECTED", reason: failed[1] } : { status: "AUTHORIZED", binding };
}

export type XpyStageThreeExternalCapability = "REQUEST_CAPTURE" | "CURRENT_OFFER" | "AUTHORIZED_SELLER" | "PAYMENT" | "ORDER" | "FULFILLMENT";
export type XpyStageThreeCapabilityState = "INTERNAL_REVIEW_ONLY" | "VERIFIED" | "UNAVAILABLE";
export interface XpyStageThreeCapability { readonly capability: XpyStageThreeExternalCapability; readonly state: XpyStageThreeCapabilityState; readonly publicLabel: string; readonly explanation: string; }

export interface XpyStageThreePresentationAdapter {
  readonly adapterId: string;
  readonly departmentId: "CARS" | "APPLIANCES";
  readonly departmentLabel: string;
  readonly productNoun: string;
  readonly unavailableTitle: string;
  readonly unavailableDescription: string;
  readonly capabilities: readonly XpyStageThreeCapability[];
}

export function defineXpyStageThreePresentationAdapter(adapter: XpyStageThreePresentationAdapter): XpyStageThreePresentationAdapter { return Object.freeze({ ...adapter, capabilities: Object.freeze(adapter.capabilities) }); }
