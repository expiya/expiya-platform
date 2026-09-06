import type { V3ConversationState, V3PublicResponse } from "./types";
import { executeNativeXpyTurn } from "@/features/xpy/nativeRuntime";
import { interpretPlatformAssistant } from "@/features/xpy/assistant";
import { planPlatformLifecycle } from "@/features/xpy/planner";
import { requireXpyDomainPack, requireXpyReentry } from "@/features/xpy/domainPacks";
import { createV3ConversationState } from "./engine.server";
import type { CarsStagedPorts } from "./carsStages";
import { bindXpyRuntime } from "@/features/xpy/runtimeContract";

interface Record { state: V3ConversationState; outputs: Map<string, { hash: string; response: V3PublicResponse }> }
const records = new Map<string, Record>();
const hash = async (value: string) => Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))).toString("hex");

export async function runStoredV31Turn(input: { readonly conversationId: string; readonly messageId: string; readonly message: string; readonly expectedRevision: number; readonly trustedSeed?: V3ConversationState; readonly stages: CarsStagedPorts }) {
  const current = records.get(input.conversationId) ?? (input.trustedSeed ? { state: input.trustedSeed, outputs: new Map() } : { state: createV3ConversationState(input.conversationId), outputs: new Map() });
  const payloadHash = await hash(input.message);
  return executeNativeXpyTurn({ runtime: bindXpyRuntime(requireXpyDomainPack("CARS"), "NEW_CAR"), expectedRevision: input.expectedRevision, messageId: input.messageId, payloadFingerprint: payloadHash,
    transaction: {
      load: async () => { const replay=current.outputs.get(input.messageId);return{state:current.state,...(replay?{replay:{payloadFingerprint:replay.hash,state:replay.response.state,outcome:replay.response}}:{})}; },
      authorityMatches: state => state.version === "3.8" && state.conversationId === input.conversationId,
      commit: async update => { const outputs=new Map(current.outputs);outputs.set(input.messageId,{hash:payloadHash,response:update.outcome});records.set(input.conversationId,{state:update.state,outputs});return update.outcome; },
    },
    x:{interpret:state=>interpretPlatformAssistant(input.message,Boolean(state.lastQuestionKey),requireXpyReentry("CARS","NEW_CAR"))},
    validation:{validate:(_state,assistant)=>{const proposal=assistant.proposals[0];if(!proposal?.message)throw new TypeError("V3_PROPOSAL_INVALID");return{assistant,proposal};}},
    p:{plan:(state,validated)=>planPlatformLifecycle({message:validated.proposal.message,pendingQuestionKey:state.lastQuestionKey,assistant:validated.assistant})},
    withoutY:(state,_validated,plan)=>{if(plan.kind!=="RESPOND_WITHOUT_DECISION")return undefined;const revision=state.revision+1;const next={...state,revision,processedMessages:{...state.processedMessages,[input.messageId]:payloadHash},lastQuestionKey:plan.preserveQuestionKey};return{state:next,events:[],outcome:{kind:"V3_CONVERSATION" as const,message:plan.message,state:next}};},
    y:{decide:async(state,_validated,plan)=>{if(plan.kind==="DEFER_PENDING"){const revision=state.revision+1;const next={...state,revision,processedMessages:{...state.processedMessages,[input.messageId]:payloadHash},questionDeferrals:[...(state.questionDeferrals??[]),{questionKey:plan.questionKey,sourceMessageId:input.messageId,kind:plan.deferral,revision}],lastQuestionKey:undefined};const message=plan.deferral==="DEFER"?"Bu soruyu erteledim; diğer ihtiyaçlarınla devam edebiliriz.":plan.deferral==="UNKNOWN"?"Bilmemen sorun değil; bu soruyu karar için zorunlu saymadan devam edebiliriz.":"Bu soruyu geçiyorum; diğer ihtiyaçlarınla devam edebiliriz.";return{state:next,events:[],outcome:{kind:"V3_CONVERSATION" as const,message,state:next}};}const context=await input.stages.prepare(state);const carsPlan=await input.stages.plan(context);const mutation=carsPlan.kind==="TERMINAL"?carsPlan.mutation:await input.stages.decide(carsPlan);const projected=plan.kind==="PRESERVE_PENDING"&&state.lastQuestionKey&&!mutation.state.lastQuestionKey?{...mutation,state:{...mutation.state,lastQuestionKey:state.lastQuestionKey},outcome:{...mutation.outcome,state:{...mutation.state,lastQuestionKey:state.lastQuestionKey}}}:mutation;return{state:projected.state,events:[],outcome:projected.outcome};}},
    isTerminalResult:()=>false,replay:stored=>stored.outcome,unavailable:()=>{throw new TypeError("V3_STATE_UNAVAILABLE");},payloadConflict:()=>{throw new TypeError("V3_MESSAGE_PAYLOAD_CONFLICT");},revisionConflict:()=>{throw new TypeError("V3_REVISION_CONFLICT");},authorityMismatch:()=>{throw new TypeError("V3_STATE_BINDING_INVALID");}
  });
}

export function resetV31StoreForTests() { records.clear(); }
