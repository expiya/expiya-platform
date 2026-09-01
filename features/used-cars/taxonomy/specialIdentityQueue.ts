export type SpecialIdentityClass="LOW_VOLUME_IMPORT"|"CLASSIC"|"RARE_SPECIAL";
export interface SpecialIdentityRequest { readonly requestId:string; readonly tenantId:string; readonly vehicleClass:SpecialIdentityClass; readonly sellerLabel:string; readonly approximatePeriod:string|null; readonly evidenceKinds:readonly string[]; readonly vinOrSerialStoredPrivately:boolean; readonly sellerCanCreateCanonicalIdentity:false }
export type SpecialQueueDecision={readonly accepted:true;readonly priority:"STANDARD"|"SPECIALIST";readonly secondReviewRequired:boolean}|{readonly accepted:false;readonly reason:"SELLER_CANONICAL_CREATION_FORBIDDEN"|"EVIDENCE_REQUIRED"|"PERIOD_REQUIRED"|"PRIVATE_IDENTIFIER_HANDLING_REQUIRED"};
export function evaluateSpecialIdentityRequest(request:SpecialIdentityRequest):SpecialQueueDecision {
 if(request.sellerCanCreateCanonicalIdentity!==false)return {accepted:false,reason:"SELLER_CANONICAL_CREATION_FORBIDDEN"};
 if(request.evidenceKinds.length===0)return {accepted:false,reason:"EVIDENCE_REQUIRED"};
 if((request.vehicleClass==="CLASSIC"||request.vehicleClass==="RARE_SPECIAL")&&!request.approximatePeriod)return {accepted:false,reason:"PERIOD_REQUIRED"};
 if((request.vehicleClass==="CLASSIC"||request.vehicleClass==="RARE_SPECIAL")&&!request.vinOrSerialStoredPrivately)return {accepted:false,reason:"PRIVATE_IDENTIFIER_HANDLING_REQUIRED"};
 return {accepted:true,priority:request.vehicleClass==="LOW_VOLUME_IMPORT"?"STANDARD":"SPECIALIST",secondReviewRequired:request.vehicleClass!=="LOW_VOLUME_IMPORT"};
}
