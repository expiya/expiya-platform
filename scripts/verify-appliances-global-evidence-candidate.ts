import { readFile } from "node:fs/promises";
import path from "node:path";
import { stableJson, verifySha256, validateGlobalEvidenceCandidate } from "../features/appliances/globalEvidence";

const root = process.cwd();
const candidateId = "APPLIANCES-GLOBAL-EVIDENCE-TR-v0.1-rc1";
const dir = path.join(root,"data/production/appliances/global-evidence/release-candidates",candidateId);
const research = path.join(root,"data/research/appliances-global-evidence-01");
type ProductIdRecord = { readonly productId: string };
type ConflictRecord = ProductIdRecord & { readonly disposition: string };
type AdvisorRecord = { readonly advisorReadOnly: boolean; readonly decisionAuthority: string; readonly candidateEffect: string };
const parseJson = <T>(raw: string): T => JSON.parse(raw) as T;

async function main(){
  const [candidateRaw,coverageRaw,dryRunRaw,manifestRaw,completionRaw,ledgerRaw,sourceRegistryRaw,unresolvedRaw,manualExclusionsRaw,admittedManualsRaw]=await Promise.all(["candidate.json","coverage-report.json","decision-neutrality-dry-run.json","manifest.json","completion-report.md"].map(x=>readFile(path.join(dir,x),"utf8")).concat(["research-ledger.json","source-registry.json","unresolved-ledger.json","manual-exclusions.json","admitted-manuals.json"].map(x=>readFile(path.join(research,x),"utf8"))));
  const candidate=JSON.parse(candidateRaw),coverage=JSON.parse(coverageRaw),dryRun=JSON.parse(dryRunRaw),manifest=JSON.parse(manifestRaw),ledger=JSON.parse(ledgerRaw),unresolved=JSON.parse(unresolvedRaw),manualFailures:string[]=[];
  for(const manual of manifest.manualByteBindings){const bytes=await readFile(path.join(root,manual.path));if(!verifySha256(manual.sha256,bytes)||bytes.length!==manual.byteLength)manualFailures.push(`MANUAL_DIGEST_MISMATCH:${manual.productId}`);}
  const currentPointerFailures:string[]=[];for(const [relative,expected] of Object.entries(manifest.activePointerHashesAfter)){const bytes=await readFile(path.join(root,relative));if(!verifySha256(String(expected),bytes))currentPointerFailures.push(`ACTIVE_POINTER_MISMATCH:${relative}`);}
  const composite={candidate:candidateRaw.trim(),coverage:coverageRaw.trim(),ledger:ledgerRaw.trim(),sourceRegistry:sourceRegistryRaw.trim(),unresolved:unresolvedRaw.trim(),dryRun:dryRunRaw.trim(),completionReport:completionRaw.trim(),manualExclusions:manualExclusionsRaw.trim(),admittedManuals:admittedManualsRaw.trim(),manualByteBindings:manifest.manualByteBindings,pointerHashesBefore:manifest.activePointerHashesBefore,pointerHashesAfter:manifest.activePointerHashesAfter};
  const admittedIds=new Set(parseJson<readonly ProductIdRecord[]>(admittedManualsRaw).map((manual)=>manual.productId));
  const checks={candidate:verifySha256(manifest.candidateSha256,candidateRaw.trim()),coverage:verifySha256(manifest.coverageSha256,coverageRaw.trim()),dryRun:verifySha256(manifest.dryRunSha256,dryRunRaw.trim()),ledger:verifySha256(manifest.researchLedgerSha256,ledgerRaw.trim()),sourceRegistry:verifySha256(manifest.sourceRegistrySha256,sourceRegistryRaw.trim()),unresolved:verifySha256(manifest.unresolvedLedgerSha256,unresolvedRaw.trim()),completion:verifySha256(manifest.completionReportSha256,completionRaw.trim()),manualExclusions:verifySha256(manifest.manualExclusionsSha256,manualExclusionsRaw.trim()),admittedManuals:verifySha256(manifest.admittedManualsSha256,admittedManualsRaw.trim()),release:verifySha256(manifest.releaseDigest,stableJson(composite)),members:candidate.members.length===97&&ledger.rows.length===97,categories:new Set((candidate.members as readonly { readonly categoryId: string }[]).map((x)=>x.categoryId)).size===24,canonicalCounts:coverage.before.manuals===14&&coverage.after.manuals===17&&coverage.before.l9Entries===9&&coverage.after.l9Entries===16&&coverage.before.absent===213&&coverage.after.absent===207,candidateManuals:candidate.manualCandidates.length===3,newL9:candidate.l9AdvisorKnowledge.length===7,admittedExcludedFromUnresolved:(unresolved.rows as readonly ProductIdRecord[]).every((row)=>!admittedIds.has(row.productId)),exactAndFamilyPreserved:coverage.after.exactVerified===1253&&candidate.assertions.length===60&&candidate.dailyLifeInterpretations.length===60,lgUnknownExcluded:(candidate.conflicts as readonly ConflictRecord[]).some((x)=>x.productId==="LG_GC_B569NLLM_TR"&&x.disposition==="UNKNOWN_EXCLUDED"),authorityIsolation:(candidate.l9AdvisorKnowledge as readonly AdvisorRecord[]).every((x)=>x.advisorReadOnly===true&&x.decisionAuthority==="NONE"&&x.candidateEffect==="NONE")&&Object.entries(candidate.boundaries).every(([key,value])=>key==="l9Authority"?value==="ADVISOR_READ_ONLY":value==="NONE"),activePointersChanged:dryRun.activePointersChanged===false&&stableJson(manifest.activePointerHashesAfter)===stableJson(manifest.activePointerHashesBefore)};
  const validationIssues=validateGlobalEvidenceCandidate({assertions:candidate.assertions,sources:candidate.sources,manuals:candidate.manualCandidates,conflicts:candidate.conflicts,boundaries:candidate.boundaries});
  const issues=[...Object.entries(checks).filter(([,ok])=>!ok).map(([key])=>`CHECK_FAILED:${key}`),...manualFailures,...currentPointerFailures,...validationIssues];
  console.log(JSON.stringify({candidateId,status:issues.length?"FAIL":"PASS",checks,manualChecksumsVerified:manifest.manualByteBindings.length,issues},null,2));
  if(issues.length)process.exitCode=1;
}
void main();
