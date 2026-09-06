import { interpretPlatformAssistant } from "@/features/xpy/assistant";
import { requireXpyReentry } from "@/features/xpy/domainPacks";
import type { AppliancesConversationState, AppliancesLedgerEvent, AppliancesRuntimeOutcome } from "./contracts";
import { detectXpyAdvisoryIntent } from "@/features/xpy/advisory";
import { appliancesAdvisoryPlan, appliancesInformationAnswer } from "./advisory";
import { appliancesChoices } from "./questionPack";
import { recordAskedQuestion } from "@/features/conversation-kernel/lifecycle";

/** Shared Appliances X adapter. A RESPOND mutation advances revision but never decision context. */
export function appliancesXInterruption(state: AppliancesConversationState, messageId: string, message: string, now = new Date()): { readonly state: AppliancesConversationState; readonly events: readonly AppliancesLedgerEvent[]; readonly outcome: AppliancesRuntimeOutcome } | undefined {
  if (state.lastQuestionKey === "xpy.advisory.purchaseInterest") {
    const revision = state.revision + 1;
    const revised = { ...state, revision, updatedAt: now.toISOString(), lastQuestionKey: undefined };
    const plan = appliancesAdvisoryPlan(state.productType);
    if (/yalnızca bilgi|sadece bilgi|şimdilik bilgi/iu.test(message)) return { state: revised, events: [], outcome: { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message: `Elbette. ${plan.invitation}`, conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision } };
    if (/ürün seçmek|kendi kullanımım|seçime geç|seçmek istiyorum/iu.test(message)) return { state: recordAskedQuestion(revised, plan.questionKey), events: [], outcome: { kind: "ASK", questionKey: plan.questionKey, message: plan.question } };
  }
  const assistant = interpretPlatformAssistant(message, Boolean(state.lastQuestionKey), requireXpyReentry("APPLIANCES", state.productType));
  const advisoryIntent = detectXpyAdvisoryIntent(message);
  if (advisoryIntent) {
    const revision = state.revision + 1;
    const plan = appliancesAdvisoryPlan(state.productType);
    const revised = { ...state, revision, updatedAt: now.toISOString() };
    if (advisoryIntent.kind !== "NOVICE_GUIDANCE" && !advisoryIntent.activeBuying) return { state: revised, events: [], outcome: { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message: `${appliancesInformationAnswer(state.productType, message)} ${state.lastQuestionKey ? plan.invitation : plan.intentQuestion}`, conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision, ...(state.lastQuestionKey ? { resumeQuestionKey: state.lastQuestionKey } : {}) } };
    if (advisoryIntent.kind === "NOVICE_GUIDANCE" && !advisoryIntent.activeBuying && !state.lastQuestionKey) return { state: recordAskedQuestion(revised, "xpy.advisory.purchaseInterest"), events: [], outcome: { kind: "ASK", questionKey: "xpy.advisory.purchaseInterest", message: plan.intentQuestion, advisory: plan.advisory } };
    const currentChoices = appliancesChoices(state.lastQuestionKey);
    const questionKey = currentChoices?.questionKey ?? plan.questionKey;
    const question = currentChoices?.prompt ?? plan.question;
    return { state: state.lastQuestionKey ? revised : recordAskedQuestion(revised, questionKey), events: [], outcome: { kind: "ASK", questionKey, message: question, advisory: plan.advisory } };
  }
  if (assistant.intent !== "OFF_TOPIC" || !assistant.directResponse) return undefined;
  const revision = state.revision + 1;
  return { state: { ...state, revision, updatedAt: now.toISOString() }, events: [], outcome: { kind: "RESPOND", responseKind: "OFF_TOPIC_REDIRECT", message: assistant.directResponse, conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision, ...(state.lastQuestionKey ? { resumeQuestionKey: state.lastQuestionKey } : {}) } };
}
