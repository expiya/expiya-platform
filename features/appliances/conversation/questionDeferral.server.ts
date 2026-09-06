import type { AppliancesConversationState, AppliancesRuntimeOutcome } from "../contracts";
import { deterministicPayloadHash } from "../persistence/service";
import type { AppliancesConversationStore } from "../persistence/types";
import { classifyQuestionDeferral } from "@/features/xpy/lifecycle";

export function isContextualQuestionDeferral(message: string, questionKey?: string): boolean {
  if (!questionKey) return false;
  if (classifyQuestionDeferral(message)) return true;
  return /budget|bütçe/iu.test(questionKey) && /^(?:bütçe önemli değil|fiyatı bilmiyorum|bütçeyi geçelim)[.! ]*$/iu.test(message.trim());
}

export async function runAppliancesQuestionDeferralTurn(input: { store: AppliancesConversationStore; conversationId: string; messageId: string; expectedRevision: number; message: string; now?: Date; recompute: (state: AppliancesConversationState) => Promise<{ state: AppliancesConversationState; outcome: AppliancesRuntimeOutcome }> | { state: AppliancesConversationState; outcome: AppliancesRuntimeOutcome } }) {
  const loaded = await input.store.load(input.conversationId); if (!loaded) return { status: "STATE_UNAVAILABLE" as const };
  if (!isContextualQuestionDeferral(input.message, loaded.state.lastQuestionKey)) return undefined;
  const payloadHash = deterministicPayloadHash({ action: "TURN", conversationId: input.conversationId, messageId: input.messageId, expectedRevision: input.expectedRevision, message: input.message });
  const replay = loaded.messages[input.messageId];
  if (replay) return replay.payloadHash === payloadHash ? { status: "OK" as const, outcome: replay.outcome.publicOutcome!, state: loaded.state, replayed: true } : { status: "MESSAGE_PAYLOAD_CONFLICT" as const };
  if (loaded.state.revision !== input.expectedRevision) return { status: "REVISION_CONFLICT" as const };
  const revision = loaded.state.revision + 1;
  const questionKey = loaded.state.lastQuestionKey!;
  const deferred = { ...loaded.state, revision, questionDeferrals: [...(loaded.state.questionDeferrals ?? []).filter((item) => item.questionKey !== questionKey || item.status !== "ACTIVE"), { questionKey, sourceMessageId: input.messageId, sourceText: input.message, createdRevision: revision, status: "ACTIVE" as const }], decisionRecord: undefined, currentDecisionFingerprint: undefined, updatedAt: (input.now ?? new Date()).toISOString() };
  const next = await input.recompute(deferred);
  const saved = await input.store.commit({ expectedRevision: loaded.state.revision, messageId: input.messageId, payloadHash, nextState: next.state, events: [], outcomeKind: "CONTEXT_MUTATED", publicOutcome: next.outcome });
  return saved.status === "OK" ? { status: "OK" as const, outcome: saved.outcome.publicOutcome!, state: saved.outcome.state, replayed: false } : { status: saved.status };
}
