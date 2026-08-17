import type { ConstraintEvent } from "../domain/constraint";
import type { ActiveConstraintProjection, ActiveHardConstraint, ActiveNonHardConstraint, PipelineDiagnostic } from "./types";

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function hardAllowed(event: ConstraintEvent): boolean {
  if (event.decisionEffect !== "HARD_FILTER") return false;
  if (event.kind === "HARD_CONSTRAINT") return true;
  return event.kind === "CONFIRMED_FUNCTIONAL_PREFERENCE" && event.hardFilterPolicy?.allowed === true;
}

export function projectActiveConstraints(events: readonly ConstraintEvent[]): ActiveConstraintProjection {
  const diagnostics: PipelineDiagnostic[] = [];
  const ids = new Set<string>();
  for (const event of events) {
    if (ids.has(event.id)) diagnostics.push({ code: "DUPLICATE_CONSTRAINT_ID", referenceId: event.id, fieldId: event.field });
    ids.add(event.id);
  }
  const superseded = new Set(events.flatMap((event) => event.supersedesId ? [event.supersedesId] : []));
  const hard: ActiveHardConstraint[] = [];
  const nonHard: ActiveNonHardConstraint[] = [];
  const trace = events.map((event) => {
    const terminal = !superseded.has(event.id) && event.status === "ACTIVE";
    if (!terminal) return { eventId: event.id, terminal, appliedAs: "IGNORED" as const, reason: "NOT_ACTIVE_TERMINAL" };
    if (hardAllowed(event)) {
      const normalized = event.normalizedValue as { operator?: unknown; value?: unknown; unit?: unknown };
      hard.push({ constraintId: event.id, sourceEventId: event.id, fieldId: event.field, operator: typeof normalized?.operator === "string" ? normalized.operator : "", value: normalized?.value, unit: typeof normalized?.unit === "string" ? normalized.unit : undefined });
      return { eventId: event.id, terminal, appliedAs: "HARD" as const, reason: "ACTIVE_AUTHORIZED_HARD" };
    }
    if (event.decisionEffect !== "NONE" && event.kind !== "DECLINED" && event.kind !== "UNKNOWN") {
      nonHard.push({ constraintId: event.id, sourceEventId: event.id, fieldId: event.field, decisionEffect: event.decisionEffect, normalizedValue: event.normalizedValue });
      return { eventId: event.id, terminal, appliedAs: "NON_HARD" as const, reason: "NO_HARD_FILTER_AUTHORITY" };
    }
    return { eventId: event.id, terminal, appliedAs: "IGNORED" as const, reason: "NO_DECISION_EFFECT" };
  });
  const byKey = <T extends { fieldId: string; constraintId: string }>(values: T[]) => values.sort((a, b) => a.fieldId.localeCompare(b.fieldId) || a.constraintId.localeCompare(b.constraintId));
  return freeze({ activeHardConstraints: byKey(hard), activeNonHardConstraints: byKey(nonHard), supersessionTrace: trace.sort((a, b) => a.eventId.localeCompare(b.eventId)), diagnostics });
}
