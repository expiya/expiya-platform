import { randomUUID } from "node:crypto";
import type { AppliancesBudgetDecisionMode, AppliancesConversationState, AppliancesLedgerEvent, AppliancesRuntimeOutcome } from "./contracts";
import { projectActiveAppliancesContext } from "./context/projection";
import { deterministicPayloadHash } from "./persistence/service";
import type { AppliancesConversationStore } from "./persistence/types";
import { projectAppliancesBudgetStatus } from "./budgetPublic";

const enablePattern = /bütçe(?:mi|yi)?.*(?:karar filtresi|filtreye dahil|filtre olarak kullan)|bütçeme göre filtrele/iu;
const disablePattern = /bütçe(?:mi|yi)?.*(?:karardan çıkar|filtre(?:den|yi) kaldır)|ihtiyaç odaklı devam/iu;
const amountPattern = /(?:(?:kesin\s+)?(?:bütçe\s+)?üst\s+sınır(?:ım)?|bütçem(?:\s+en\s+fazla)?|en\s+fazla\s+bütçe(?:m)?)\s*(\d{1,9}(?:[ .]\d{3})?)\s*(bin)?\s*(?:tl|₺)?/iu;

export function budgetModeOf(state: AppliancesConversationState): AppliancesBudgetDecisionMode { return state.budgetMode ?? "NEEDS_ONLY"; }
export function isAppliancesBudgetControlMessage(message: string): boolean {
  if (enablePattern.test(message) || disablePattern.test(message)) return true;
  if (!amountPattern.test(message)) return false;
  return message.replace(amountPattern, "").replace(/[\s,.;:!?]/gu, "").length === 0;
}

export async function runAppliancesBudgetControlTurn(input: { store: AppliancesConversationStore; conversationId: string; messageId: string; expectedRevision: number; message: string; now?: Date; recompute?: (state:AppliancesConversationState)=>Promise<{state:AppliancesConversationState;outcome:AppliancesRuntimeOutcome}>|{state:AppliancesConversationState;outcome:AppliancesRuntimeOutcome} }) {
  const loaded = await input.store.load(input.conversationId); if (!loaded) return { status: "STATE_UNAVAILABLE" as const };
  const payloadHash = deterministicPayloadHash({ action: "TURN", conversationId: input.conversationId, messageId: input.messageId, expectedRevision: input.expectedRevision, message: input.message });
  const replay = loaded.messages[input.messageId];
  if (replay) return replay.payloadHash === payloadHash ? { status: "OK" as const, outcome: replay.outcome.publicOutcome!, state: loaded.state, replayed: true } : { status: "MESSAGE_PAYLOAD_CONFLICT" as const };
  if (loaded.state.revision !== input.expectedRevision) return { status: "REVISION_CONFLICT" as const };
  const prior = loaded.state, from = budgetModeOf(prior), to: AppliancesBudgetDecisionMode = disablePattern.test(input.message) ? "NEEDS_ONLY" : enablePattern.test(input.message) ? "BUDGET_AS_DECISION_FILTER" : from;
  const match = input.message.match(amountPattern), parsed = match ? Number(match[1].replace(/[ .]/gu, "")) * (match[2] ? 1000 : 1) : undefined;
  const amount = Number.isSafeInteger(parsed) && parsed! > 0 ? parsed : prior.budgetMetadata?.amountTry;
  const revision = prior.revision + 1, createdAt = (input.now ?? new Date()).toISOString();
  const ledger = [...prior.ledger], events: AppliancesLedgerEvent[] = [];
  const activeBudget = projectActiveAppliancesContext(ledger).get("BUDGET_SENSITIVITY");
  if (activeBudget && (amount !== prior.budgetMetadata?.amountTry || to !== from)) { const terminal: AppliancesLedgerEvent = { eventId: randomUUID(), conceptId: activeBudget.conceptId, normalizedValue: null, sourceMessageId: input.messageId, authority: "USER_EXPLICIT", strength: "HYPOTHESIS", status: "SUPERSEDED", decisionUse: "NONE", supersedesEventId: activeBudget.eventId, confirmationRequired: false, createdRevision: revision, createdAt }; ledger.push(terminal); events.push(terminal); }
  if (amount && (!activeBudget || amount !== prior.budgetMetadata?.amountTry || to !== from)) { const event: AppliancesLedgerEvent = { eventId: randomUUID(), conceptId: "BUDGET_SENSITIVITY", normalizedValue: { maximumTry: amount }, sourceMessageId: input.messageId, sourceSpan: match ? { start: match.index!, end: match.index! + match[0].length, text: match[0] } : undefined, authority: "USER_EXPLICIT", strength: to === "BUDGET_AS_DECISION_FILTER" ? "HARD" : "SOFT", status: "ACCEPTED_EXPLICIT", decisionUse: to === "BUDGET_AS_DECISION_FILTER" ? "HARD_FILTER" : "NONE", confirmationRequired: false, createdRevision: revision, createdAt }; ledger.push(event); events.push(event); }
  const budgetMetadata = amount ? { amountTry: amount, currency: "TRY" as const, provenance: match ? { sourceMessageId: input.messageId, sourceSpan: { start: match.index!, end: match.index! + match[0].length, text: match[0] }, authority: "USER_EXPLICIT" as const } : prior.budgetMetadata!.provenance, includedInDecision: to === "BUDGET_AS_DECISION_FILTER", priceSemantics: "FRESH_EXACT_PRICE_ONLY" as const } : undefined;
  let state: AppliancesConversationState = { ...prior, revision, budgetMode: to, budgetModeEvents: from === to ? prior.budgetModeEvents ?? [] : [...(prior.budgetModeEvents ?? []), { revision, from, to, authority: "USER_EXPLICIT", sourceMessageId: input.messageId, createdAt }], budgetMetadata, ledger, decisionRecord: undefined, currentDecisionFingerprint: undefined, updatedAt: createdAt };
  let outcome: AppliancesRuntimeOutcome = to === "BUDGET_AS_DECISION_FILTER" && !amount ? { kind: "ASK", questionKey: "appliances.budget.maximumTry", message: "Karar filtresinde kullanmam için aşmak istemediğin kesin bütçe üst sınırı kaç TL?", budget:projectAppliancesBudgetStatus(state) } : { kind: "RESPOND", responseKind: "SOCIAL_ACKNOWLEDGEMENT", message: to === "BUDGET_AS_DECISION_FILTER" ? `${amount!.toLocaleString("tr-TR")} TL kesin üst sınırı karar filtresine dahil edildi. Yalnız güncel ve doğrulanmış ürün fiyatları değerlendirilir; fiyatı bilinmeyen adaylar korunur.` : amount ? `${amount.toLocaleString("tr-TR")} TL bütçen bağlam ve kaynağıyla korundu; karar filtresinden çıkarıldı.` : "Bütçe karar filtresinden çıkarıldı; ihtiyaç odaklı devam ediyoruz.", conversationDisposition: "CONTINUE", contextMutation: "VALIDATED", contextRevision: revision, budget:projectAppliancesBudgetStatus(state) }; 
  if (!(to === "BUDGET_AS_DECISION_FILTER" && !amount) && input.recompute) { const recomputed=await input.recompute(state);state=recomputed.state;outcome=recomputed.outcome; }
  const saved = await input.store.commit({ expectedRevision: prior.revision, messageId: input.messageId, payloadHash, nextState: state, events, outcomeKind: "CONTEXT_MUTATED", publicOutcome: outcome });
  return saved.status === "OK" ? { status: "OK" as const, outcome: saved.outcome.publicOutcome!, state: saved.outcome.state, replayed: false } : { status: saved.status };
}
