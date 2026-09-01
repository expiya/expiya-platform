import {describe,expect,it} from "vitest";
import {isCommunicationConsentActive,type CommunicationConsent} from "./communications-consent/sessionConsent";
import {evaluateLiveSessionSafety} from "./live-vehicle-session/safety";
const consent:CommunicationConsent={receiptId:"c1",userId:"u1",tenantId:"t1",channel:"VIDEO_PROVIDER",purpose:"VIDEO_WALKAROUND",grantedAt:"2026-09-01T00:00:00.000Z",expiresAt:"2026-09-02T00:00:00.000Z",withdrawnAt:null,legalTextChecksum:`sha256:${"a".repeat(64)}`,recordingConsent:false};
const safe={dealerActorVerified:true,dealerActorBranchAuthorized:true,stockFresh:true,recordingRequested:false,allParticipantsRecordingConsent:false,piiExposureAcknowledged:true,independentInspectionDisclaimerShown:true,roomTokenSingleUse:true,webhookSignatureVerified:true,webhookReplayDetected:false};
describe("communication consent and live video safety",()=>{
 it("binds consent to recipient, channel and purpose",()=>{expect(isCommunicationConsentActive({consent,tenantId:"t1",channel:"VIDEO_PROVIDER",purpose:"VIDEO_WALKAROUND",now:"2026-09-01T01:00:00.000Z"})).toBe(true);expect(isCommunicationConsentActive({consent,tenantId:"t2",channel:"VIDEO_PROVIDER",purpose:"VIDEO_WALKAROUND",now:"2026-09-01T01:00:00.000Z"})).toBe(false);});
 it("requires separate recording consent",()=>expect(evaluateLiveSessionSafety({...safe,recordingRequested:true})).toMatchObject({allowed:false,codes:["RECORDING_CONSENT_REQUIRED"]}));
 it("never treats a video call as vehicle verification",()=>expect(evaluateLiveSessionSafety(safe)).toMatchObject({allowed:true,vehicleVerifiedByCall:false}));
});
