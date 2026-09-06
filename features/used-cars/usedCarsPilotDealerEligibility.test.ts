import {describe,expect,it} from "vitest";
import {evaluatePilotDealer,type PilotDealerCandidate} from "./pilot/dealerEligibility";
const dealer:PilotDealerCandidate={segment:"CORPORATE_DEALER",turkishLegalEntity:true,taxRegistryVerified:true,tradeRegistryVerified:true,beneficialOwnerScreened:true,contractSigned:true,paymentGateSatisfied:true,operationalReviewPassed:true,moderationAgreementAccepted:true,individualSeller:false,sanctionsOrFraudHold:false};
describe("pilot dealer eligibility",()=>{
 it("recognizes a fully gated corporate candidate without authorizing publishing",()=>expect(evaluatePilotDealer(dealer)).toEqual({eligible:true,publishingAuthorized:false,codes:[]}));
 it("rejects individual sellers and legal entity gaps",()=>expect(evaluatePilotDealer({...dealer,turkishLegalEntity:false,individualSeller:true}).codes).toEqual(expect.arrayContaining(["TURKISH_LEGAL_ENTITY_REQUIRED","INDIVIDUAL_SELLER_FORBIDDEN"])));
 it("does not let membership bypass contract, payment or moderation",()=>expect(evaluatePilotDealer({...dealer,contractSigned:false,paymentGateSatisfied:false,moderationAgreementAccepted:false}).eligible).toBe(false));
});
