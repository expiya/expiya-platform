import {describe,expect,it} from "vitest";
import {assessEvidenceManifest,validateReleaseEvidence,type ReleaseEvidence} from "./readiness/releaseEvidence";
const evidence:ReleaseEvidence={evidenceId:"e1",domain:"DATABASE_RLS",stage:"STAGING_INTEGRATION",kind:"SECURITY_REVIEW",checksum:`sha256:${"a".repeat(64)}`,issuedAt:"2026-09-01",expiresAt:null,approvedBy:"security-owner",independentReviewerId:"reviewer",supersededAt:null};
describe("release evidence manifest",()=>{
 it("accepts immutable independently reviewed evidence",()=>expect(validateReleaseEvidence({evidence,now:"2026-09-02",requireIndependentReview:true})).toEqual([]));
 it("rejects self review, expiry and superseded evidence",()=>expect(validateReleaseEvidence({evidence:{...evidence,independentReviewerId:"security-owner",expiresAt:"2026-09-01",supersededAt:"2026-09-01"},now:"2026-09-02",requireIndependentReview:true})).toEqual(expect.arrayContaining(["EVIDENCE_EXPIRED","EVIDENCE_SUPERSEDED","SELF_REVIEW_FORBIDDEN"])));
 it("reports missing required domain evidence",()=>expect(assessEvidenceManifest({evidence:[evidence],required:[{domain:"DATABASE_RLS",kind:"SECURITY_REVIEW"},{domain:"IDENTITY",kind:"PROVIDER_CONTRACT"}],now:"2026-09-02"})).toMatchObject({complete:false,missing:[{domain:"IDENTITY",kind:"PROVIDER_CONTRACT"}]}));
});
