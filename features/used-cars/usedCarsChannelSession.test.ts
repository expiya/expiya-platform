import {describe,expect,it} from "vitest";
import {evaluateChannelSession,type ChannelSession} from "./channel-gateway/contracts";
const session:ChannelSession={sessionId:"s1",channel:"VIDEO_PROVIDER",providerReference:"opaque-room",tenantId:"t1",branchId:"b1",inventoryUnitId:"v1",listingRevisionId:"r1",userOpaqueId:"u1",purpose:"VIDEO_WALKAROUND",issuedAt:"2026-09-01T00:00:00.000Z",expiresAt:"2026-09-01T00:10:00.000Z",consumedAt:null,recordingEnabled:false,transcriptionEnabled:false,aiTrainingUseAllowed:false,executionAuthorized:false};
describe("channel session",()=>{
 it("allows a scoped single-use session",()=>expect(evaluateChannelSession({session,tenantId:"t1",branchId:"b1",listingRevisionId:"r1",now:"2026-09-01T00:05:00.000Z"})).toBe("ALLOW_ONCE"));
 it("rejects tenant and revision confusion",()=>{expect(evaluateChannelSession({session,tenantId:"t2",branchId:"b1",listingRevisionId:"r1",now:"2026-09-01T00:05:00.000Z"})).toBe("TENANT_MISMATCH");expect(evaluateChannelSession({session,tenantId:"t1",branchId:"b1",listingRevisionId:"r2",now:"2026-09-01T00:05:00.000Z"})).toBe("REVISION_MISMATCH");});
 it("keeps recording, transcription, training and execution off",()=>expect(session).toMatchObject({recordingEnabled:false,transcriptionEnabled:false,aiTrainingUseAllowed:false,executionAuthorized:false}));
});
