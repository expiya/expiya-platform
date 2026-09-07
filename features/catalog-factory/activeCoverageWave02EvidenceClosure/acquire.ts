import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT="outputs/catalog-factory-active-coverage-wave-02/categories";
const OUTPUT="outputs/catalog-factory-active-coverage-wave-02-evidence-closure-01";
const NOW="2026-09-07T03:00:00.000Z";
const sha256=(data:Uint8Array|string)=>createHash("sha256").update(data).digest("hex");
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const slugs=["refrigerator","washing-machine","dishwasher","dryer","tablet","monitor","smartwatch","headphones"];

type Candidate={exactProductId:string;identity:{brand:string;model:string;exactVariant:string;sku:string;gtin:string};source:{url:string;sourceId:string}};

async function fetchOnce(url:string){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(url,{redirect:"follow",signal:controller.signal,headers:{"user-agent":"Mozilla/5.0 (compatible; ExpiyaEvidenceBot/1.0; candidate-review)"}});const bytes=new Uint8Array(await response.arrayBuffer());return {status:response.status,finalUrl:response.url,contentType:response.headers.get("content-type")??"UNKNOWN",bytes:bytes.slice(0,5_000_000),truncated:bytes.length>5_000_000,error:null};}catch(error){return {status:null,finalUrl:url,contentType:"UNKNOWN",bytes:new Uint8Array(),truncated:false,error:error instanceof Error?`${error.name}:${error.message}`:String(error)};}finally{clearTimeout(timer);}}

export async function acquireWave02Evidence(base=process.cwd()){
 const summary=[];
 for(const categorySlug of slugs){const input=JSON.parse(await readFile(path.join(base,INPUT,categorySlug,"candidate-ledger.json"),"utf8")) as {categoryId:string;candidates:Candidate[]};const dir=path.join(base,OUTPUT,"categories",categorySlug),snapshotDir=path.join(dir,"snapshots");await mkdir(snapshotDir,{recursive:true});const rows=[];
  for(const candidate of input.candidates){const result=await fetchOnce(candidate.source.url),file=`${candidate.exactProductId.replaceAll(":","__")}.snapshot`,filePath=path.join(snapshotDir,file);await writeFile(filePath,result.bytes);rows.push({exactProductId:candidate.exactProductId,identity:candidate.identity,sourceId:candidate.source.sourceId,requestedUrl:candidate.source.url,finalUrl:result.finalUrl,httpStatus:result.status,contentType:result.contentType,bytes:result.bytes.length,truncated:result.truncated,error:result.error,snapshotFile:path.relative(base,filePath),snapshotSha256:sha256(result.bytes),attemptCount:1,observedAt:NOW});}
  const ledger={schemaVersion:"catalog-factory-source-acquisition-ledger/v0.1",workUnitId:"WU-CATALOG-FACTORY-ACTIVE-COVERAGE-WAVE-02-EVIDENCE-CLOSURE-01",categoryId:input.categoryId,retryPolicy:"ONE_ATTEMPT_PER_URL_NO_LOOP",rows};await writeFile(path.join(dir,"acquisition-ledger.json"),`${stable(ledger)}\n`);summary.push({categoryId:input.categoryId,attempted:rows.length,httpSuccess:rows.filter(x=>x.httpStatus!==null&&x.httpStatus>=200&&x.httpStatus<300).length,failed:rows.filter(x=>x.httpStatus===null||x.httpStatus<200||x.httpStatus>=300).length,ledgerDigest:sha256(stable(ledger))});console.log(JSON.stringify(summary.at(-1)));}
 await writeFile(path.join(base,OUTPUT,"acquisition-summary.json"),`${stable({schemaVersion:"catalog-factory-acquisition-summary/v0.1",generatedAt:NOW,categories:summary})}\n`);return summary;
}
if(process.argv[1]?.endsWith("acquire.ts"))acquireWave02Evidence().catch(error=>{console.error(error);process.exitCode=1;});
