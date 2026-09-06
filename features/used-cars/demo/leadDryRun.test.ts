import { describe,expect,it } from "vitest";
import { dryRunDemoLead } from "./leadDryRun";
describe("vehicle detail lead handoff dry-run",()=>{
  it("requires explicit dealer transfer and channel consent",()=>{const result=dryRunDemoLead({listingId:"listing-demo",inventoryUnitId:"unit-demo",intent:"REQUEST_DEALER_CONTACT",consentGranted:false}); expect(result.accepted).toBe(false); expect(result.errorCodes).toContain("CONSENT_REQUIRED"); expect(result.handoff).toBeUndefined();});
  it("builds a validated but never authorized handoff",()=>{const result=dryRunDemoLead({listingId:"listing-demo",inventoryUnitId:"unit-demo",intent:"REQUEST_TEST_DRIVE",consentGranted:true}); expect(result.accepted).toBe(true); expect(result.handoff).toMatchObject({intent:"REQUEST_TEST_DRIVE",rawConversationIncluded:false,executionAuthorized:false}); expect(result.executionAuthorized).toBe(false); expect(result.writeAuthorized).toBe(false); expect(result.handoff?.sharedFieldAllowlist).not.toContain("rawConversation");});
  it("keeps marketing consent separate",()=>{const result=dryRunDemoLead({listingId:"listing-demo",inventoryUnitId:"unit-demo",intent:"REQUEST_QUOTE",consentGranted:true}); expect(JSON.stringify(result.handoff)).not.toContain("marketingGranted");});
});
