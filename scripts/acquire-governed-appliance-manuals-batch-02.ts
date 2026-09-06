import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { finalizeRelease, sha256, splitExtractedPages, stableJson, validateOfficialManualUrl, validateRelease, type GovernedManual, type GovernedManualRelease, type L9Knowledge, type ManualBlocker } from "../features/appliances/manuals/governedManuals";

const exec = promisify(execFile);
const root = process.cwd();
const priorId = "APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v0.1";
const releaseId = "APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v0.2";
const base = path.join(root, "data/production/appliances/manuals/releases");
const priorDir = path.join(base, priorId);
const output = path.join(base, releaseId);
const python = process.env.CODEX_PYTHON_PATH ?? "/Users/serdarakgul/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const now = process.env.MANUAL_RETRIEVED_AT ?? "2026-09-04T18:30:00.000Z";

type Candidate = {
  productId: string; sourceId: string; sourceUrl: string; exactCodes: readonly string[];
  resolutionMethod: "SUPPORT_PAGE_DOCUMENT_EXTRACTION" | "PRODUCT_PAGE_DOCUMENT_EXTRACTION";
  recipe: readonly { needle: string; statement: string; kind: L9Knowledge["knowledgeKind"]; professional: boolean }[];
};
type Attempt = { productId: string; sourceUrl?: string; method: string; outcome: string; detail: string; retryable: boolean };

const candidates: readonly Candidate[] = [
  { productId:"BOSCH_HXR390H21T_TR",sourceId:"BOSCH-HXR390H21T-MANUAL-TR",sourceUrl:"https://media3.bsh-group.com/Documents/9001946020_F.pdf",exactCodes:["HXR390H21T"],resolutionMethod:"PRODUCT_PAGE_DOCUMENT_EXTRACTION",recipe:[{needle:"eğitimli bir uzman",statement:"Gaz türü, gaz bağlantısı ve soketsiz elektrik bağlantısı eğitimli uzman tarafından doğrulanmalıdır; kullanıcıya DIY bağlantı adımı verilmez.",kind:"INSTALLATION",professional:true}] },
  { productId:"BAYMAK_XLS65_TR",sourceId:"BAYMAK-XLS65-MANUAL-TR",sourceUrl:"https://www.baymak.com.tr/media/7498/baymak-aqua-x-termosifon-montaj-ve-kullanim-kilavuzu.pdf",exactCodes:["65 X-LS","X-LS 65"],resolutionMethod:"PRODUCT_PAGE_DOCUMENT_EXTRACTION",recipe:[{needle:"yetkili servis",statement:"Montaj, ilk çalıştırma ve güvenlik kontrolleri exact kılavuz sınırında yetkili servis veya uygun yetkinlikte profesyonel tarafından doğrulanmalıdır.",kind:"INSTALLATION",professional:true},{needle:"magnezyum anot",statement:"Korozyon korumasına ilişkin magnezyum anot bakımı exact kılavuz ve yetkili servis planına göre doğrulanmalıdır.",kind:"MAINTENANCE",professional:true}] },
  { productId:"PHILIPS_HR7778_00_TR",sourceId:"PHILIPS-HR7778-MANUAL-PDF",sourceUrl:"https://dam.versuni.com/m/5e5ac195308416da/original/User-Manual-Philips-7000-Series-Food-processor-HR7778_00.pdf",exactCodes:["HR7778"],resolutionMethod:"SUPPORT_PAGE_DOCUMENT_EXTRACTION",recipe:[{needle:"temizlemeden önce",statement:"Temizlikten önce cihazın enerjisi kesilmeli; keskin bıçak ve diskler exact kılavuzdaki güvenli tutuş ve temizlik sınırlarıyla ele alınmalıdır.",kind:"MAINTENANCE",professional:false}] },
  { productId:"PHILIPS_EP2220_10_TR",sourceId:"PHILIPS-EP2220-MANUAL-PDF",sourceUrl:"https://dam.versuni.com/m/43f5d99f5574a42e/original/CO_2025_800-Series_1200-Series_2200-Series_3200-Series_Manual-Philips_EU9.pdf",exactCodes:["EP2220"],resolutionMethod:"SUPPORT_PAGE_DOCUMENT_EXTRACTION",recipe:[{needle:"kireç çözme",statement:"Kireç çözme ve gıda temaslı parçaların temizliği exact kılavuzdaki bakım programına göre yürütülmelidir; sonuç veya bakım aralığı garantisi değildir.",kind:"MAINTENANCE",professional:false}] },
  { productId:"BOSCH_HBF534ES3T_TR",sourceId:"BOSCH-HBF534ES3T-DOCUMENT-TR",sourceUrl:"https://media3.bsh-group.com/Documents/9001856380_F.pdf",exactCodes:["HBF534ES3T"],resolutionMethod:"PRODUCT_PAGE_DOCUMENT_EXTRACTION",recipe:[] },
  { productId:"BOSCH_DWP64CC50T_TR",sourceId:"BOSCH-DWP64CC50T-DOCUMENT-F-TR",sourceUrl:"https://media3.bsh-group.com/Documents/9001269416_F.pdf",exactCodes:["DWP64CC50T"],resolutionMethod:"PRODUCT_PAGE_DOCUMENT_EXTRACTION",recipe:[] },
  { productId:"BOSCH_DWP64CC50T_TR",sourceId:"BOSCH-DWP64CC50T-DOCUMENT-H-TR",sourceUrl:"https://media3.bsh-group.com/Documents/9001269413_H.pdf",exactCodes:["DWP64CC50T"],resolutionMethod:"PRODUCT_PAGE_DOCUMENT_EXTRACTION",recipe:[] },
] as const;

