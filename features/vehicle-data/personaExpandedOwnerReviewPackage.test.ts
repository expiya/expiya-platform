import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const base=path.join(process.cwd(),"data/production/personas/evidence/expanded-regional-research/v3.9.0-2026-08-24/owner-review");
const raw=readFileSync(path.join(base,"owner-review-candidate.json"),"utf8");
type Claim={claimId:string;recommendation:"APPROVE_RECOMMENDED"|"REJECT_RECOMMENDED";reason:string|null;regionalEvidence:null|{url:string;supportedSpan:string;technicalAuthority:boolean};ownerReviewRequired:boolean};
type Family={familyId:string;exactVariantIds:string[];claims:Claim[];ownerDecision:null;rankingMutationAllowed:boolean};
const release=JSON.parse(raw) as {families:Family[];claims:Claim[];ownerApproval:null;activationPerformed:boolean;rankingMutationAllowed:boolean;scorePolicy:{maxPersonaContribution:number}};
const manifest=JSON.parse(readFileSync(path.join(base,"manifest.json"),"utf8")) as {payloadSha256:string;familyCount:number;claimCount:number;approveRecommendedClaimCount:number;rejectRecommendedClaimCount:number;unresolvedClaimCount:number};

describe("expanded persona owner-review package",()=>{
 it("makes all 150 families and 353 claims owner-decision ready",()=>{
  expect(release.families).toHaveLength(150);
  expect(release.claims).toHaveLength(353);
  expect(new Set(release.claims.map((claim)=>claim.claimId)).size).toBe(353);
  expect(manifest.unresolvedClaimCount).toBe(0);
 });
 it("requires a concrete regional span for every approval recommendation",()=>{
  for(const claim of release.claims.filter((item)=>item.recommendation==="APPROVE_RECOMMENDED")){
   expect(claim.regionalEvidence?.url).toMatch(/^https:\/\//u);
   expect(claim.regionalEvidence?.supportedSpan.length).toBeGreaterThan(0);
   expect(claim.regionalEvidence?.technicalAuthority).toBe(false);
  }
  expect(manifest.approveRecommendedClaimCount).toBe(348);
 });
 it("keeps unsupported or contradicted claims as explicit reject recommendations",()=>{
  const rejected=release.claims.filter((claim)=>claim.recommendation==="REJECT_RECOMMENDED");
  expect(rejected).toHaveLength(5);
  expect(rejected.every((claim)=>Boolean(claim.reason))).toBe(true);
  expect(manifest.rejectRecommendedClaimCount).toBe(5);
 });
 it("does not activate ranking and preserves the 0.75 bound",()=>{
  expect(release.ownerApproval).toBeNull();
  expect(release.activationPerformed).toBe(false);
  expect(release.rankingMutationAllowed).toBe(false);
  expect(release.scorePolicy.maxPersonaContribution).toBe(0.75);
  expect(release.families.every((family)=>family.ownerDecision===null&&!family.rankingMutationAllowed&&family.exactVariantIds.length>0)).toBe(true);
 });
 it("checksum-binds the owner-review payload",()=>{
  expect(manifest.payloadSha256).toBe(`sha256:${createHash("sha256").update(raw).digest("hex")}`);
  expect(manifest.familyCount).toBe(150);
  expect(manifest.claimCount).toBe(353);
 });
});
