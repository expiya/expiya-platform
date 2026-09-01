import {describe,expect,it} from "vitest";
import {authorizeSellerAgentAction,type SellerAgentMandate} from "./seller-agent-policy/mandate";
const mandate:SellerAgentMandate={mandateId:"m1",tenantId:"t1",branchId:"b1",inventoryUnitId:"v1",listingRevisionId:"r1",capabilities:["EXPLAIN_PUBLIC_LISTING","PRESENT_POLICY_OFFER"],issuedByActorId:"owner",secondApproverActorId:"admin",policyVersion:"p1",startsAt:"2026-09-01T00:00:00.000Z",expiresAt:"2026-09-02T00:00:00.000Z",revokedAt:null,aiDisclosureRequired:true,bindingContractAllowed:false,paymentCollectionAllowed:false,hiddenFloorPriceDisclosureAllowed:false,purchaseInstructionAllowed:false};
describe("seller AI agent mandate",()=>{
 it("requires explicit AI disclosure",()=>expect(authorizeSellerAgentAction({mandate,action:"DESCRIBE_VEHICLE",now:"2026-09-01T01:00:00.000Z",aiDisclosed:false,evidenceVerified:false})).toMatchObject({allowed:false,reason:"AI_DISCLOSURE_REQUIRED"}));
 it("permits only granted scoped actions",()=>expect(authorizeSellerAgentAction({mandate,action:"OFFER",now:"2026-09-01T01:00:00.000Z",aiDisclosed:true,evidenceVerified:false})).toEqual({allowed:true}));
 it("forbids binding sale, payment, secret disclosure and purchase instructions",()=>{for(const action of ["ACCEPT_BINDING_SALE","COLLECT_PAYMENT","DISCLOSE_FLOOR_PRICE","SAY_BUY_OR_DONT_BUY"] as const)expect(authorizeSellerAgentAction({mandate,action,now:"2026-09-01T01:00:00.000Z",aiDisclosed:true,evidenceVerified:true}).allowed).toBe(false);});
});
