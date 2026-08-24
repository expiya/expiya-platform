import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root=process.cwd();
const existing=JSON.parse(readFileSync(path.join(root,"data/production/personas/evidence/owner-reviewed/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24-evidence-sufficient-only/owner-reviewed-candidate.json"),"utf8"));
const expanded=JSON.parse(readFileSync(path.join(root,"data/production/personas/evidence/expanded-regional-research/v3.9.0-2026-08-24/owner-review/owner-review-candidate.json"),"utf8"));
const expandedByClaim=new Map(expanded.claims.map((claim)=>[claim.claimId,claim]));
const claimById=new Map(existing.claims.map((claim)=>[claim.claimId,claim]));
const decisions=existing.claims.map((claim)=>{
 if(claim.decision==="APPROVE") return {claimId:claim.claimId,familyId:claim.familyId,trait:claim.trait,recommendedDecision:"APPROVE",decisionBasis:claim.decisionBasis,priorOwnerDecision:"APPROVE",regionalEvidence:null};
 const researched=expandedByClaim.get(claim.claimId);
 if(!researched) throw new Error(`Missing expanded decision for ${claim.claimId}`);
 return {claimId:claim.claimId,familyId:claim.familyId,trait:claim.trait,recommendedDecision:researched.recommendation==="APPROVE_RECOMMENDED"?"APPROVE":"REJECT",decisionBasis:researched.basis,priorOwnerDecision:"DEFER_RESEARCH",regionalEvidence:researched.regionalEvidence,reason:researched.reason};
});
const decisionsByFamily=new Map();
for(const decision of decisions){const values=decisionsByFamily.get(decision.familyId)??[];values.push(decision);decisionsByFamily.set(decision.familyId,values);}
const families=existing.families.map((family)=>{
 const familyDecisions=decisionsByFamily.get(family.familyId)??[];
 const approved=familyDecisions.filter((decision)=>decision.recommendedDecision==="APPROVE");
 const rejected=familyDecisions.filter((decision)=>decision.recommendedDecision==="REJECT");
 return {familyId:family.familyId,canonicalBrand:family.canonicalBrand,canonicalModel:family.canonicalModel,exactVariantIds:family.exactVariantIds,recommendedDecision:rejected.length===0?"APPROVE_TRAITS":approved.length===0?"REJECT_TRAITS":"APPROVE_PARTIAL_TRAITS",approvedTraits:[...new Set(approved.map((decision)=>decision.trait))],rejectedTraits:[...new Set(rejected.map((decision)=>decision.trait))],approvedClaimIds:approved.map((decision)=>decision.claimId),rejectedClaimIds:rejected.map((decision)=>decision.claimId)};
});
for(const decision of decisions) if(!claimById.has(decision.claimId)) throw new Error(`Unknown claim ${decision.claimId}`);
const request={schemaVersion:"3.9.0-owner-approval-request.1",requestId:"PERSONA-V39-OWNER-APPROVAL-2026-08-24-01",createdAt:"2026-08-24T00:00:00.000Z",authorityRequested:"PRODUCT_OWNER",approvalStatus:"AWAITING_OWNER_SIGNATURE",decisionScope:"ALL_600_PERSONA_CLAIMS",scorePolicy:{formula:"BASE_SCORE_PLUS_CAPPED_PERSONA",personaScoreCap:0.75,decisionUse:"BOUNDED_SOFT_RANKING_ONLY"},recommendedDisposition:{approveClaimCount:decisions.filter((decision)=>decision.recommendedDecision==="APPROVE").length,rejectClaimCount:decisions.filter((decision)=>decision.recommendedDecision==="REJECT").length},families,decisions,ownerSignature:null,activationPerformed:false,rankingMutationAllowed:false,activePointerMutationAllowed:false};
const out=path.join(root,"data/production/personas/evidence/owner-approval/requests/persona-v3.9-2026-08-24-01");mkdirSync(out,{recursive:true});const raw=`${JSON.stringify(request,null,2)}\n`;writeFileSync(path.join(out,"owner-approval-request.json"),raw);
const manifest={requestId:request.requestId,payloadSha256:`sha256:${createHash("sha256").update(raw).digest("hex")}`,familyCount:families.length,variantCount:new Set(families.flatMap((family)=>family.exactVariantIds)).size,claimCount:decisions.length,approveClaimCount:request.recommendedDisposition.approveClaimCount,rejectClaimCount:request.recommendedDisposition.rejectClaimCount,fullyApprovedFamilyCount:families.filter((family)=>family.recommendedDecision==="APPROVE_TRAITS").length,partiallyApprovedFamilyCount:families.filter((family)=>family.recommendedDecision==="APPROVE_PARTIAL_TRAITS").length,rejectedFamilyCount:families.filter((family)=>family.recommendedDecision==="REJECT_TRAITS").length,approvalStatus:request.approvalStatus,activationPerformed:false};writeFileSync(path.join(out,"manifest.json"),`${JSON.stringify(manifest,null,2)}\n`);console.log(JSON.stringify(manifest,null,2));
