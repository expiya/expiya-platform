import { createHash } from "node:crypto";
import type {
  EquipmentEvidenceAssertion,
  EquipmentOwnerApprovalEvent,
  EquipmentReviewEvent,
  EquipmentTrimVariantLink,
  EquipmentVerificationMaterialization,
  EquipmentVerifiedTrimLinkMaterialization,
} from "@/types/equipmentEvidence";

export const EQUIPMENT_VERIFICATION_POLICY_VERSION = "1.0.0";
export const EQUIPMENT_PILOT_DECISION_AUTHORITY = "SHADOW_AND_EXPLANATION_DISABLED" as const;

export function canonicalJson(value: unknown): string {
  const sort = (item: unknown): unknown => Array.isArray(item) ? item.map(sort) : item && typeof item === "object"
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sort(child)])) : item;
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

export function fingerprint(value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function terminalIds<T extends { assertionId?: string; linkId?: string; supersedesAssertionId?: string; supersedesTrimLinkId?: string }>(items: readonly T[]) {
  const superseded = new Set(items.flatMap((item) => [item.supersedesAssertionId, item.supersedesTrimLinkId].filter(Boolean) as string[]));
  return new Set(items.map((item) => item.assertionId ?? item.linkId ?? "").filter((id) => id && !superseded.has(id)));
}

export function selectTerminalSecondReviewed(input: {
  assertions: readonly EquipmentEvidenceAssertion[];
  trimLinks: readonly EquipmentTrimVariantLink[];
  reviewEvents: readonly EquipmentReviewEvent[];
}) {
  const assertionTerminals = terminalIds(input.assertions);
  const linkTerminals = terminalIds(input.trimLinks);
  const passed = new Map(input.reviewEvents.filter((event) => event.toState === "SECOND_REVIEW_PASSED")
    .map((event) => [`${event.subjectType}:${event.subjectId}`, event]));
  return {
    assertions: input.assertions.filter((item) => assertionTerminals.has(item.assertionId)
      && passed.has(`ASSERTION:${item.assertionId}`)).sort((a, b) => a.assertionId.localeCompare(b.assertionId)),
    trimLinks: input.trimLinks.filter((item) => linkTerminals.has(item.linkId)
      && passed.has(`TRIM_LINK:${item.linkId}`)).sort((a, b) => a.linkId.localeCompare(b.linkId)),
    passed,
  };
}

export function validateOwnerApproval(input: {
  approval: EquipmentOwnerApprovalEvent;
  subject: EquipmentEvidenceAssertion | EquipmentTrimVariantLink;
  passedReview: EquipmentReviewEvent | undefined;
  verifiedOwnerActorIds: ReadonlySet<string>;
  forbiddenActorIds: ReadonlySet<string>;
}): string[] {
  const issues: string[] = [];
  const subjectId = "assertionId" in input.subject ? input.subject.assertionId : input.subject.linkId;
  if (input.approval.actorRole !== "EQUIPMENT_OWNER_APPROVER" || !input.verifiedOwnerActorIds.has(input.approval.actorInstanceId)) issues.push("OWNER_GOVERNANCE_ACTOR_UNAVAILABLE");
  if (input.forbiddenActorIds.has(input.approval.actorInstanceId)) issues.push("OWNER_ACTOR_ROLE_SEPARATION_VIOLATION");
  if (!input.passedReview || input.passedReview.toState !== "SECOND_REVIEW_PASSED" || input.approval.passedSecondReviewEventId !== input.passedReview.reviewEventId) issues.push("SECOND_REVIEW_PASSED_REQUIRED");
  if (input.approval.subjectId !== subjectId) issues.push("OWNER_APPROVAL_SUBJECT_MISMATCH");
  if (input.approval.inputFingerprint !== fingerprint(input.subject)) issues.push("OWNER_APPROVAL_INPUT_FINGERPRINT_MISMATCH");
  return issues;
}

export function materializeAssertion(input: {
  assertion: EquipmentEvidenceAssertion;
  chain: readonly string[];
  passedReview: EquipmentReviewEvent | undefined;
  approval: EquipmentOwnerApprovalEvent | undefined;
  verifiedOwnerActorIds: ReadonlySet<string>;
  forbiddenActorIds: ReadonlySet<string>;
  catalogVariantIds: ReadonlySet<string>;
  catalogFingerprint: `sha256:${string}`;
  materializedAt: string;
}): { materialization?: EquipmentVerificationMaterialization; issues: string[] } {
  const issues: string[] = [];
  const assertion = input.assertion;
  if (!input.passedReview) issues.push("SECOND_REVIEW_PASSED_REQUIRED");
  if (!input.approval) issues.push("OWNER_APPROVAL_REQUIRED");
  if (assertion.conflictState !== "CLEAR") issues.push("CONFLICT_ASSERTION_NOT_MATERIALIZABLE");
  if (assertion.availabilityStatus === "UNKNOWN") issues.push("UNKNOWN_NOT_MATERIALIZABLE");
  if (assertion.sourceApplicability !== "EXACT_VARIANT" || !assertion.exactVariantId) issues.push("EXACT_VARIANT_APPLICABILITY_REQUIRED");
  if (assertion.exactVariantId && !input.catalogVariantIds.has(assertion.exactVariantId)) issues.push("CATALOG_VARIANT_NOT_ELIGIBLE");
  if (assertion.market !== "TR" || assertion.modelYearFrom === undefined || assertion.modelYearTo === undefined) issues.push("TEMPORAL_MARKET_APPLICABILITY_REQUIRED");
  if (input.approval) issues.push(...validateOwnerApproval({ approval: input.approval, subject: assertion, passedReview: input.passedReview,
    verifiedOwnerActorIds: input.verifiedOwnerActorIds, forbiddenActorIds: input.forbiddenActorIds }));
  if (issues.length) return { issues: [...new Set(issues)].sort() };
  return { issues, materialization: {
    materializationId: `EE-MAT-${fingerprint({ assertionId: assertion.assertionId, policy: EQUIPMENT_VERIFICATION_POLICY_VERSION }).slice(7, 27).toUpperCase()}`,
    sourceAssertionId: assertion.assertionId, exactVariantId: assertion.exactVariantId!, featureCode: assertion.featureCode,
    terminalSupersessionChain: [...input.chain], passedSecondReviewEventId: input.passedReview!.reviewEventId,
    ownerApprovalEventId: input.approval!.approvalEventId, availabilityStatus: assertion.availabilityStatus,
    standardOrOptional: assertion.availabilityStatus as EquipmentVerificationMaterialization["standardOrOptional"], marketApplicability: "TR",
    modelYearApplicability: { from: assertion.modelYearFrom!, to: assertion.modelYearTo! }, source: assertion.source,
    derivedArtifact: assertion.derivedArtifact, confidence: assertion.confidence, verificationState: "VERIFIED",
    materializedAt: input.materializedAt, policyVersion: EQUIPMENT_VERIFICATION_POLICY_VERSION,
    catalogRelease: "v0.55.2", catalogFingerprint: input.catalogFingerprint,
  } };
}

export function assertUniqueActiveMaterializations(items: readonly EquipmentVerificationMaterialization[]): string[] {
  const seen = new Set<string>();
  const issues: string[] = [];
  for (const item of items) {
    if (seen.has(item.sourceAssertionId)) issues.push("DUPLICATE_ACTIVE_MATERIALIZATION");
    seen.add(item.sourceAssertionId);
  }
  return issues;
}

export function assertUniqueOwnerApprovalEvents(items: readonly { subjectType: string; subjectId: string }[]): string[] {
  const seen = new Set<string>(), issues: string[] = [];
  for (const item of items) {
    const key = `${item.subjectType}:${item.subjectId}`;
    if (seen.has(key)) issues.push("DUPLICATE_OWNER_APPROVAL_EVENT");
    seen.add(key);
  }
  return issues;
}

export type { EquipmentVerifiedTrimLinkMaterialization };
