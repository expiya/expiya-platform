import { randomUUID } from "node:crypto";
import type { AppliancesAuthoritySnapshot } from "../authority/types";
import type { AppliancesConversationState, AppliancesLedgerEvent, AppliancesRuntimeOutcome } from "../contracts";
import { deterministicPayloadHash } from "../persistence/service";
import type { AppliancesConversationStore } from "../persistence/types";
import { interpretAppliancesTurn, type AppliancesSemanticProposal } from "./interpretation";
import { deriveAppliancesPersonaSignals, projectActiveAppliancesContext } from "./projection";
import { validateAppliancesProposalSet } from "./validation";
import { isUnboundShortAnswer, pendingAnswerPolarity } from "../conversation/pendingAnswer";
import { executeValidatedTurn } from "../../conversation-kernel/executeValidatedTurn";
import { renderDomainReentry } from "@/features/xpy/assistant";
import { requireXpyReentry } from "@/features/xpy/domainPacks";
import { appliancesXInterruption } from "../xpyAssistant";
import { appliancesRuntimeBinding } from "../xpyRuntime";

export type RunAppliancesTurnResult =
  | { readonly status: "OK"; readonly outcome: AppliancesRuntimeOutcome; readonly state: AppliancesConversationState; readonly replayed: boolean }
  | { readonly status: "REVISION_CONFLICT" | "MESSAGE_PAYLOAD_CONFLICT" | "STATE_UNAVAILABLE" | "AUTHORITY_MISMATCH" | "INTEGRITY_FAILURE" };

const decisionUseFor = (conceptId: string): AppliancesLedgerEvent["decisionUse"] =>
  conceptId === "BUDGET_SENSITIVITY" || conceptId === "INSTALLATION_FIT"
    ? "HARD_FILTER"
    : ["LOAD_CONSOLIDATION", "LOW_LAUNDRY_VOLUME"].includes(conceptId) ? "QUESTION_INPUT" : "SOFT_RANK";
const strengthFor = (conceptId: string): AppliancesLedgerEvent["strength"] => {
  const use = decisionUseFor(conceptId);
  return use === "HARD_FILTER" ? "HARD" : use === "QUESTION_INPUT" ? "HYPOTHESIS" : "STRONG";
};
const isNegativePreference = (value: unknown) => value === false || value === "NOT_IMPORTANT" || (typeof value === "object" && value !== null && "wanted" in value && (value as { wanted?: unknown }).wanted === false);

