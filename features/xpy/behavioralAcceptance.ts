import { XPY_BEHAVIORAL_CAPABILITIES, type XpyBehavioralCapability, type XpyDomainPackRegistration } from "./contracts";

/** Domain-neutral fixture inventory. Packs declare support; adapters provide domain messages and assertions. */
export const XPY_BEHAVIORAL_ACCEPTANCE_MATRIX = Object.freeze([
  { id: "information-to-decision", capability: "INFORMATION_REENTRY" },
  { id: "alias-or-honest-clarification", capability: "REFERENCE_CLARIFICATION" },
  { id: "short-choice", capability: "SHORT_ANSWER" },
  { id: "multi-value", capability: "MULTI_VALUE_ANSWER" },
  { id: "correction-supersession", capability: "CORRECTION_SUPERSESSION" },
  { id: "explicit-rejection", capability: "EXPLICIT_REJECTION" },
  { id: "cross-turn-contradiction", capability: "CROSS_TURN_CONTRADICTION" },
  { id: "unknown-no-preference", capability: "UNKNOWN_NO_PREFERENCE" },
  { id: "material-filtering", capability: "MATERIAL_FILTERING" },
  { id: "no-effect-question-suppression", capability: "NO_EFFECT_SUPPRESSION" },
  { id: "revision-bound-counts", capability: "REVISION_BOUND_COUNTS" },
  { id: "no-false-single-winner", capability: "NO_FALSE_SINGLE_WINNER" },
  { id: "current-context-rationale", capability: "CURRENT_CONTEXT_RATIONALE" },
  { id: "authorization-before-card", capability: "AUTHORIZATION_BEFORE_CARD" },
  { id: "raw-key-exclusion", capability: "PUBLIC_VOCABULARY" },
  { id: "recovery-idempotency-revision", capability: "RECOVERY_IDEMPOTENCY" },
] satisfies readonly { readonly id: string; readonly capability: XpyBehavioralCapability }[]);

export function missingBehavioralCapabilities(pack: XpyDomainPackRegistration): readonly XpyBehavioralCapability[] {
  const declared = new Set(pack.capabilities.behavioralAcceptance);
  return XPY_BEHAVIORAL_CAPABILITIES.filter(capability => !declared.has(capability));
}

export interface XpyCategoryBehavioralAcceptanceRow {
  readonly departmentId: string;
  readonly categoryId: string;
  readonly capability: XpyBehavioralCapability;
  readonly fixtureId: string;
  readonly status: "DECLARED" | "GAP";
}

/**
 * The exhaustive registry-driven matrix. A category is never accepted merely
 * because it exists in a TypeScript union: every category/capability pair gets
 * a stable executable fixture identity consumed by the acceptance suite.
 */
export function buildCategoryBehavioralAcceptanceMatrix(
  packs: readonly XpyDomainPackRegistration[],
): readonly XpyCategoryBehavioralAcceptanceRow[] {
  return Object.freeze(packs.flatMap(pack => pack.categories.flatMap(categoryId =>
    XPY_BEHAVIORAL_ACCEPTANCE_MATRIX.map(({ id, capability }) => Object.freeze({
      departmentId: pack.departmentId,
      categoryId,
      capability,
      fixtureId: `${pack.departmentId}:${categoryId}:${id}`,
      status: pack.capabilities.behavioralAcceptance.includes(capability) ? "DECLARED" : "GAP",
    })),
  )));
}
