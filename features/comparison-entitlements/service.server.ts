import "server-only";
import {createHash,randomUUID} from "node:crypto";
import type {ComparisonEntitlementRepository,ComparisonIssuerAdapter,EntitlementSubject} from "./contracts";

export async function ingestComparisonIssuerEvent(input:{readonly adapter:ComparisonIssuerAdapter|null;readonly repository:ComparisonEntitlementRepository;readonly rawBody:string;readonly headers:Readonly<Record<string,string|undefined>>}){
 if(!input.adapter)return{status:"REJECTED" as const,reason:"ISSUER_CONFIGURATION_MISSING" as const};
 const verified=input.adapter.verify(input.rawBody,input.headers);if(!verified)return{status:"REJECTED" as const,reason:"ISSUER_SIGNATURE_INVALID" as const};
 return input.repository.applyIssuerEvent(verified);
}
export async function resolvePersistedComparisonEntitlement(input:{readonly repository:ComparisonEntitlementRepository|null;readonly subject:EntitlementSubject|null;readonly departmentId:"APPLIANCES"|"CARS";readonly category:string;readonly conversationId:string;readonly decisionRevision:number;readonly decisionFingerprint:string;readonly exactEvidenceIds:readonly string[];readonly now?:Date}){
 if(!input.repository||!input.subject)return{status:"NOT_PURCHASED" as const};
 const record=await input.repository.findActive({subject:input.subject,departmentId:input.departmentId,category:input.category,conversationId:input.conversationId,decisionRevision:input.decisionRevision,decisionFingerprint:input.decisionFingerprint},input.now??new Date());if(!record)return{status:"NOT_PURCHASED" as const};
 const evidence=new Set(input.exactEvidenceIds),authorized=[...new Set(record.authorizedExactIds)];
 if(!authorized.length||authorized.some(id=>!evidence.has(id)))return{status:"NOT_PURCHASED" as const};
 return{status:"PURCHASED" as const,entitlementId:record.id,authorizedExactProductIds:authorized};
}
export const evidenceSetFingerprint=(ids:readonly string[])=>createHash("sha256").update(JSON.stringify([...new Set(ids)].sort())).digest("hex");
export const auditId=()=>randomUUID();
