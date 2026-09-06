import { createHash } from "node:crypto";
import { executeNativeXpyTurn } from "@/features/xpy/nativeRuntime";
import { interpretPlatformAssistant, type XpyTextProposal } from "@/features/xpy/assistant";
import { planPlatformLifecycle, type XpyLifecyclePlan } from "@/features/xpy/planner";
import { requireXpyDomainPack, requireXpyReentry } from "@/features/xpy/domainPacks";
import { bindXpyRuntime } from "@/features/xpy/runtimeContract";
import type { V3ConversationState, V3PublicResponse } from "./types";
import type { RecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";

export interface CarsNativeTurnInput { readonly conversationId: string; readonly messageId: string; readonly message: string; readonly expectedRevision: number; readonly state?: V3ConversationState; readonly signal?: AbortSignal; readonly recommendationTermsAcceptance?: RecommendationTermsAcceptance }
type ValidatedCarsProposal = { readonly assistant: ReturnType<typeof interpretPlatformAssistant>; readonly proposal: XpyTextProposal };
export type CarsDomainDecision = (input: CarsNativeTurnInput) => Promise<V3PublicResponse>;
const fingerprint = (value: string) => createHash("sha256").update(value).digest("hex");

export async function runNativeCarsStateTurn(input: CarsNativeTurnInput, initial: V3ConversationState, decideDomain: CarsDomainDecision): Promise<V3PublicResponse> {
  const payloadFingerprint = fingerprint(input.message);
  return executeNativeXpyTurn<V3ConversationState, ReturnType<typeof interpretPlatformAssistant>, ValidatedCarsProposal, XpyLifecyclePlan, never, V3PublicResponse, V3PublicResponse>({
    runtime: bindXpyRuntime(requireXpyDomainPack("CARS"), "NEW_CAR"),
    expectedRevision: input.expectedRevision, messageId: input.messageId, payloadFingerprint,
    transaction: {
      load: async () => ({ state: initial, ...(initial.processedMessages[input.messageId] ? { replay: { payloadFingerprint: initial.processedMessages[input.messageId], state: initial, outcome: { kind: "V3_CONVERSATION", message: "Bu mesaj daha önce işlendi; konuşma durumu değişmedi.", state: initial } as V3PublicResponse } } : {}) }),
      authorityMatches: state => state.version === "3.8" && state.conversationId === input.conversationId,
      commit: async update => update.outcome,
    },
    x: { interpret: state => interpretPlatformAssistant(input.message, Boolean(state.lastQuestionKey), requireXpyReentry("CARS", "NEW_CAR")) },
    validation: { validate: (_state, assistant) => {
      const proposal = assistant.proposals[0];
      if (!proposal || !proposal.message || proposal.message.length > 4_000) throw new TypeError("V3_PROPOSAL_INVALID");
      return { assistant, proposal };
    } },
    p: { plan: (state, validated) => planPlatformLifecycle({ message: validated.proposal.message, pendingQuestionKey: state.lastQuestionKey, assistant: validated.assistant }) },
    withoutY: (state, _validated, plan) => {
      if (plan.kind !== "RESPOND_WITHOUT_DECISION") return undefined;
      const revision = state.revision + 1;
      const next = { ...state, revision, processedMessages: { ...state.processedMessages, [input.messageId]: payloadFingerprint }, lastQuestionKey: plan.preserveQuestionKey };
      return { state: next, events: [], outcome: { kind: "V3_CONVERSATION", message: plan.message, state: next } };
    },
    y: { decide: async (state, _validated, plan) => {
      if (plan.kind === "DEFER_PENDING") {
        const revision = state.revision + 1;
        const next = { ...state, revision, processedMessages: { ...state.processedMessages, [input.messageId]: payloadFingerprint }, questionDeferrals: [...(state.questionDeferrals ?? []), { questionKey: plan.questionKey, sourceMessageId: input.messageId, kind: plan.deferral, revision }], lastQuestionKey: undefined };
        const message = plan.deferral === "DEFER" ? "Bu soruyu erteledim; diğer ihtiyaçlarınla devam edebiliriz." : plan.deferral === "UNKNOWN" ? "Bilmemen sorun değil; bu soruyu karar için zorunlu saymadan devam edebiliriz." : "Bu soruyu geçiyorum; diğer ihtiyaçlarınla devam edebiliriz.";
        const outcome = { kind: "V3_CONVERSATION", message, state: next } satisfies V3PublicResponse;
        return { state: next, events: [], outcome };
      }
      const outcome = await decideDomain({ ...input, state });
      const projected = plan.kind === "PRESERVE_PENDING" && state.lastQuestionKey && !outcome.state.lastQuestionKey ? { ...outcome, state: { ...outcome.state, lastQuestionKey: state.lastQuestionKey } } : outcome;
      return { state: projected.state, events: [], outcome: projected };
    } },
    isTerminalResult: () => false,
    replay: stored => stored.outcome,
    unavailable: () => { throw new TypeError("V3_STATE_UNAVAILABLE"); },
    payloadConflict: () => { throw new TypeError("V3_MESSAGE_PAYLOAD_CONFLICT"); },
    revisionConflict: () => { throw new TypeError("V3_REVISION_CONFLICT"); },
    authorityMismatch: () => { throw new TypeError("V3_STATE_BINDING_INVALID"); },
  });
}
