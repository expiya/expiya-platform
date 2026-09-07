import type { ExactOfferingIdentity, ProjectionScope, Uncertainty } from "./contract";

export type InheritancePurpose = "VOCABULARY" | "TEMPLATE" | "EXPLANATION" | "TECHNICAL_DECISION" | "Y_FINAL";

export interface InheritanceAssertion {
  readonly assertionId: string;
  readonly factId: string;
  readonly scope: ProjectionScope;
  readonly scopeIdentityId: string;
  readonly market: string;
  readonly value: string | number | boolean | readonly string[];
  readonly uncertainty: Uncertainty;
  readonly explicitlyAppliesToExactOfferingIds: readonly string[];
  readonly identityBridge?: {
    readonly bridgeId: string;
    readonly exactOfferingId: string;
    readonly verified: boolean;
  };
}
export interface InheritanceResolution {
  readonly status: "RESOLVED" | "UNKNOWN" | "BLOCKED_BY_CONFLICT" | "EXPLANATION_TEMPLATE_ONLY";
  readonly uncertainty: Uncertainty;
  readonly value: InheritanceAssertion["value"] | null;
  readonly sourceAssertionId: string | null;
  readonly decisionAuthority: "NONE" | "HARD_AND_Y_FINAL";
  readonly blockedAssertionIds: readonly string[];
  readonly reasonCodes: readonly string[];
}

const scopeRank: Readonly<Record<ProjectionScope, number>> = Object.freeze({ CLASS: 0, FAMILY: 1, MODEL: 2, VARIANT: 3, EXACT_OFFERING: 4 });
const classPurposes = new Set<InheritancePurpose>(["VOCABULARY", "TEMPLATE", "EXPLANATION"]);

function identityMatches(assertion: InheritanceAssertion, target: ExactOfferingIdentity): boolean {
  if (assertion.scope === "CLASS") return assertion.scopeIdentityId === target.classId;
  if (assertion.scope === "FAMILY") return assertion.scopeIdentityId === target.familyId;
  if (assertion.scope === "MODEL") return assertion.scopeIdentityId === target.modelId;
  if (assertion.scope === "VARIANT") return assertion.scopeIdentityId === target.variantId;
  return assertion.scopeIdentityId === target.exactOfferingId;
}

function applicabilityReason(assertion: InheritanceAssertion, target: ExactOfferingIdentity, purpose: InheritancePurpose): string | null {
  if (!identityMatches(assertion, target)) return "SCOPE_IDENTITY_MISMATCH";
  if (assertion.market !== target.market) return "FOREIGN_MARKET_NOT_TARGET_TECHNICAL_TRUTH";
  if (assertion.scope === "CLASS" && !classPurposes.has(purpose)) return "CLASS_ONLY_VOCABULARY_TEMPLATE_EXPLANATION";
  if (["FAMILY", "MODEL"].includes(assertion.scope)) {
    if (!assertion.explicitlyAppliesToExactOfferingIds.includes(target.exactOfferingId)) return "EXPLICIT_APPLICABILITY_MISSING";
    if (!assertion.identityBridge?.verified || assertion.identityBridge.exactOfferingId !== target.exactOfferingId) return "VERIFIED_IDENTITY_BRIDGE_MISSING";
  }
  if (["VARIANT", "EXACT_OFFERING"].includes(assertion.scope) && !assertion.explicitlyAppliesToExactOfferingIds.includes(target.exactOfferingId)) {
    return "EXACT_APPLICABILITY_MISSING";
  }
  return null;
}

export function resolveProjectionInheritance(input: {
  readonly target: ExactOfferingIdentity;
  readonly factId: string;
  readonly purpose: InheritancePurpose;
  readonly assertions: readonly InheritanceAssertion[];
}): InheritanceResolution {
  const relevant = input.assertions.filter((assertion) => assertion.factId === input.factId);
  const reasonCodes = new Set<string>();
  const applicable: InheritanceAssertion[] = [];
  for (const assertion of relevant) {
    const reason = applicabilityReason(assertion, input.target, input.purpose);
    if (reason) reasonCodes.add(reason); else applicable.push(assertion);
  }
  applicable.sort((left, right) => scopeRank[right.scope] - scopeRank[left.scope] || left.assertionId.localeCompare(right.assertionId));
  const mostSpecific = applicable[0];
  if (!mostSpecific) return Object.freeze({ status: "UNKNOWN", uncertainty: "UNKNOWN", value: null, sourceAssertionId: null, decisionAuthority: "NONE", blockedAssertionIds: Object.freeze([]), reasonCodes: Object.freeze([...reasonCodes].sort()) });
  if (mostSpecific.uncertainty === "CONFLICTED") {
    const blocked = applicable.filter((assertion) => scopeRank[assertion.scope] < scopeRank[mostSpecific.scope]).map((assertion) => assertion.assertionId).sort();
    return Object.freeze({ status: "BLOCKED_BY_CONFLICT", uncertainty: "CONFLICTED", value: null, sourceAssertionId: mostSpecific.assertionId, decisionAuthority: "NONE", blockedAssertionIds: Object.freeze(blocked), reasonCodes: Object.freeze(["MORE_SPECIFIC_CONFLICT_BLOCKS_PARENT_INHERITANCE", ...[...reasonCodes].sort()]) });
  }
  if (mostSpecific.scope === "CLASS") {
    return Object.freeze({ status: "EXPLANATION_TEMPLATE_ONLY", uncertainty: mostSpecific.uncertainty, value: mostSpecific.value, sourceAssertionId: mostSpecific.assertionId, decisionAuthority: "NONE", blockedAssertionIds: Object.freeze([]), reasonCodes: Object.freeze(["CLASS_AUTHORITY_NON_TECHNICAL_ONLY", ...[...reasonCodes].sort()]) });
  }
  const finalScope = mostSpecific.scope === "VARIANT" || mostSpecific.scope === "EXACT_OFFERING";
  const technicalPurpose = input.purpose === "TECHNICAL_DECISION" || input.purpose === "Y_FINAL";
  return Object.freeze({
    status: "RESOLVED",
    uncertainty: mostSpecific.uncertainty,
    value: mostSpecific.value,
    sourceAssertionId: mostSpecific.assertionId,
    decisionAuthority: finalScope && technicalPurpose && mostSpecific.uncertainty === "KNOWN" ? "HARD_AND_Y_FINAL" : "NONE",
    blockedAssertionIds: Object.freeze([]),
    reasonCodes: Object.freeze([finalScope ? "VARIANT_OR_EXACT_FINAL_SCOPE" : "EXPLICIT_APPLICABILITY_AND_IDENTITY_BRIDGE_VERIFIED", ...[...reasonCodes].sort()]),
  });
}
