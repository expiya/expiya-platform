import { createHash } from "node:crypto";

export type UsedCarsIdempotentAction = "INVENTORY_CREATE" | "INVENTORY_IMPORT" | "LISTING_SUBMIT" | "LEAD_CREATE" | "MODERATION_DECIDE";
export type IdempotencyStatus = "PENDING" | "COMPLETED" | "FAILED_RETRYABLE" | "FAILED_FINAL";

export interface UsedCarsIdempotencyRecord {
  readonly version: "used-cars-idempotency/v1"; readonly key: string; readonly tenantId: string; readonly action: UsedCarsIdempotentAction;
  readonly requestFingerprint: string; readonly status: IdempotencyStatus; readonly createdAt: string; readonly expiresAt: string;
  readonly outcomeReferenceId: string | null;
}
export type IdempotencyDecision =
  | { readonly decision:"EXECUTE" }
  | { readonly decision:"IN_PROGRESS" }
  | { readonly decision:"REPLAY"; readonly outcomeReferenceId:string }
  | { readonly decision:"RETRY" }
  | { readonly decision:"CONFLICT"; readonly reason:"TENANT_MISMATCH"|"ACTION_MISMATCH"|"PAYLOAD_MISMATCH"|"FINAL_FAILURE"|"EXPIRED_KEY_REUSE_FORBIDDEN" };

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string,unknown>).sort(([left],[right])=>left.localeCompare(right,"en")).map(([key,child])=>`${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
}

export function fingerprintIdempotentRequest(input:{readonly tenantId:string;readonly action:UsedCarsIdempotentAction;readonly payload:unknown}):string {
  return `sha256:${createHash("sha256").update(canonical(["used-cars-idempotency/v1",input.tenantId,input.action,input.payload])).digest("hex")}`;
}

export function evaluateIdempotency(input:{readonly existing:UsedCarsIdempotencyRecord|null;readonly key:string;readonly tenantId:string;readonly action:UsedCarsIdempotentAction;readonly requestFingerprint:string;readonly now:string}):IdempotencyDecision {
  const record=input.existing; if(!record)return {decision:"EXECUTE"};
  if(record.key!==input.key)return {decision:"EXECUTE"};
  if(record.tenantId!==input.tenantId)return {decision:"CONFLICT",reason:"TENANT_MISMATCH"};
  if(record.action!==input.action)return {decision:"CONFLICT",reason:"ACTION_MISMATCH"};
  if(record.requestFingerprint!==input.requestFingerprint)return {decision:"CONFLICT",reason:"PAYLOAD_MISMATCH"};
  if(input.now>=record.expiresAt)return {decision:"CONFLICT",reason:"EXPIRED_KEY_REUSE_FORBIDDEN"};
  if(record.status==="PENDING")return {decision:"IN_PROGRESS"};
  if(record.status==="COMPLETED"&&record.outcomeReferenceId)return {decision:"REPLAY",outcomeReferenceId:record.outcomeReferenceId};
  if(record.status==="FAILED_RETRYABLE")return {decision:"RETRY"};
  return {decision:"CONFLICT",reason:"FINAL_FAILURE"};
}

