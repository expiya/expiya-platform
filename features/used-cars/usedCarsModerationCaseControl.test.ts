import {describe,expect,it} from "vitest";
import {evaluateCaseDecision,type ModerationCaseControl} from "./moderation/caseControl";
const control:ModerationCaseControl={caseId:"c1",tenantId:"t1",subjectRevisionId:"r1",assignedActorId:"m1",assignedTeam:"TRUST_SAFETY",firstDecisionActorId:"m1",secondReviewerActorId:"m2",evidenceSnapshotChecksum:`sha256:${"a".repeat(64)}`,expiresAt:"2026-09-02T00:00:00.000Z",status:"SECOND_REVIEW"};
describe("moderation case control",()=>{
 it("allows assigned independent review of immutable evidence",()=>expect(evaluateCaseDecision({control,actorId:"m2",subjectRevisionId:"r1",now:"2026-09-01T00:00:00.000Z",highImpact:true})).toEqual({allowed:true,codes:[]}));
 it("rejects stale revision and assignment",()=>expect(evaluateCaseDecision({control,actorId:"x",subjectRevisionId:"r2",now:"2026-09-03T00:00:00.000Z",highImpact:true}).codes).toEqual(expect.arrayContaining(["ASSIGNMENT_MISMATCH","ASSIGNMENT_EXPIRED","REVISION_MISMATCH"])));
 it("enforces four-eyes for high impact decisions",()=>expect(evaluateCaseDecision({control:{...control,secondReviewerActorId:null},actorId:"m1",subjectRevisionId:"r1",now:"2026-09-01T00:00:00.000Z",highImpact:true}).codes).toContain("SECOND_REVIEW_REQUIRED"));
});
