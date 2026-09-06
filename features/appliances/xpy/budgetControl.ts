import { randomUUID } from "node:crypto";
import type { AppliancesBudgetDecisionMode, AppliancesConversationState, AppliancesLedgerEvent, AppliancesRuntimeOutcome } from "../contracts";
import { projectActiveAppliancesContext } from "../context/projection";
import { projectAppliancesBudgetStatus } from "../budgetPublic";

const enablePattern = /bütçe(?:mi|yi)?.*(?:karar filtresi|filtreye dahil|filtre olarak kullan)|bütçeme göre filtrele/iu;
const disablePattern = /bütçe(?:mi|yi)?.*(?:karardan çıkar|filtre(?:den|yi) kaldır)|ihtiyaç odaklı devam/iu;
const clearPattern = /bütçe(?:mi|yi)?\s+(?:sil|temizle|unut)|bütçe tutar(?:ını|ı)\s+kaldır/iu;
const amountPattern = /(?:(?:kesin\s+)?(?:bütçe\s+)?üst\s+sınır(?:ım)?|bütçem(?:\s+en\s+fazla)?|en\s+fazla\s+bütçe(?:m)?)\s*(\d{1,9}(?:[ .]\d{3})?)\s*(bin)?\s*(?:tl|₺)?/iu;

export type BudgetProposal = { readonly kind: "NONE" } | { readonly kind: "CONTROL"; readonly mode?: AppliancesBudgetDecisionMode; readonly amountTry?: number; readonly clearAmount: boolean; readonly sourceSpan?: { readonly start: number; readonly end: number; readonly text: string } };

export function proposeBudgetControl(message: string): BudgetProposal {
  const match = message.match(amountPattern);
  const raw = match ? Number(match[1].replace(/[ .]/gu, "")) * (match[2] ? 1000 : 1) : undefined;
  const amountTry = Number.isSafeInteger(raw) && raw! > 0 ? raw : undefined;
  const mode = disablePattern.test(message) ? "NEEDS_ONLY" : enablePattern.test(message) ? "BUDGET_AS_DECISION_FILTER" : undefined;
  const clearAmount = clearPattern.test(message);
  const amountOnly = !!match && message.replace(amountPattern, "").replace(/[\s,.;:!?]/gu, "").length === 0;
  // A budget amount embedded in a broader needs answer belongs to the normal
  // category proposal set so the other needs are reduced in the same turn.
  if (amountTry && !mode && !clearAmount && !amountOnly) return { kind: "NONE" };
  if (!mode && !amountTry && !clearAmount) return { kind: "NONE" };
  return { kind: "CONTROL", mode, amountTry, clearAmount, ...(match ? { sourceSpan: { start: match.index!, end: match.index! + match[0].length, text: match[0] } } : {}) };
}

export type BudgetReduction = { readonly state: AppliancesConversationState; readonly events: readonly AppliancesLedgerEvent[]; readonly terminalOutcome?: AppliancesRuntimeOutcome };

export function reduceBudgetControl(input: { readonly state: AppliancesConversationState; readonly proposal: Extract<BudgetProposal, { kind: "CONTROL" }>; readonly messageId: string; readonly createdAt: string }): BudgetReduction {
  const prior = input.state, from = prior.budgetMode ?? "NEEDS_ONLY", to = input.proposal.mode ?? from;
  const amount = input.proposal.clearAmount ? undefined : input.proposal.amountTry ?? prior.budgetMetadata?.amountTry;
  const revision = prior.revision + 1, ledger = [...prior.ledger], events: AppliancesLedgerEvent[] = [];
  const active = projectActiveAppliancesContext(ledger).get("BUDGET_SENSITIVITY");
  if (active && (input.proposal.clearAmount || amount !== prior.budgetMetadata?.amountTry || to !== from)) {
    const event: AppliancesLedgerEvent = { eventId: randomUUID(), conceptId: active.conceptId, normalizedValue: null, sourceMessageId: input.messageId, authority: "USER_EXPLICIT", strength: "HYPOTHESIS", status: input.proposal.clearAmount ? "CLEARED" : "SUPERSEDED", decisionUse: "NONE", supersedesEventId: active.eventId, confirmationRequired: false, createdRevision: revision, createdAt: input.createdAt };
    ledger.push(event); events.push(event);
  }
  if (amount && (!active || amount !== prior.budgetMetadata?.amountTry || to !== from)) {
    const event: AppliancesLedgerEvent = { eventId: randomUUID(), conceptId: "BUDGET_SENSITIVITY", normalizedValue: { maximumTry: amount }, sourceMessageId: input.messageId, ...(input.proposal.sourceSpan ? { sourceSpan: input.proposal.sourceSpan } : {}), authority: "USER_EXPLICIT", strength: to === "BUDGET_AS_DECISION_FILTER" ? "HARD" : "SOFT", status: "ACCEPTED_EXPLICIT", decisionUse: to === "BUDGET_AS_DECISION_FILTER" ? "HARD_FILTER" : "NONE", confirmationRequired: false, createdRevision: revision, createdAt: input.createdAt };
    ledger.push(event); events.push(event);
  }
  const budgetMetadata = amount ? { amountTry: amount, currency: "TRY" as const, provenance: input.proposal.sourceSpan ? { sourceMessageId: input.messageId, sourceSpan: input.proposal.sourceSpan, authority: "USER_EXPLICIT" as const } : prior.budgetMetadata!.provenance, includedInDecision: to === "BUDGET_AS_DECISION_FILTER", priceSemantics: "FRESH_EXACT_PRICE_ONLY" as const } : undefined;
  const state: AppliancesConversationState = { ...prior, revision, budgetMode: to, budgetModeEvents: from === to ? prior.budgetModeEvents ?? [] : [...(prior.budgetModeEvents ?? []), { revision, from, to, authority: "USER_EXPLICIT", sourceMessageId: input.messageId, createdAt: input.createdAt }], budgetMetadata, ledger, decisionRecord: undefined, currentDecisionFingerprint: undefined, updatedAt: input.createdAt };
  if (to === "BUDGET_AS_DECISION_FILTER" && !amount) return { state, events, terminalOutcome: { kind: "ASK", questionKey: "appliances.budget.maximumTry", message: "Karar filtresinde kullanmam için aşmak istemediğin kesin bütçe üst sınırı kaç TL?", budget: projectAppliancesBudgetStatus(state) } };
  return { state, events };
}
