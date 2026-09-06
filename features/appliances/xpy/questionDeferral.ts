import type { AppliancesConversationState } from "../contracts";
import { classifyQuestionDeferral } from "@/features/xpy/lifecycle";

export type QuestionDisposition = { readonly kind: "DEFER"; readonly sourceText: string } | { readonly kind: "CONTINUE" };

export function proposeQuestionDisposition(message: string, questionKey?: string): QuestionDisposition {
  if (!questionKey) return { kind: "CONTINUE" };
  if (classifyQuestionDeferral(message) || (/budget|bütçe/iu.test(questionKey) && /^(?:bütçe önemli değil|fiyatı bilmiyorum|bütçeyi geçelim)[.! ]*$/iu.test(message.trim()))) return { kind: "DEFER", sourceText: message };
  return { kind: "CONTINUE" };
}

/** Pure P reducer: owns durable pending-question deferral lifecycle. */
export function reduceQuestionDeferral(input: { readonly state: AppliancesConversationState; readonly disposition: Extract<QuestionDisposition, { kind: "DEFER" }>; readonly messageId: string; readonly createdAt: string }): AppliancesConversationState {
  const questionKey = input.state.lastQuestionKey;
  if (!questionKey) return input.state;
  const revision = input.state.revision + 1;
  return { ...input.state, revision, questionDeferrals: [...(input.state.questionDeferrals ?? []).filter(item => item.questionKey !== questionKey || item.status !== "ACTIVE"), { questionKey, sourceMessageId: input.messageId, sourceText: input.disposition.sourceText, createdRevision: revision, status: "ACTIVE" }], decisionRecord: undefined, currentDecisionFingerprint: undefined, updatedAt: input.createdAt };
}
