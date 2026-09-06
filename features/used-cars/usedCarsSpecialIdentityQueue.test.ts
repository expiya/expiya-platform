import {describe,expect,it} from "vitest";
import {evaluateSpecialIdentityRequest,type SpecialIdentityRequest} from "./taxonomy/specialIdentityQueue";
const request:SpecialIdentityRequest={requestId:"r1",tenantId:"t1",vehicleClass:"CLASSIC",sellerLabel:"1970 coupe",approximatePeriod:"1970–1975",evidenceKinds:["REGISTRATION","CHASSIS_PHOTO"],vinOrSerialStoredPrivately:true,sellerCanCreateCanonicalIdentity:false};
describe("special identity queue",()=>{
 it("routes classic vehicles to specialist second review",()=>expect(evaluateSpecialIdentityRequest(request)).toEqual({accepted:true,priority:"SPECIALIST",secondReviewRequired:true}));
 it("requires evidence, period and private identifier handling",()=>{expect(evaluateSpecialIdentityRequest({...request,evidenceKinds:[]})).toMatchObject({accepted:false,reason:"EVIDENCE_REQUIRED"});expect(evaluateSpecialIdentityRequest({...request,approximatePeriod:null})).toMatchObject({accepted:false,reason:"PERIOD_REQUIRED"});expect(evaluateSpecialIdentityRequest({...request,vinOrSerialStoredPrivately:false})).toMatchObject({accepted:false,reason:"PRIVATE_IDENTIFIER_HANDLING_REQUIRED"});});
 it("never grants canonical creation to the seller",()=>expect(request.sellerCanCreateCanonicalIdentity).toBe(false));
});
