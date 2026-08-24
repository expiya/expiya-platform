import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe,expect,it } from "vitest";

const root=path.join(process.cwd(),"data/production/personas/evidence/owner-approval/requests/persona-v3.9-2026-08-24-01");
const raw=readFileSync(path.join(root,"owner-approval-request.json"),"utf8");
type Decision={claimId:string;recommendedDecision:"APPROVE"|"REJECT"};
type Family={familyId:string;exactVariantIds:string[];recommendedDecision:"APPROVE_TRAITS"|"APPROVE_PARTIAL_TRAITS"|"REJECT_TRAITS";approvedClaimIds:string[];rejectedClaimIds:string[]};
const request=JSON.parse(raw) as {approvalStatus:string;decisions:Decision[];families:Family[];ownerSignature:null;activationPerformed:boolean;rankingMutationAllowed:boolean;activePointerMutationAllowed:boolean;scorePolicy:{personaScoreCap:number}};
const manifest=JSON.parse(readFileSync(path.join(root,"manifest.json"),"utf8")) as {payloadSha256:string;familyCount:number;variantCount:number;claimCount:number;approveClaimCount:number;rejectClaimCount:number;fullyApprovedFamilyCount:number;partiallyApprovedFamilyCount:number;rejectedFamilyCount:number};

describe("persona V3.9 owner approval request",()=>{
 it("covers the complete catalog and claim scope",()=>{
  expect(request.families).toHaveLength(385);
  expect(request.decisions).toHaveLength(600);
  expect(new Set(request.decisions.map((decision)=>decision.claimId)).size).toBe(600);
  expect(new Set(request.families.flatMap((family)=>family.exactVariantIds)).size).toBe(549);
 });
 it("proposes 595 approvals and five evidence-governed rejections",()=>{
  expect(request.decisions.filter((decision)=>decision.recommendedDecision==="APPROVE")).toHaveLength(595);
  expect(request.decisions.filter((decision)=>decision.recommendedDecision==="REJECT")).toHaveLength(5);
  expect(manifest.approveClaimCount).toBe(595);
  expect(manifest.rejectClaimCount).toBe(5);
 });
 it("keeps owner signature and activation as separate gates",()=>{
  expect(request.approvalStatus).toBe("AWAITING_OWNER_SIGNATURE");
  expect(request.ownerSignature).toBeNull();
  expect(request.activationPerformed).toBe(false);
  expect(request.rankingMutationAllowed).toBe(false);
  expect(request.activePointerMutationAllowed).toBe(false);
  expect(request.scorePolicy.personaScoreCap).toBe(0.75);
 });
 it("checksum-binds the approval request",()=>{
  expect(manifest.payloadSha256).toBe(`sha256:${createHash("sha256").update(raw).digest("hex")}`);
  expect(manifest).toMatchObject({familyCount:385,variantCount:549,claimCount:600,fullyApprovedFamilyCount:381,partiallyApprovedFamilyCount:2,rejectedFamilyCount:2});
 });
});
