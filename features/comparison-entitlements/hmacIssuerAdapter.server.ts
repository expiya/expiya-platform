import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
import type {ComparisonIssuerAdapter,VerifiedComparisonIssuerEvent} from "./contracts";

/** Provider-neutral verifier. A provider adapter owns parsing, but cannot emit an event until this envelope verifies. */
export function createHmacComparisonIssuerAdapter(input:{readonly issuer:string;readonly secret:string|undefined;readonly signatureHeader?:string;readonly parse:(rawBody:string)=>Omit<VerifiedComparisonIssuerEvent,"verified">}):ComparisonIssuerAdapter|null{
 if(!input.secret)return null;if(Buffer.byteLength(input.secret,"utf8")<32)throw new TypeError("ENTITLEMENT_ISSUER_SECRET_TOO_SHORT");const header=(input.signatureHeader??"x-expiya-signature").toLowerCase();
 return{issuer:input.issuer,verify(rawBody,headers){const supplied=headers[header];if(!supplied)return null;const expected=createHmac("sha256",input.secret!).update(rawBody).digest();let actual:Buffer;try{actual=Buffer.from(supplied,"base64url");}catch{return null;}if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;try{const parsed=input.parse(rawBody);if(parsed.record.issuer!==input.issuer||!parsed.eventId||!parsed.idempotencyKey||!Number.isInteger(parsed.sequence)||parsed.sequence<0)return null;return{...parsed,verified:true};}catch{return null;}}};
}
