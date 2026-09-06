import {describe,expect,it} from "vitest";
import {evaluateOfferRequest} from "./negotiation/offerPolicy";
import {validateHumanHandoff,type HumanHandoff} from "./conversation-orchestration/handoff";
const policy={mandateId:"m1",tenantId:"t1",inventoryUnitId:"v1",listingRevisionId:"r1",policyVersion:"p1",allowedAmountMinor:[90000000,100000000] as const,currency:"TRY" as const,maximumRounds:3,humanApprovalBelowMinor:95000000,expiresAt:"2026-09-02T00:00:00.000Z"};
const handoff:HumanHandoff={conversationId:"c1",tenantId:"t1",branchId:"b1",listingRevisionId:"r1",reason:"POLICY_BOUNDARY",assignedActorId:null,summaryChecksum:`sha256:${"a".repeat(64)}`,rawConversationShared:false,pausedAgentTools:true,expiresAt:"2026-09-02T00:00:00.000Z",executionAuthorized:false};
describe("offer policy and human handoff",()=>{
 it("uses a deterministic non-binding offer envelope",()=>expect(evaluateOfferRequest(policy,{requestedAmountMinor:97000000,round:1,now:"2026-09-01T00:00:00.000Z"})).toEqual({allowed:true,humanApprovalRequired:false,offerBinding:false}));
 it("escalates out-of-envelope and low offers",()=>{expect(evaluateOfferRequest(policy,{requestedAmountMinor:80000000,round:1,now:"2026-09-01T00:00:00.000Z"})).toMatchObject({allowed:false,humanApprovalRequired:true});expect(evaluateOfferRequest(policy,{requestedAmountMinor:92000000,round:1,now:"2026-09-01T00:00:00.000Z"})).toMatchObject({allowed:true,humanApprovalRequired:true});});
 it("pauses agent tools and shares only a checked summary",()=>expect(validateHumanHandoff(handoff)).toEqual([]));
});
