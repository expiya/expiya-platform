import type { AppliancesConversationState, AppliancesRuntimeOutcome } from "../contracts";
import { deterministicPayloadHash } from "../persistence/service";
import type { AppliancesConversationStore } from "../persistence/types";
import type { RunAppliancesTurnResult } from "../context/runtime.server";
import { mutateBrandConstraint, parseBrandConstraintMessage, type CatalogBrand } from ".";

export async function runBrandConstraintTurn(input:{store:AppliancesConversationStore;conversationId:string;messageId:string;expectedRevision:number;message:string;brands:readonly CatalogBrand[];recompute:(state:AppliancesConversationState)=>Promise<{state:AppliancesConversationState;outcome:AppliancesRuntimeOutcome}>|{state:AppliancesConversationState;outcome:AppliancesRuntimeOutcome};now?:Date}):Promise<RunAppliancesTurnResult|null>{
 const loaded=await input.store.load(input.conversationId);if(!loaded)return{status:"STATE_UNAVAILABLE"};
 const parsed=parseBrandConstraintMessage(input.message,input.brands,loaded.state);if(parsed.kind==="NONE")return null;
 const payloadHash=deterministicPayloadHash({action:"TURN",conversationId:input.conversationId,messageId:input.messageId,expectedRevision:input.expectedRevision,message:input.message}),replay=loaded.messages[input.messageId];
 if(replay){if(replay.payloadHash!==payloadHash)return{status:"MESSAGE_PAYLOAD_CONFLICT"};if(!replay.outcome.publicOutcome)return{status:"INTEGRITY_FAILURE"};return{status:"OK",outcome:replay.outcome.publicOutcome,state:loaded.state,replayed:true};}
 if(loaded.state.revision!==input.expectedRevision)return{status:"REVISION_CONFLICT"};if(!loaded.state.pinnedBrandPolicyDigest||!loaded.state.pinnedBrandPolicyId)return{status:"AUTHORITY_MISMATCH"};
 const revision=loaded.state.revision+1,createdAt=(input.now??new Date()).toISOString();
 if(parsed.kind==="UNKNOWN"){const state={...loaded.state,revision,updatedAt:createdAt},outcome:AppliancesRuntimeOutcome={kind:"CLARIFY",questionKey:"appliances.brand.unknown",message:`${parsed.label} markası bu kategorideki doğrulanmış ürünler arasında bulunamadı. Katalogdaki bir markayı açıkça belirtir misin?`};const saved=await input.store.commit({expectedRevision:loaded.state.revision,messageId:input.messageId,payloadHash,nextState:state,events:[],outcomeKind:"CONTEXT_MUTATED",publicOutcome:outcome});return saved.status==="OK"?{status:"OK",outcome:saved.outcome.publicOutcome!,state:saved.outcome.state,replayed:false}:{status:saved.status};} 
 const mutated=mutateBrandConstraint(loaded.state,parsed,{messageId:input.messageId,message:input.message,revision,createdAt}),advanced=await input.recompute({...mutated,revision,updatedAt:createdAt}),saved=await input.store.commit({expectedRevision:loaded.state.revision,messageId:input.messageId,payloadHash,nextState:advanced.state,events:[],outcomeKind:"CONTEXT_MUTATED",publicOutcome:advanced.outcome});return saved.status==="OK"?{status:"OK",outcome:saved.outcome.publicOutcome!,state:saved.outcome.state,replayed:false}:{status:saved.status};
}
