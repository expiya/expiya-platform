import {describe,expect,it} from "vitest";
import {acceptPaymentEvent,canTransitionInvoice,canTransitionSubscription} from "./memberships/billingLifecycle";
describe("membership billing lifecycle",()=>{
 it("uses controlled subscription and invoice transitions",()=>{expect(canTransitionSubscription("PAST_DUE","SUSPENDED")).toBe(true);expect(canTransitionSubscription("CANCELLED","ACTIVE")).toBe(false);expect(canTransitionInvoice("DRAFT","PAID")).toBe(false);expect(canTransitionInvoice("ISSUED","PAID")).toBe(true);});
 it("requires verified idempotent payment events",()=>expect(acceptPaymentEvent({providerEventId:"p1",tenantId:"t1",amountMinor:10000,currency:"TRY",signatureVerified:false,idempotencyRecorded:true,invoiceId:"i1"})).toMatchObject({accepted:false,reason:"SIGNATURE_INVALID"}));
 it("does not auto-activate membership after payment",()=>expect(acceptPaymentEvent({providerEventId:"p1",tenantId:"t1",amountMinor:10000,currency:"TRY",signatureVerified:true,idempotencyRecorded:true,invoiceId:"i1"})).toEqual({accepted:true,membershipActivatedAutomatically:false}));
});
