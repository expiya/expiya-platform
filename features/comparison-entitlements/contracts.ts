export type EntitlementSubject={readonly type:"USER"|"SESSION";readonly id:string};
export type ComparisonEntitlementState="ACTIVE"|"REVOKED"|"REFUNDED"|"EXPIRED";
export interface ComparisonEntitlementRecord {
 readonly id:string;readonly schemaVersion:"comparison-entitlement/v1";readonly subject:EntitlementSubject;readonly purchaseReferenceId:string;
 readonly departmentId:"APPLIANCES"|"CARS";readonly category:string;readonly conversationId:string;readonly decisionRevision:number;readonly decisionFingerprint:string;
 readonly authorizedExactIds:readonly string[];readonly evidenceSetFingerprint:string;readonly state:ComparisonEntitlementState;readonly issuedAt:string;readonly expiresAt:string;
 readonly revokedAt?:string;readonly issuer:string;readonly provider:string;readonly issuerEventSequence:number;readonly idempotencyKey:string;
}
export interface ComparisonEntitlementAuditEvent {readonly id:string;readonly entitlementId:string;readonly eventType:"ISSUED"|"REPLAY_IGNORED"|"REVOKED"|"REFUNDED"|"EXPIRED"|"REJECTED";readonly issuerEventId:string;readonly occurredAt:string;readonly metadata:Readonly<Record<string,string|number|boolean>>}
export interface ComparisonEntitlementRepository {
 findActive(binding:{readonly subject:EntitlementSubject;readonly departmentId:string;readonly category:string;readonly conversationId:string;readonly decisionRevision:number;readonly decisionFingerprint:string},now:Date):Promise<ComparisonEntitlementRecord|null>;
 applyIssuerEvent(event:VerifiedComparisonIssuerEvent):Promise<{readonly status:"APPLIED"|"REPLAYED"|"STALE";readonly entitlement?:ComparisonEntitlementRecord}>;
}
export type VerifiedComparisonIssuerEvent={readonly verified:true;readonly eventId:string;readonly sequence:number;readonly type:"ENTITLEMENT_ISSUED"|"ENTITLEMENT_REVOKED"|"PURCHASE_REFUNDED";readonly occurredAt:string;readonly record:Omit<ComparisonEntitlementRecord,"state"|"revokedAt"|"issuerEventSequence"|"idempotencyKey">;readonly idempotencyKey:string};
export interface ComparisonIssuerAdapter {readonly issuer:string;verify(rawBody:string,headers:Readonly<Record<string,string|undefined>>):VerifiedComparisonIssuerEvent|null}