const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toUpperCase().replace(/[^A-Z0-9]/gu, "");
const findLocator = (pages: readonly string[], codes: readonly string[]) => {
  for (const code of codes) { const needle=normalize(code), page=pages.findIndex(x=>normalize(x).includes(needle)); if(page>=0){const section=pages[page].split("\n").map(x=>x.trim()).find(x=>normalize(x).includes(needle))??code;return {code,locator:{page:page+1,section}};} }
  return undefined;
};
async function extractPdf(bytesPath:string):Promise<string>{
  const code="import pdfplumber,sys\nwith pdfplumber.open(sys.argv[1]) as p:\n print('\\f'.join((x.extract_text(x_tolerance=2,y_tolerance=3) or '') for x in p.pages),end='')";
  const {stdout}=await exec(python,["-c",code,bytesPath],{maxBuffer:80*1024*1024}); return stdout;
}

async function main(){
  const prior=JSON.parse(await readFile(path.join(priorDir,"release.json"),"utf8")) as GovernedManualRelease;
  await mkdir(path.join(output,"bytes"),{recursive:true}); await mkdir(path.join(output,"text"),{recursive:true});
  for(const manual of prior.manuals){await copyFile(path.join(priorDir,manual.immutableBytesPath),path.join(output,manual.immutableBytesPath));await copyFile(path.join(priorDir,manual.immutableTextPath),path.join(output,manual.immutableTextPath));}
  const manuals:GovernedManual[]=[...prior.manuals], knowledge:L9Knowledge[]=[...prior.l9AdvisorKnowledge], attempts:Attempt[]=[];
  const admittedProducts=new Set<string>();
  const queue=[...candidates];
  async function worker(){for(;;){const candidate=queue.shift();if(!candidate)return;const member=prior.members.find(x=>x.productId===candidate.productId);if(!member)throw new Error(`MEMBER_NOT_FOUND:${candidate.productId}`);try{
    validateOfficialManualUrl(candidate.sourceUrl);const response=await fetch(candidate.sourceUrl,{redirect:"follow",signal:AbortSignal.timeout(30000),headers:{"user-agent":"Expiya-Governed-Manual-Acquisition/1.0"}});if(!response.ok)throw new Error(`HTTP_${response.status}`);const contentType=response.headers.get("content-type")?.split(";")[0].trim()??"unknown",bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length<5||new TextDecoder().decode(bytes.slice(0,5))!=="%PDF-"){attempts.push({productId:candidate.productId,sourceUrl:candidate.sourceUrl,method:candidate.resolutionMethod,outcome:"NON_PDF_RESPONSE",detail:`Official endpoint returned ${contentType}, ${bytes.length} bytes.`,retryable:true});continue;}
    const artifact=sha256(bytes),key=artifact.slice(7,23),bytesRel=`bytes/${key}.pdf`,textRel=`text/${key}.txt`,stagingPath=path.join("/private/tmp",`expiya-manual-${key}.pdf`);await writeFile(stagingPath,bytes);const text=await extractPdf(stagingPath),pages=splitExtractedPages(text),identity=findLocator(pages,candidate.exactCodes);if(!identity){attempts.push({productId:candidate.productId,sourceUrl:candidate.sourceUrl,method:candidate.resolutionMethod,outcome:"IDENTITY_MISMATCH",detail:`Official PDF bytes did not contain an admitted exact code: ${candidate.exactCodes.join(", ")}.`,retryable:false});continue;}await writeFile(path.join(output,bytesRel),bytes);await writeFile(path.join(output,textRel),text,"utf8");
    const manual={manualId:`APPL-MANUAL-${key.toUpperCase()}`,sourceId:candidate.sourceId,sourceUrl:candidate.sourceUrl,retrievedAt:now,contentType,byteLength:bytes.length,artifactSha256:artifact,textArtifactSha256:sha256(text),categoryId:member.categoryId,productId:member.productId,exactProductCode:identity.code,identityLocator:identity.locator,pageCount:pages.length,language:"tr-TR",immutableBytesPath:bytesRel,immutableTextPath:textRel} satisfies GovernedManual;manuals.push(manual);admittedProducts.add(member.productId);attempts.push({productId:candidate.productId,sourceUrl:candidate.sourceUrl,method:candidate.resolutionMethod,outcome:"ADMITTED",detail:`Official PDF and in-document identity admitted as ${manual.manualId}.`,retryable:false});
    candidate.recipe.forEach((recipe,index)=>{const page=pages.findIndex(x=>x.toLocaleLowerCase("tr-TR").includes(recipe.needle.toLocaleLowerCase("tr-TR")));if(page>=0)knowledge.push({knowledgeId:`L9-${key.toUpperCase()}-${index+1}`,manualId:manual.manualId,categoryId:manual.categoryId,productId:manual.productId,statement:recipe.statement,locator:{page:page+1,section:recipe.needle},knowledgeKind:recipe.kind,decisionAuthority:"NONE",candidateEffect:"NONE",professionalInstallationRequired:recipe.professional,publicSourceDisclosure:`${member.brand} ${member.model} üretici kullanım kılavuzu`});});
  }catch(error){attempts.push({productId:candidate.productId,sourceUrl:candidate.sourceUrl,method:candidate.resolutionMethod,outcome:"DOWNLOAD_OR_EXTRACTION_FAILED",detail:error instanceof Error?error.message:String(error),retryable:true});}}}
  await Promise.all([worker(),worker(),worker()]);
  attempts.push(
    {productId:"PHILIPS_NA350_00_TR",method:"SUPPORT_PAGE_DOCUMENT_EXTRACTION",outcome:"NO_IMMUTABLE_MANUAL_URL",detail:"Official support page exposed no immutable user-manual PDF in the bounded document extraction.",retryable:true},
    {productId:"BOSCH_CL2000U_W_26_E__CL2000_26_E_TR",method:"PRODUCT_PAGE_DOCUMENT_EXTRACTION",outcome:"NO_EXACT_MANUAL_DOCUMENT",detail:"Official exact-pair page exposed brochure, guarantee and product-data documents only.",retryable:true},
    {productId:"BOSCH_CL3000IU_W_35_E__CL3000I_35_E_TR",method:"PRODUCT_PAGE_DOCUMENT_EXTRACTION",outcome:"NO_EXACT_MANUAL_DOCUMENT",detail:"Official exact-pair page exposed brochure, guarantee and energy-label documents only.",retryable:true},
    {productId:"ARCELIK_T7365_ECO_TR",method:"PRODUCT_PAGE_DOCUMENT_EXTRACTION",outcome:"DOCUMENT_LINK_NOT_RESOLVED",detail:"Official product page advertises a manual but did not expose a deterministic immutable URL in bounded markup extraction.",retryable:true},
  );
  manuals.sort((a,b)=>a.categoryId.localeCompare(b.categoryId)||a.productId.localeCompare(b.productId));knowledge.sort((a,b)=>a.productId.localeCompare(b.productId)||a.knowledgeId.localeCompare(b.knowledgeId));attempts.sort((a,b)=>a.productId.localeCompare(b.productId)||(a.sourceUrl??"").localeCompare(b.sourceUrl??""));
  const blockers:ManualBlocker[]=prior.blockers.filter(x=>!admittedProducts.has(x.productId));
  const unsigned={schemaVersion:"appliances-governed-manual-release/v1" as const,releaseId,generatedAt:now,lifecycle:"FROZEN_READ_ONLY" as const,authority:"L9_ADVISOR_ONLY" as const,parentPolicy:"IMMUTABLE_NO_OVERWRITE" as const,inventoryDigest:prior.inventoryDigest,members:prior.members,manuals,l9AdvisorKnowledge:knowledge,blockers,boundaries:prior.boundaries};const release=finalizeRelease(unsigned);const issues=validateRelease(release);if(issues.length)throw new Error(`RELEASE_INVALID:${issues.join(",")}`);
  const categories=[...new Set(prior.members.map(x=>x.categoryId))].sort().map(categoryId=>({categoryId,members:prior.members.filter(x=>x.categoryId===categoryId).length,manuals:manuals.filter(x=>x.categoryId===categoryId).length,l9Entries:knowledge.filter(x=>x.categoryId===categoryId).length,blockers:blockers.filter(x=>x.categoryId===categoryId).length}));
  const releaseRaw=stableJson(release),coverageRaw=stableJson({schemaVersion:"appliances-manual-coverage/v2",releaseId,before:{releaseId:priorId,totalMembers:97,categories:24,manualCount:prior.manuals.length,l9EntryCount:prior.l9AdvisorKnowledge.length,blockerCount:prior.blockers.length,membersWithoutManualId:82},after:{totalMembers:prior.members.length,categories:categories.length,manualCount:manuals.length,l9EntryCount:knowledge.length,blockerCount:blockers.length,membersWithoutAdmittedManual:prior.members.length-new Set(manuals.map(x=>x.productId)).size},categories,next:"WU-XPY-APPL-AŞAMA2-SALES-ACTION-STANDARDIZATION-01"}),retryRaw=stableJson({schemaVersion:"appliances-manual-retry-ledger/v1",releaseId,batchPolicy:{knownIdenticalFailedUrlRetried:false,maxConcurrency:3,timeoutMs:30000,officialSourcesOnly:true},attempts,unresolvedExternalBlockers:attempts.filter(x=>x.outcome!=="ADMITTED"),next:"WU-XPY-APPL-AŞAMA2-SALES-ACTION-STANDARDIZATION-01"});
  await writeFile(path.join(output,"release.json"),releaseRaw);await writeFile(path.join(output,"coverage.json"),coverageRaw);await writeFile(path.join(output,"retry-ledger.json"),retryRaw);await writeFile(path.join(output,"manifest.json"),stableJson({schemaVersion:"appliances-governed-manual-manifest/v2",releaseId,lifecycle:"FROZEN_READ_ONLY",parentReleaseId:priorId,parentReleaseDigest:prior.releaseDigest,releaseArtifactSha256:sha256(releaseRaw),coverageArtifactSha256:sha256(coverageRaw),retryLedgerArtifactSha256:sha256(retryRaw),manualArtifacts:manuals.map(x=>({manualId:x.manualId,artifactSha256:x.artifactSha256,textArtifactSha256:x.textArtifactSha256})),boundaries:release.boundaries,next:"WU-XPY-APPL-AŞAMA2-SALES-ACTION-STANDARDIZATION-01"}));
  await writeFile(path.join(base,"..","active.json"),stableJson({schemaVersion:"appliances-governed-manual-active/v1",releaseId,releaseDigest:release.releaseDigest,manifestSha256:sha256(await readFile(path.join(output,"manifest.json"),"utf8")),activatedAt:now,authority:"L9_ADVISOR_ONLY",next:"WU-XPY-APPL-AŞAMA2-SALES-ACTION-STANDARDIZATION-01"}));
  console.log(JSON.stringify({releaseId,members:prior.members.length,categories:categories.length,manuals:manuals.length,l9Entries:knowledge.length,blockers:blockers.length,attempts:attempts.length}));
}
void main();
