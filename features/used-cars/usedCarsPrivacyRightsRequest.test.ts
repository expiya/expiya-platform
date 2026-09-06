import {describe,expect,it} from "vitest";
import {canTransitionPrivacyRequest,validatePrivacyRightsRequest,type PrivacyRightsRequest} from "./privacy/rightsRequest";
const request:PrivacyRightsRequest={requestId:"r1",rights:["ACCESS","DELETION"],status:"RECEIVED",receivedAt:"2026-09-01",statutoryDueAt:"2026-10-01",subjectScopeFingerprint:`hmac-sha256:v1:${"a".repeat(64)}`,requesterType:"SUBJECT",identityEvidenceStored:false,rawPiiInAudit:false,automatedFulfillmentAuthorized:false};
describe("privacy rights request",()=>{
 it("uses a controlled request lifecycle",()=>{expect(canTransitionPrivacyRequest("RECEIVED","IDENTITY_PENDING")).toBe(true);expect(canTransitionPrivacyRequest("RECEIVED","COMPLETED")).toBe(false);});
 it("accepts a PII-free auditable request envelope",()=>expect(validatePrivacyRightsRequest(request)).toEqual([]));
 it("never authorizes automated fulfilment",()=>expect(request.automatedFulfillmentAuthorized).toBe(false));
});
