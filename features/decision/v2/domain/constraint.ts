export type ConstraintKind =
  | "HARD_CONSTRAINT"
  | "CONFIRMED_FUNCTIONAL_PREFERENCE"
  | "GUIDED_APPROXIMATION"
  | "SOFT_PREFERENCE"
  | "PERSONA_PREFERENCE"
  | "ILLUSTRATIVE_SIGNAL"
  | "UNKNOWN"
  | "DECLINED";

export type DecisionEffect = "HARD_FILTER" | "STRONG_RANK" | "SOFT_RANK" | "EXPLANATION_ONLY" | "NONE";
export type ConstraintAuthority = "USER_EXPLICIT" | "USER_CONFIRMED" | "OWNER_EDITORIAL" | "VERSIONED_PRODUCT_POLICY";
export type ConstraintEventStatus = "ACTIVE" | "DECLINED" | "SUPERSEDED";

export interface HardFilterPolicyPermission {
  readonly allowed: true;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly fieldAuthority: "CATALOG_VERIFIED" | "OWNER_EDITORIAL_DECISION_SAFE";
}

export interface ConstraintEvent extends ConversationEventBase {
  readonly eventType: "CONSTRAINT";
  readonly kind: ConstraintKind;
  readonly field: string;
  readonly normalizedValue: unknown;
  readonly sourceText: string;
  readonly confidence: number;
  readonly authority: ConstraintAuthority;
  readonly decisionEffect: DecisionEffect;
  readonly status: ConstraintEventStatus;
  readonly supersedesId?: string;
  readonly supersededById?: string;
  readonly hardFilterPolicy?: HardFilterPolicyPermission;
}

function deepFreeze<T>(value: T, visited = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (visited.has(object)) return value;
  visited.add(object);
  for (const child of Object.values(object)) deepFreeze(child, visited);
  return Object.freeze(value);
}

export function createConstraintEvent(event: ConstraintEvent): Readonly<ConstraintEvent> {
  return deepFreeze(structuredClone(event));
}
import type { ConversationEventBase } from "./conversationEvent";
