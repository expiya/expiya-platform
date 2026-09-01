import {describe,expect,it} from "vitest";
import {verifyIdentityEnvelope,type VerifiedIdentityEnvelope} from "./identity/contracts";

const envelope:VerifiedIdentityEnvelope={issuer:"https://identity.expiya.test",audience:"partner.expiya.com",subjectId:"subject-1",authenticationTime:100,expiresAt:200,tokenId:"token-1",assurance:"AAL2",principal:{kind:"DEALER_USER",subjectId:"subject-1",actorId:"actor-1",tenantId:"tenant-1",role:"DEALER_ADMIN",branchIds:[]}};
const verify=(overrides:Partial<VerifiedIdentityEnvelope>={})=>verifyIdentityEnvelope({envelope:{...envelope,...overrides},expectedIssuer:envelope.issuer,expectedAudience:envelope.audience,now:150,consumedTokenIds:new Set(),requireAal2:true});

describe("used-cars identity envelope",()=>{
  it("accepts only the expected issuer, audience and AAL",()=>expect(verify()).toEqual({accepted:true}));
  it("fails closed for token replay",()=>expect(verifyIdentityEnvelope({envelope,expectedIssuer:envelope.issuer,expectedAudience:envelope.audience,now:150,consumedTokenIds:new Set(["token-1"]),requireAal2:true})).toEqual({accepted:false,reason:"TOKEN_REPLAY"}));
  it("rejects subject confusion and weak assurance",()=>{expect(verify({subjectId:"other"})).toEqual({accepted:false,reason:"SUBJECT_MISMATCH"});expect(verify({assurance:"AAL1"})).toEqual({accepted:false,reason:"AAL2_REQUIRED"});});
});
