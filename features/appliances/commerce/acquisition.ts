import { hasExactModelMatch, normalizeSellerIdentity, offerFingerprint } from "./authority";
import type { ExactOfferObservation } from "./types";

export interface AcquisitionProduct { readonly exactProductId:string; readonly categoryId:string; readonly brand:string; readonly model:string }
export interface ParsedOfferInput { readonly product:AcquisitionProduct; readonly merchant:string; readonly seller:string; readonly marketplace:boolean; readonly canonicalListingUrl:string; readonly pageIdentity:string; readonly amount:number; readonly currency:string; readonly availability:string; readonly observedAt:string; readonly expiresAt:string; readonly discoveredVia?:{readonly aggregator:"AKAKCE";readonly url:string}; readonly affiliate?:ExactOfferObservation["affiliate"] }

export function acceptParsedExactOffer(input:ParsedOfferInput):ExactOfferObservation|null{
  if(!hasExactModelMatch(input.product.model,input.pageIdentity)||input.currency!=="TRY"||!Number.isFinite(input.amount)||input.amount<=0||!input.seller.trim())return null;
  const availability:ExactOfferObservation["availability"]=input.availability==="InStock"?"IN_STOCK":input.availability==="LimitedAvailability"?"LIMITED":input.availability==="OutOfStock"?"OUT_OF_STOCK":"UNKNOWN";
  if(availability==="UNKNOWN"||availability==="OUT_OF_STOCK")return null;
  const core={exactProductId:input.product.exactProductId,categoryId:input.product.categoryId,merchant:input.merchant,marketplace:input.marketplace,seller:input.seller,sellerIdentity:normalizeSellerIdentity(input.seller),canonicalListingUrl:input.canonicalListingUrl,amount:input.amount,currency:"TRY" as const,shippingInclusion:"UNKNOWN" as const,availability,observedAt:input.observedAt,expiresAt:input.expiresAt,sourceKind:(input.marketplace?"MARKETPLACE":input.merchant===input.seller?"MANUFACTURER_DIRECT":"INDEPENDENT_MERCHANT") as ExactOfferObservation["sourceKind"],...(input.discoveredVia?{discoveredVia:input.discoveredVia}:{}),identityMatchEvidence:[`Exact manufacturer/model token ${input.product.model} matched the canonical listing identity.`],exactModelMatched:true as const};
  return{...core,...(input.affiliate?{affiliate:input.affiliate}:{}),observationFingerprint:offerFingerprint(core)};
}

export function parseJsonLdOffers(html:string):readonly Record<string,unknown>[] {
  const results:Record<string,unknown>[]=[];for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)){try{const root=JSON.parse(match[1]);const queue=Array.isArray(root)?[...root]:[root];while(queue.length){const value=queue.shift();if(!value||typeof value!=="object")continue;if(Array.isArray(value)){queue.push(...value);continue;}const record=value as Record<string,unknown>;if(record["@type"]==="Product"&&record.offers)results.push(record);if(record["@graph"]&&Array.isArray(record["@graph"]))queue.push(...record["@graph"]);}}catch{/* malformed publisher data is not authority */}}return results;
}

export function offerConflictKey(offer:ExactOfferObservation):string{return `${offer.exactProductId}:${offer.sellerIdentity}`;}
