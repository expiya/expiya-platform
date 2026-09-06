import {describe,expect,it} from "vitest";
import {canReleaseQuarantine,createListingQuarantinePlan,requiredQuarantineActions} from "./moderation/quarantine";
describe("listing quarantine",()=>{
 it("creates a fail-closed non-executable plan",()=>{const plan=createListingQuarantinePlan({listingId:"l1",tenantId:"t1",revisionId:"r1",reason:"FRAUD_SIGNAL",idempotencyKey:"k1",requestedByActorId:"m1"});expect(plan.executionAuthorized).toBe(false);expect(plan.actions).toEqual(requiredQuarantineActions);});
 it("requires evidence preservation and lead pause",()=>{expect(requiredQuarantineActions).toContain("PRESERVE_EVIDENCE");expect(requiredQuarantineActions).toContain("PAUSE_LEAD_HANDOFF");});
 it("requires fresh revision and independent approval for release",()=>{expect(canReleaseQuarantine({caseClosed:true,conflictResolved:true,secondReviewApproved:true,freshStockConfirmed:true,freshModerationRevisionId:"r2"})).toBe(true);expect(canReleaseQuarantine({caseClosed:true,conflictResolved:true,secondReviewApproved:false,freshStockConfirmed:true,freshModerationRevisionId:"r2"})).toBe(false);});
});
