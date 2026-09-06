import type { AppliancesConversationState, AppliancesLedgerEvent } from "./contracts";

export type LedgerMutation =
  | { readonly kind: "ACCEPT"; readonly event: AppliancesLedgerEvent }
  | { readonly kind: "SUPERSEDE"; readonly priorEventId: string; readonly event: AppliancesLedgerEvent }
  | { readonly kind: "CLEAR"; readonly priorEventId: string; readonly event: AppliancesLedgerEvent };
export type LedgerReductionResult = { readonly status: "OK"; readonly ledger: readonly AppliancesLedgerEvent[] } | { readonly status: "UNKNOWN_CONCEPT_ID" | "EVENT_NOT_FOUND" | "INVALID_TRANSITION" };
export function reduceAppliancesLedger(input: { readonly state: AppliancesConversationState; readonly mutation: LedgerMutation; readonly allowedConceptIds: ReadonlySet<string> }): LedgerReductionResult {
  const { mutation } = input; if (!input.allowedConceptIds.has(mutation.event.conceptId)) return { status: "UNKNOWN_CONCEPT_ID" }; if (mutation.event.createdRevision !== input.state.revision + 1) return { status: "INVALID_TRANSITION" };
  if (mutation.kind === "ACCEPT") { if (!["ACCEPTED_EXPLICIT", "ACCEPTED_CONFIRMED", "ACCEPTED_INTERPRETED", "PROPOSED"].includes(mutation.event.status)) return { status: "INVALID_TRANSITION" }; return { status: "OK", ledger: [...input.state.ledger, mutation.event] }; }
  const prior = input.state.ledger.find((event) => event.eventId === mutation.priorEventId); if (!prior) return { status: "EVENT_NOT_FOUND" }; if (mutation.event.conceptId !== prior.conceptId || mutation.event.supersedesEventId !== prior.eventId) return { status: "INVALID_TRANSITION" };
  const required = mutation.kind === "CLEAR" ? "CLEARED" : "SUPERSEDED"; if (mutation.event.status !== required) return { status: "INVALID_TRANSITION" }; return { status: "OK", ledger: [...input.state.ledger, mutation.event] };
}

