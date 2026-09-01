import { describe,expect,it } from "vitest";
import { evaluateIdempotency,fingerprintIdempotentRequest,type UsedCarsIdempotencyRecord } from "./audit/idempotency";
const fingerprint=fingerprintIdempotentRequest({tenantId:"tenant-a",action:"LEAD_CREATE",payload:{listingId:"listing-1",intent:"REQUEST_QUOTE"}});
const record:UsedCarsIdempotencyRecord={version:"used-cars-idempotency/v1",key:"key-1",tenantId:"tenant-a",action:"LEAD_CREATE",requestFingerprint:fingerprint,status:"PENDING",createdAt:"2026-09-01T18:00:00Z",expiresAt:"2026-09-02T18:00:00Z",outcomeReferenceId:null};
const request={existing:record,key:"key-1",tenantId:"tenant-a",action:"LEAD_CREATE" as const,requestFingerprint:fingerprint,now:"2026-09-01T19:00:00Z"};
describe("tenant-scoped mutation idempotency",()=>{
  it("generates stable fingerprints independent of object key order without raw payload",()=>{const other=fingerprintIdempotentRequest({tenantId:"tenant-a",action:"LEAD_CREATE",payload:{intent:"REQUEST_QUOTE",listingId:"listing-1"}});expect(other).toBe(fingerprint);expect(fingerprint).not.toContain("listing-1");});
  it("executes a new key and reports a pending duplicate",()=>{expect(evaluateIdempotency({...request,existing:null})).toEqual({decision:"EXECUTE"});expect(evaluateIdempotency(request)).toEqual({decision:"IN_PROGRESS"});});
  it("replays only the completed outcome reference",()=>{expect(evaluateIdempotency({...request,existing:{...record,status:"COMPLETED",outcomeReferenceId:"lead-1"}})).toEqual({decision:"REPLAY",outcomeReferenceId:"lead-1"});});
  it("rejects tenant, action and payload substitution",()=>{expect(evaluateIdempotency({...request,tenantId:"tenant-b"})).toEqual({decision:"CONFLICT",reason:"TENANT_MISMATCH"});expect(evaluateIdempotency({...request,action:"INVENTORY_CREATE"})).toEqual({decision:"CONFLICT",reason:"ACTION_MISMATCH"});expect(evaluateIdempotency({...request,requestFingerprint:"sha256:other"})).toEqual({decision:"CONFLICT",reason:"PAYLOAD_MISMATCH"});});
  it("separates retryable, final and expired outcomes",()=>{expect(evaluateIdempotency({...request,existing:{...record,status:"FAILED_RETRYABLE"}})).toEqual({decision:"RETRY"});expect(evaluateIdempotency({...request,existing:{...record,status:"FAILED_FINAL"}})).toEqual({decision:"CONFLICT",reason:"FINAL_FAILURE"});expect(evaluateIdempotency({...request,now:record.expiresAt})).toEqual({decision:"CONFLICT",reason:"EXPIRED_KEY_REUSE_FORBIDDEN"});});
});

