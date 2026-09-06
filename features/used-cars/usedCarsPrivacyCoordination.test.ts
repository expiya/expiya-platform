import {describe,expect,it} from "vitest";
import {evaluatePrivacyCoordination} from "./privacy/coordination";
const context={receivedAt:"2026-09-01",dueAt:"2026-10-01",now:"2026-09-15",legalHoldActive:false,legalHoldScopeMatches:false,recipientTenantIds:["t1"],recipientNotificationsSent:["t1"],controllerDecisionRecorded:true,rejectionReasonCode:null};
describe("privacy coordination",()=>{
 it("accepts an in-SLA fully coordinated request",()=>expect(evaluatePrivacyCoordination(context)).toEqual({fulfillmentBlocked:false,missingRecipients:[],codes:[],automaticLegalRejectionAllowed:false}));
 it("reports missing recipient notification",()=>expect(evaluatePrivacyCoordination({...context,recipientNotificationsSent:[]}).codes).toContain("RECIPIENT_NOTIFICATION_PENDING"));
 it("rejects overbroad legal holds and never auto-rejects legal rights",()=>expect(evaluatePrivacyCoordination({...context,legalHoldActive:true,legalHoldScopeMatches:false})).toMatchObject({fulfillmentBlocked:true,automaticLegalRejectionAllowed:false,codes:["OVERBROAD_LEGAL_HOLD"]}));
});
