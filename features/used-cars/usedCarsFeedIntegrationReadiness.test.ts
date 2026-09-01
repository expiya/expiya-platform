import {describe,expect,it} from "vitest";
import {currentUsedCarsFeedIntegrationReadiness,usedCarsFeedIntegrationReadinessSnapshot} from "./readiness/feedIntegrationReadiness";
describe("feed integration readiness",()=>{
 it("records internal contracts without claiming provider certification",()=>{expect(usedCarsFeedIntegrationReadinessSnapshot.prerequisites.canonicalEnvelopeReady).toBe(true);expect(usedCarsFeedIntegrationReadinessSnapshot.prerequisites.sandboxCertificationPassed).toBe(false);});
 it("keeps real connection and writes blocked",()=>expect(currentUsedCarsFeedIntegrationReadiness).toMatchObject({ready:false,realFeedConnectionAuthorized:false,inventoryWriteAuthorized:false}));
});