function realize(route: string, message: string): string {
  if (route === "DOMAIN_INFORMATION_REQUEST") {
    if (/1400\s*devir/iu.test(message)) return "1400 devir, ulaşılabilen sıkma hızını belirtir; her 1200 devirli makineden mutlaka daha kuru sonuç garantilemez.";
    if (/enerji sınıfı/iu.test(message)) return "Enerji sınıfı A, aynı ölçüm rejimindeki standart enerji verisini açıklar; ev faturası garantisi değildir.";
    if (/auto-?dose|otomatik dozaj/iu.test(message)) return "Otomatik dozaj, elle deterjan ölçme ihtiyacını azaltabilir; tasarruf garantisi değildir.";
    return "Buhar, üreticinin tanımladığı bir işlevdir; tek başına hijyen, sterilizasyon veya anti-alerji sonucu kanıtlamaz.";
  }
  if (route === "OFF_TOPIC") return renderDomainReentry(requireXpyReentry("APPLIANCES", "WASHING_MACHINE"));
  if (route === "SAFETY") return "Elektrik, tesisat veya cihaz içi onarımı kendin yapma; enerjiyi güvenli biçimde kesip yetkili servis ya da nitelikli uzmandan destek al.";
  if (route === "USER_CLOSING") return "Elbette, burada kapatalım.";
  if (route === "SOCIAL") return "Rica ederim; mevcut çamaşır makinesi karar bağlamını koruyorum.";
  return "Paylaştığın bilgiyi doğrulanmış karar bağlamına ekledim.";
}
function respond(route: string, revision: number, mutated: boolean, message: string): AppliancesRuntimeOutcome {
  const responseKind = route === "DOMAIN_INFORMATION_REQUEST" ? "DOMAIN_INFORMATION" : route === "OFF_TOPIC" ? "OFF_TOPIC_REDIRECT" : route === "SAFETY" ? "SAFETY_BOUNDARY" : route === "USER_CLOSING" ? "USER_CLOSING" : "SOCIAL_ACKNOWLEDGEMENT";
  return { kind: "RESPOND", responseKind, message: realize(route, message), conversationDisposition: route === "USER_CLOSING" ? "END" : "CONTINUE", contextMutation: mutated ? "VALIDATED" : "NONE", contextRevision: revision };
}
function terminalEvent(input: { prior: AppliancesLedgerEvent; status: "SUPERSEDED" | "CLEARED" | "REJECTED"; messageId: string; message: string; revision: number; createdAt: string }): AppliancesLedgerEvent {
  return { eventId: randomUUID(), conceptId: input.prior.conceptId, normalizedValue: null, sourceMessageId: input.messageId, sourceSpan: { start: 0, end: input.message.length, text: input.message }, authority: "USER_EXPLICIT", strength: "HYPOTHESIS", status: input.status, decisionUse: "NONE", supersedesEventId: input.prior.eventId, confirmationRequired: false, createdRevision: input.revision, createdAt: input.createdAt };
}
async function commitTurn(input: { store: AppliancesConversationStore; prior: AppliancesConversationState; messageId: string; payloadHash: string; nextState: AppliancesConversationState; events: readonly AppliancesLedgerEvent[]; outcome: AppliancesRuntimeOutcome }): Promise<RunAppliancesTurnResult> {
  const committed = await input.store.commit({ expectedRevision: input.prior.revision, messageId: input.messageId, payloadHash: input.payloadHash, nextState: input.nextState, events: input.events, outcomeKind: "CONTEXT_MUTATED", publicOutcome: input.outcome });
  return committed.status === "OK" ? { status: "OK", outcome: committed.outcome.publicOutcome ?? input.outcome, state: committed.outcome.state, replayed: false } : { status: committed.status };
}

