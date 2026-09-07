import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT="outputs/catalog-factory-active-coverage-wave-03-discovery-01";
const ACTIVE="data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01/catalog-overlay.json";
const SOURCE="outputs/catalog-factory-wave-02-next-batch-8-owner-review-01/categories";
const CATEGORIES=["REFRIGERATOR","DISHWASHER","DRYER","MONITOR"] as const;
const NOW="2026-09-07T10:00:00.000Z";
type CandidateProduct={exactProductId:string;identity:{brand:string;model:string;exactVariant:string};categoryId?:string;personaOrNeutral?:{hierarchy?:string[]};[key:string]:unknown};
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
export const digest=(value:unknown)=>createHash("sha256").update(stable(value)).digest("hex");
const fileDigest=(value:string)=>createHash("sha256").update(value).digest("hex");
const semanticKey=(product:CandidateProduct)=>[product.categoryId??product.personaOrNeutral?.hierarchy?.[1],product.identity.brand,product.identity.model,product.identity.exactVariant].map((x)=>String(x).toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/g,"")).join(":");

export async function generateActiveCoverageWave03(base=process.cwd()){
 const activeRaw=await readFile(path.join(base,ACTIVE),"utf8");
 const active=JSON.parse(activeRaw) as {releaseId:string;overlayDigest:string;totals:{before:number;additions:number;active:number};categories:{categoryId:string;exactProductIds:string[];additions:CandidateProduct[]}[]};
 if(active.releaseId!=="CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01"||active.totals.before!==80||active.totals.additions!==14||active.totals.active!==94)throw new Error("FAIL_CLOSED_ACTIVE_AUTHORITY_NOT_EXACT14_80_PLUS_14_EQUALS_94");
 const activeProducts=active.categories.flatMap(category=>category.additions.map(product=>({...product,categoryId:category.categoryId})));
 const activeIds=new Set(active.categories.flatMap(category=>category.exactProductIds));
 const activeSemantic=new Set(activeProducts.map(semanticKey));
 const observations:{categoryId:string;exactProductId:string;semanticKey:string;outcome:"REJECTED"|"CANDIDATE";reasonCode:string;sourceArtifact:{path:string;sha256:string;categoryDigest:string};product:CandidateProduct}[]=[];
 for(const category of CATEGORIES){
  const sourcePath=`${SOURCE}/${category.toLowerCase().replaceAll("_","-")}/owner-review-category.json`;
  const sourceRaw=await readFile(path.join(base,sourcePath),"utf8");
  const source=JSON.parse(sourceRaw) as {products:CandidateProduct[];categoryDigest:string};
  for(const product of source.products){
   const exactDuplicate=activeIds.has(product.exactProductId),semanticDuplicate=activeSemantic.has(semanticKey({...product,categoryId:category}));
   observations.push({categoryId:category,exactProductId:product.exactProductId,semanticKey:semanticKey({...product,categoryId:category}),outcome:exactDuplicate||semanticDuplicate?"REJECTED":"CANDIDATE",reasonCode:exactDuplicate?"DUPLICATE_EXACT_PRODUCT_ID_ACTIVE_EXACT14":semanticDuplicate?"DUPLICATE_SEMANTIC_IDENTITY_ACTIVE_EXACT14":"BOUNDED_COVERAGE_GAP_CANDIDATE",sourceArtifact:{path:sourcePath,sha256:fileDigest(sourceRaw),categoryDigest:source.categoryDigest},product});
  }
 }
 const candidates=observations.filter(x=>x.outcome==="CANDIDATE");
 const rejected=observations.filter(x=>x.outcome==="REJECTED");
 const categoryCounts=Object.fromEntries(active.categories.map(x=>[x.categoryId,x.exactProductIds.length]));
 const packetBase={schemaVersion:"catalog-factory-active-coverage-wave-03-discovery/v0.1",workUnitId:"WU-CATALOG-FACTORY-ACTIVE-COVERAGE-WAVE-03-DISCOVERY-01",status:"OWNER_REVIEW_PREFLIGHT_PENDING_NOT_ACTIVE",generatedAt:NOW,authorityBaseline:{requiredReleaseId:active.releaseId,requiredOverlayDigest:active.overlayDigest,sourceFile:ACTIVE,sourceFileSha256:fileDigest(activeRaw),before:80,additions:14,active:94,oldExact15:{lifecycle:"PROHIBITED_SUPERSEDED_IDENTITY_SET",admissionAllowed:false}},selection:{policy:"LOWEST_ACTIVE_COUNTS_WITH_READY_IMMUTABLE_SOURCE_ARTIFACTS",boundedCategories:CATEGORIES,activeCounts:Object.fromEntries(CATEGORIES.map(x=>[x,categoryCounts[x]])),excludedHighCoverageCategory:"WASHING_MACHINE",observations:observations.length,candidates:candidates.length,rejected:rejected.length},reconciliation:{identityMethods:["EXACT_PRODUCT_ID","CATEGORY_BRAND_MODEL_EXACT_VARIANT_SEMANTIC_KEY"],observations:observations.map(x=>({categoryId:x.categoryId,exactProductId:x.exactProductId,semanticKey:x.semanticKey,outcome:x.outcome,reasonCode:x.reasonCode,sourceArtifact:x.sourceArtifact})),noSilentDrop:observations.length===candidates.length+rejected.length,duplicatePolicy:"FAIL_CLOSED_REJECT"},candidates:candidates.map(({product,...observation})=>({...product,categoryId:observation.categoryId,candidateProvenance:{sourceArtifact:observation.sourceArtifact,semanticKey:observation.semanticKey},lifecycle:"IMMUTABLE_CANDIDATE_NOT_ACTIVE"})),evidenceBoundary:{sourceArtifactsImmutable:true,researchPerformed:false,technicalClaims:"PRESERVED_FROM_REFERENCED_SNAPSHOT_BOUND_SOURCE_ARTIFACT",unresolvedFields:"UNKNOWN_NOT_FALSE",commerceTechnicalAuthority:"NONE"},rankingBoundary:{catalogOrder:false,price:false,rating:false,seller:false,brandPrestige:false,persona:false,unknown:false},activationBoundary:{activePointerWrite:false,domainPointerWrite:false,runtimeMutation:false,databaseMutation:false,productionMutation:false,preview:false,deployment:false,push:false,ownerApprovalRequired:true},reviewDecision:"PENDING_EXPLICIT_OWNER_APPROVAL"};
 const packet={...packetBase,candidateDigest:digest(packetBase.candidates),packetDigest:digest(packetBase)};
 const preflight={schemaVersion:"catalog-factory-owner-review-preflight/v0.1",workUnitId:packet.workUnitId,status:"READY_FOR_OWNER_REVIEW_NOT_APPROVED",candidateDigest:packet.candidateDigest,checks:{exact14Authority:packet.authorityBaseline.active===94,oldExact15Prohibited:!packet.authorityBaseline.oldExact15.admissionAllowed,noDuplicateCandidates:rejected.length===0,noSilentDrop:packet.reconciliation.noSilentDrop,evidenceBoundaryPreserved:true,rankingBoundaryPreserved:Object.values(packet.rankingBoundary).every(x=>x===false),mutationBoundaryPreserved:Object.entries(packet.activationBoundary).filter(([key])=>key!=="ownerApprovalRequired").every(([,value])=>value===false)},decisionRequired:"OWNER_MUST_APPROVE_CANDIDATE_SET_IN_A_SEPARATE GOVERNANCE EVENT; THIS ARTIFACT GRANTS NO AUTHORITY"};
 await mkdir(path.join(base,OUT),{recursive:true});
 await writeFile(path.join(base,OUT,"CANDIDATE_PACKET.json"),`${stable(packet)}\n`);
 await writeFile(path.join(base,OUT,"OWNER_REVIEW_PREFLIGHT.json"),`${stable(preflight)}\n`);
 await writeFile(path.join(base,OUT,"CANDIDATE_PACKET.sha256"),`sha256:${fileDigest(`${stable(packet)}\n`)}\n`);
 await writeFile(path.join(base,OUT,"README.md"),`# Catalog Factory active coverage Wave-03 discovery 01\n\nCandidate-only work unit \`${packet.workUnitId}\` preserves the exact-14 active authority (80 + 14 = 94). The superseded exact-15 identity set is prohibited.\n\nSelected coverage gaps: ${CATEGORIES.map(x=>`${x} (${categoryCounts[x]} active)`).join(", ")}. Candidate count: ${candidates.length}; rejected duplicates: ${rejected.length}. Unknown values remain UNKNOWN and have no ranking effect.\n\nOwner review is required before any approval, activation, pointer, runtime, database, production, preview, deployment or push action.\n\nCandidate digest: \`${packet.candidateDigest}\`\n`);
 return {packet,preflight};
}
if(process.argv[1]?.endsWith("generate.ts"))generateActiveCoverageWave03().then(({packet})=>console.log(JSON.stringify({workUnitId:packet.workUnitId,candidateDigest:packet.candidateDigest,selection:packet.selection},null,2)));
