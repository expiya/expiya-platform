import {evaluateTaxonomySourceForPublicUse,type UsedTaxonomySource} from "./sourcePolicy";
export type TaxonomyFactKind="IDENTITY"|"PRODUCTION_PERIOD"|"BODY"|"POWERTRAIN"|"TRIM"|"TR_MARKET_AVAILABILITY";
export interface TaxonomyFactProvenance { readonly factId:string; readonly entityId:string; readonly kind:TaxonomyFactKind; readonly sourceIds:readonly string[]; readonly observedAt:string; readonly confidence:"LOW"|"MEDIUM"|"HIGH"; readonly moderatorStatus:"DRAFT"|"REVIEWED"|"APPROVED"|"CONFLICT" }
export type ProvenanceGateCode="NO_SOURCE"|"UNKNOWN_SOURCE"|"SOURCE_BLOCKED"|"DEALER_ONLY_EVIDENCE"|"CONFLICT_UNRESOLVED"|"LOW_CONFIDENCE_PUBLICATION";
export function evaluateFactProvenance(input:{readonly fact:TaxonomyFactProvenance;readonly sources:readonly UsedTaxonomySource[];readonly now:string}):{readonly publishable:boolean;readonly codes:readonly ProvenanceGateCode[]}{
 const codes:ProvenanceGateCode[]=[];
 if(input.fact.sourceIds.length===0)codes.push("NO_SOURCE");
 const sourceMap=new Map(input.sources.map(source=>[source.id,source]));
 for(const id of input.fact.sourceIds){const source=sourceMap.get(id);if(!source){codes.push("UNKNOWN_SOURCE");continue;}if(!evaluateTaxonomySourceForPublicUse(source,input.now).allowed)codes.push("SOURCE_BLOCKED");}
 const resolved=input.fact.sourceIds.map(id=>sourceMap.get(id)).filter((s):s is UsedTaxonomySource=>Boolean(s));
 if(resolved.length>0&&resolved.every(source=>source.authority==="DEALER_SUBMISSION"))codes.push("DEALER_ONLY_EVIDENCE");
 if(input.fact.moderatorStatus==="CONFLICT")codes.push("CONFLICT_UNRESOLVED");
 if(input.fact.confidence==="LOW")codes.push("LOW_CONFIDENCE_PUBLICATION");
 return Object.freeze({publishable:codes.length===0&&input.fact.moderatorStatus==="APPROVED",codes:Object.freeze([...new Set(codes)])});
}