export async function runAppliancesContextTurn(input: { store: AppliancesConversationStore; authority: AppliancesAuthoritySnapshot; conversationId: string; messageId: string; expectedRevision: number; message: string; now?: Date }): Promise<RunAppliancesTurnResult> {
  const payload = { action: "TURN", conversationId: input.conversationId, messageId: input.messageId, expectedRevision: input.expectedRevision, message: input.message };
  const payloadHash = deterministicPayloadHash(payload);
  return executeValidatedTurn<AppliancesConversationState,AppliancesSemanticProposal,AppliancesLedgerEvent,AppliancesRuntimeOutcome,RunAppliancesTurnResult>({runtime:appliancesRuntimeBinding("WASHING_MACHINE"),expectedRevision:input.expectedRevision,messageId:input.messageId,payloadFingerprint:payloadHash,
  withoutDecision:state=>appliancesXInterruption(state,input.messageId,input.message,input.now),
  load:async()=>{const loaded=await input.store.load(input.conversationId);if(!loaded)return null;const replay=loaded.messages[input.messageId];return{state:loaded.state,...(replay?.outcome.publicOutcome?{replay:{payloadFingerprint:replay.payloadHash,outcome:replay.outcome.publicOutcome,state:replay.outcome.state}}:{})};},authorityMatches:prior=>prior.pinnedCatalogRelease===input.authority.releaseVersion&&prior.pinnedCatalogDigest===input.authority.catalogDigest&&prior.pinnedSemanticDigest===input.authority.semanticDigest,propose:prior=>interpretAppliancesTurn(input.message,input.messageId,prior.lastQuestionKey).proposals,validate:proposals=>{if(proposals.some(proposal=>!input.authority.conceptIds.has(proposal.conceptId)))return{kind:"INVALID"};const validation=validateAppliancesProposalSet(proposals);return validation.status==="VALID"?{kind:"VALID",proposals:validation.accepted}:{kind:"INVALID"};},reduce:(prior,_validatedProposals)=>{
  void _validatedProposals;

  const polarity = pendingAnswerPolarity(input.message);
  const genericYes = polarity === "YES";
  const genericNo = polarity === "NO";
  if ((genericYes || genericNo) && prior.pendingConfirmation) {
    const pending = prior.pendingConfirmation;
    if (!pending) return { status: "OK", outcome: { kind: "CLARIFY", message: "Neyi onayladığını veya reddettiğini açıklar mısın?", questionKey: "UNBOUND_CONFIRMATION" }, state: prior, replayed: false };
    if (pending.expiresAfterRevision < prior.revision) return { status: "OK", outcome: { kind: "CLARIFY", message: "Bu onay artık geçerli değil; neyi kastettiğini açıklar mısın?", questionKey: "STALE_CONFIRMATION" }, state: prior, replayed: false };
    const proposed = prior.ledger.find((event) => event.eventId === pending.eventId && event.status === "PROPOSED");
    if (!proposed || !input.authority.conceptIds.has(pending.conceptId)) return { status: "INTEGRITY_FAILURE" };
    const revision = prior.revision + 1, createdAt = (input.now ?? new Date()).toISOString();
    const event: AppliancesLedgerEvent = genericYes
      ? { ...proposed, eventId: randomUUID(), sourceMessageId: input.messageId, sourceSpan: { start: 0, end: input.message.length, text: input.message }, authority: "USER_CONFIRMED", status: "ACCEPTED_CONFIRMED", decisionUse: decisionUseFor(proposed.conceptId), supersedesEventId: proposed.eventId, confirmationRequired: false, createdRevision: revision, createdAt }
      : terminalEvent({ prior: proposed, status: "REJECTED", messageId: input.messageId, message: input.message, revision, createdAt });
    const ledger = [...prior.ledger, event];
    const outcome = respond("SOCIAL", revision, true, input.message);
    const nextState = { ...prior, revision, ledger, pendingConfirmation: undefined, personaSignals: deriveAppliancesPersonaSignals(ledger), updatedAt: createdAt } satisfies AppliancesConversationState;
    return {state:nextState,events:[event],outcome};
  }

  const interpreted = interpretAppliancesTurn(input.message, input.messageId, prior.lastQuestionKey);
  if (isUnboundShortAnswer(input.message) && interpreted.proposals.length === 0) return prior.lastQuestionKey
    ? { status: "OK", outcome: { kind: "CLARIFY", message: "Evet yanıtını bu soruya bağladım; uygulanacak sınırı veya istediğin seçeneği açıkça belirtir misin?", questionKey: prior.lastQuestionKey }, state: prior, replayed: false }
    : { status: "OK", outcome: { kind: "CLARIFY", message: "Bu yanıtı bağlayebileceğim açık bir soru yok. Neyi onayladığını, istediğini veya reddettiğini belirtir misin?", questionKey: "UNBOUND_CONFIRMATION" }, state: prior, replayed: false };
  if (interpreted.route === "UNSUPPORTED") return interpreted.unsupportedProductType === "DRYER" || interpreted.unsupportedProductType === "REFRIGERATOR"
    ? { status: "OK", outcome: { kind: "CLARIFY", questionKey: "PRODUCT_TYPE_CHANGE", message: `Bu konuşma çamaşır makinesi için açıldı. ${interpreted.unsupportedProductType === "DRYER" ? "Kurutma makinesi" : "Buzdolabı"} için yeni bir ${interpreted.unsupportedProductType} konuşması başlatmalısın.` }, state: prior, replayed: false }
    : { status: "OK", outcome: { kind: "UNSUPPORTED", departmentId: "APPLIANCES", productType: interpreted.unsupportedProductType! }, state: prior, replayed: false };
  if (interpreted.ambiguousCorrection) return { status: "OK", outcome: { kind: "CLARIFY", message: "Hangi bilgiyi değiştirmek istediğini açıklar mısın?", questionKey: "AMBIGUOUS_CORRECTION" }, state: prior, replayed: false };
  if (interpreted.proposals.some((proposal) => !input.authority.conceptIds.has(proposal.conceptId))) return { status: "INTEGRITY_FAILURE" };
  const validation = validateAppliancesProposalSet(interpreted.proposals);
  if (validation.status === "INCONSISTENT_SET") return { status: "OK", outcome: { kind: "CLARIFY", message: "Aynı bilgi için çelişen değerler var; hangisini kullanmalıyım?", questionKey: `INCONSISTENT_SET:${validation.conceptId}` }, state: prior, replayed: false };
  const confirmables = validation.accepted.filter((proposal) => proposal.confirmationRequired);
  if (confirmables.length > 1) return { status: "OK", outcome: { kind: "CLARIFY", message: "Birden fazla yorum gerektiren nokta var; hangisini önce doğrulayalım?", questionKey: "MULTIPLE_CONFIRMATIONS" }, state: prior, replayed: false };

  const revision = prior.revision + 1, createdAt = (input.now ?? new Date()).toISOString();
  const ledger = [...prior.ledger];
  const appended: AppliancesLedgerEvent[] = [];
  let pendingConfirmation = prior.pendingConfirmation;
  for (const original of validation.accepted) {
    let proposal = original;
    const active = projectActiveAppliancesContext(ledger).get(proposal.conceptId);
    if (active && proposal.conceptId === "INSTALLATION_FIT" && proposal.kind !== "CLEAR") {
      const old = active.normalizedValue as Record<string, unknown>, next = proposal.normalizedValue as Record<string, unknown>;
      const conflict = Object.entries(next).some(([key, value]) => old[key] !== undefined && old[key] !== value);
      if (!conflict || proposal.kind === "CORRECT") proposal = { ...proposal, kind: "CORRECT", normalizedValue: { ...old, ...next } };
    }
    const pendingEvent = pendingConfirmation?.conceptId === proposal.conceptId ? ledger.find((event) => event.eventId === pendingConfirmation?.eventId) : undefined;
    if (proposal.kind === "CORRECT" && !active) return { status: "INTEGRITY_FAILURE" };
    if (proposal.kind === "CLEAR" && !active && !pendingEvent) continue;
    if (active && proposal.kind === "SET" && JSON.stringify(active.normalizedValue) !== JSON.stringify(proposal.normalizedValue)) return { status: "OK", outcome: { kind: "CLARIFY", message: "Bu bilgi daha önce farklı kaydedilmiş. Bunun bir düzeltme olduğunu açıkça belirtir misin?", questionKey: `CONTRADICTION:${proposal.conceptId}` }, state: prior, replayed: false };
    if (pendingEvent) { const invalidated = terminalEvent({ prior: pendingEvent, status: proposal.kind === "CLEAR" ? "CLEARED" : "SUPERSEDED", messageId: input.messageId, message: input.message, revision, createdAt }); ledger.push(invalidated); appended.push(invalidated); pendingConfirmation = undefined; }
    if (active) { const terminal = terminalEvent({ prior: active, status: proposal.kind === "CLEAR" ? "CLEARED" : "SUPERSEDED", messageId: input.messageId, message: input.message, revision, createdAt }); ledger.push(terminal); appended.push(terminal); }
    if (proposal.kind !== "CLEAR") {
      const status = proposal.confirmationRequired ? "PROPOSED" : proposal.interpretationAuthority === "EXPLICIT_USER_STATEMENT" ? "ACCEPTED_EXPLICIT" : "ACCEPTED_INTERPRETED";
      const explicitBudgetFilterAnswer = proposal.conceptId === "BUDGET_SENSITIVITY" && (prior.lastQuestionKey === "appliances.wm.budget.maximumTry" || /bütçe(?:mi|yi)?.*(?:karar filtresi|filtreye dahil|filtre olarak kullan)|bütçeme göre filtrele/iu.test(input.message));
      const decisionUse = proposal.conceptId === "BUDGET_SENSITIVITY" ? (explicitBudgetFilterAnswer ? "HARD_FILTER" : "NONE") : decisionUseFor(proposal.conceptId);
      const event: AppliancesLedgerEvent = { eventId: randomUUID(), conceptId: proposal.conceptId, normalizedValue: proposal.normalizedValue, sourceMessageId: input.messageId, ...(proposal.sourceSpan ? { sourceSpan: proposal.sourceSpan } : {}), authority: proposal.interpretationAuthority === "EXPLICIT_USER_STATEMENT" ? "USER_EXPLICIT" : "DOMAIN_INTERPRETATION", strength: status === "PROPOSED" ? strengthFor(proposal.conceptId) : decisionUse === "HARD_FILTER" ? "HARD" : proposal.conceptId === "BUDGET_SENSITIVITY" ? "SOFT" : strengthFor(proposal.conceptId), status, decisionUse: status === "PROPOSED" || isNegativePreference(proposal.normalizedValue) ? "NONE" : decisionUse, confirmationRequired: proposal.confirmationRequired, createdRevision: revision, createdAt };
      ledger.push(event); appended.push(event);
      if (status === "PROPOSED") pendingConfirmation = { eventId: event.eventId, conceptId: event.conceptId, normalizedValue: event.normalizedValue, sourceMessageId: event.sourceMessageId, createdRevision: revision, expiresAfterRevision: revision + 2, question: "Bunu bir tercih olarak kaydetmemi ister misin?" };
    }
  }
  const mutated = appended.length > 0 || interpreted.route === "USER_CLOSING";
  const outcome = respond(interpreted.route, revision, appended.length > 0, input.message);
  const contextualBudget = appended.find((event) => event.conceptId === "BUDGET_SENSITIVITY" && event.decisionUse === "HARD_FILTER");
  const maximumTry = (contextualBudget?.normalizedValue as { maximumTry?: unknown } | undefined)?.maximumTry;
  const affordability = /(?:ekonomik|hesaplı|uygun fiyatlı|mümkün olduğunca ucuz)/iu.test(input.message);
  const reopenedDeferrals = typeof maximumTry === "number" ? (prior.questionDeferrals ?? []).map((item) => item.questionKey === "appliances.wm.budget.maximumTry" && item.status === "ACTIVE" ? { ...item, status: "REOPENED" as const } : item) : prior.questionDeferrals;
  const nextState = { ...prior, revision, ledger, pendingConfirmation, questionDeferrals: reopenedDeferrals, ...(affordability ? { planningSignals: [...(prior.planningSignals ?? []), { kind: "SOFT_AFFORDABILITY" as const, sourceMessageId: input.messageId, sourceText: input.message, decisionUse: "NONE" as const }] } : {}), ...(typeof maximumTry === "number" ? { budgetMode: "BUDGET_AS_DECISION_FILTER" as const, budgetMetadata: { amountTry: maximumTry, currency: "TRY" as const, provenance: { sourceMessageId: input.messageId, ...(contextualBudget?.sourceSpan ? { sourceSpan: contextualBudget.sourceSpan } : {}), authority: "USER_EXPLICIT" as const }, includedInDecision: true, priceSemantics: "FRESH_EXACT_PRICE_ONLY" as const }, budgetModeEvents: [...(prior.budgetModeEvents ?? []), { revision, from: prior.budgetMode ?? "NEEDS_ONLY", to: "BUDGET_AS_DECISION_FILTER" as const, authority: "USER_EXPLICIT" as const, sourceMessageId: input.messageId, createdAt }] } : {}), personaSignals: deriveAppliancesPersonaSignals(ledger), ended: interpreted.route === "USER_CLOSING" || prior.ended, intentState: interpreted.route === "USER_CLOSING" ? "ENDED_WITHOUT_DECISION" as const : prior.intentState, updatedAt: createdAt } satisfies AppliancesConversationState;
  if (!mutated && validation.rejectedProposalIds.length > 0) return { status: "OK", outcome: { kind: "CLARIFY", message: "Verdiğin değeri güvenli biçimde doğrulayamadım; daha açık paylaşır mısın?", questionKey: "INVALID_VALUE" }, state: prior, replayed: false };
  return {state:nextState,events:appended,outcome};},isResult:value=>typeof value==="object"&&value!==null&&"status" in value,commit:update=>commitTurn({store:input.store,prior:{...update.state,revision:update.expectedRevision},messageId:update.messageId,payloadHash:update.payloadFingerprint,nextState:update.state,events:update.events,outcome:update.outcome}),unavailable:()=>({status:"STATE_UNAVAILABLE"}),payloadConflict:()=>({status:"MESSAGE_PAYLOAD_CONFLICT"}),revisionConflict:()=>({status:"REVISION_CONFLICT"}),authorityMismatch:()=>({status:"AUTHORITY_MISMATCH"}),invalid:()=>({status:"INTEGRITY_FAILURE"}),replay:stored=>({status:"OK",outcome:stored.outcome,state:stored.state,replayed:true})});
}
