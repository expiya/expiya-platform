import {describe,expect,it} from "vitest";
import {currentUsedCarsConversationalCommerceReadiness,usedCarsConversationalCommerceReadinessSnapshot} from "./readiness/conversationalCommerceReadiness";
describe("conversational commerce readiness",()=>{
 it("records internal boundaries without claiming provider approval",()=>{expect(usedCarsConversationalCommerceReadinessSnapshot.prerequisites.sellerAgentMandateReady).toBe(true);expect(usedCarsConversationalCommerceReadinessSnapshot.prerequisites.channelProviderApproved).toBe(false);});
 it("blocks every real communication capability",()=>expect(currentUsedCarsConversationalCommerceReadiness).toMatchObject({ready:false,realChannelMessageAuthorized:false,liveVideoAuthorized:false,aiSellerAgentAuthorized:false,aiNegotiationAuthorized:false}));
});
