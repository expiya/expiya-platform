import type { DealerRole, ExpiyaRole } from "../tenancy/contracts";

export type UsedCarsPrincipal =
  | { readonly kind:"DEALER_USER"; readonly subjectId:string; readonly actorId:string; readonly tenantId:string; readonly role:DealerRole; readonly branchIds:readonly string[] }
  | { readonly kind:"EXPIYA_STAFF"; readonly subjectId:string; readonly actorId:string; readonly role:ExpiyaRole }
  | { readonly kind:"SERVICE_ACCOUNT"; readonly subjectId:string; readonly actorId:string; readonly tenantId:string; readonly scopes:readonly ServiceAccountScope[] };

export type ServiceAccountScope="INVENTORY_IMPORT"|"STOCK_UPDATE"|"MEDIA_UPLOAD";
export interface VerifiedIdentityEnvelope {
  readonly issuer:string; readonly audience:string; readonly subjectId:string; readonly authenticationTime:number;
  readonly expiresAt:number; readonly tokenId:string; readonly assurance:"AAL1"|"AAL2"; readonly principal:UsedCarsPrincipal;
}

export type IdentityEnvelopeDecision={readonly accepted:true}|{readonly accepted:false;readonly reason:"ISSUER_MISMATCH"|"AUDIENCE_MISMATCH"|"SUBJECT_MISMATCH"|"TOKEN_EXPIRED"|"AUTH_IN_FUTURE"|"TOKEN_REPLAY"|"AAL2_REQUIRED"};

export function verifyIdentityEnvelope(input:{readonly envelope:VerifiedIdentityEnvelope;readonly expectedIssuer:string;readonly expectedAudience:string;readonly now:number;readonly consumedTokenIds:ReadonlySet<string>;readonly requireAal2:boolean}):IdentityEnvelopeDecision {
  const {envelope}=input;
  if(envelope.issuer!==input.expectedIssuer)return {accepted:false,reason:"ISSUER_MISMATCH"};
  if(envelope.audience!==input.expectedAudience)return {accepted:false,reason:"AUDIENCE_MISMATCH"};
  if(envelope.subjectId!==envelope.principal.subjectId)return {accepted:false,reason:"SUBJECT_MISMATCH"};
  if(envelope.expiresAt<=input.now)return {accepted:false,reason:"TOKEN_EXPIRED"};
  if(envelope.authenticationTime>input.now)return {accepted:false,reason:"AUTH_IN_FUTURE"};
  if(input.consumedTokenIds.has(envelope.tokenId))return {accepted:false,reason:"TOKEN_REPLAY"};
  if(input.requireAal2&&envelope.assurance!=="AAL2")return {accepted:false,reason:"AAL2_REQUIRED"};
  return {accepted:true};
}
