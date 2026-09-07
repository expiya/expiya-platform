import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE="outputs/catalog-factory-active-coverage-wave-02-evidence-closure-01";
const OUTPUT="outputs/catalog-factory-wave-02-43-alternative-evidence-01";
const NOW="2026-09-07T05:00:00.000Z";
const slugs=["refrigerator","washing-machine","dishwasher","dryer","tablet","monitor","smartwatch","headphones"];
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const sha256=(value:Uint8Array|string)=>createHash("sha256").update(value).digest("hex");
type Closure={exactProductId:string;outcome:string;identity:{brand:string;model:string;sku:string};evidence:{requestedUrl:string}};

function alternative(row:Closure){const brand=row.identity.brand.toLowerCase(),sku=row.identity.sku,model=row.identity.model,code=sku.startsWith("UNKNOWN")?model:sku;
 if(brand==="samsung")return `https://www.samsung.com/tr/support/model/${encodeURIComponent(code.replaceAll("/",""))}/`;
 if(brand==="bosch")return `https://www.bosch-home.com.tr/tr/product/${encodeURIComponent(code)}`;
 if(brand==="siemens")return `https://www.siemens-home.bsh-group.com/tr/tr/product/${encodeURIComponent(code)}`;
 if(brand==="lg")return `https://www.lg.com/tr/destek/product-support/cs-${encodeURIComponent(code)}/`;
 if(brand==="sony")return `https://www.sony.com.tr/electronics/support/wireless-headphones-bluetooth-headphones/${model.toLowerCase()}/specifications`;
 if(brand==="msi")return `https://tr.msi.com/Monitor/${model.replaceAll(" ","-")}/Specification`;
 if(brand==="lenovo")return `https://psref.lenovo.com/Search?kw=${encodeURIComponent(code)}`;
 if(brand==="xiaomi")return `https://www.mi.com/global/product/${model.toLowerCase().replaceAll(" ","-")}/specs/`;
 if(brand==="sennheiser")return "https://www.sennheiser-hearing.com/en-US/p/momentum-4-wireless/";
 if(brand==="amazfit")return "https://support.amazfit.com/en/amazfit_t-rex_3_pro/docs/";
 if(brand==="garmin")return `https://support.garmin.com/tr-TR/?partNumber=${encodeURIComponent(code)}`;
 return null;
}
async function fetchOnce(url:string){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(url,{redirect:"follow",signal:controller.signal,headers:{"user-agent":"Mozilla/5.0 (compatible; ExpiyaEvidenceBot/1.0; alternative-review)"}});const all=new Uint8Array(await response.arrayBuffer()),bytes=all.slice(0,5_000_000);return {status:response.status,finalUrl:response.url,contentType:response.headers.get("content-type")??"UNKNOWN",bytes,truncated:all.length>bytes.length,error:null};}catch(error){return {status:null,finalUrl:url,contentType:"UNKNOWN",bytes:new Uint8Array(),truncated:false,error:error instanceof Error?`${error.name}:${error.message}`:String(error)};}finally{clearTimeout(timer);}}

// @ts-expect-error persisted attempted/no-alternative rows are narrowed by their attempted discriminator below

export async function acquireAlternativeEvidence(base=process.cwd()){const summaries=[];for(const slug of slugs){const closure=JSON.parse(await readFile(path.join(base,SOURCE,"categories",slug,"closure-ledger.json"),"utf8")) as {categoryId:string;results:Closure[]};const unresolved=closure.results.filter(row=>row.outcome!=="ADMITTED"),dir=path.join(base,OUTPUT,"categories",slug),snapshotDir=path.join(dir,"snapshots");await mkdir(snapshotDir,{recursive:true});const attempts=[];for(const row of unresolved){const url=alternative(row);if(!url||url===row.evidence.requestedUrl){attempts.push({exactProductId:row.exactProductId,priorOutcome:row.outcome,priorUrl:row.evidence.requestedUrl,alternativeUrl:url,attempted:false,terminal:"UNKNOWN",reasonCode:url?"ALTERNATIVE_EQUALS_PRIOR_URL_NOT_RETRIED":"NO_DISTINCT_OFFICIAL_ALTERNATIVE_DISCOVERED",attemptCount:0,snapshotSha256:null,snapshotFile:null});continue;}const result=await fetchOnce(url),file=`${row.exactProductId.replaceAll(":","__")}.alternative.snapshot`,filePath=path.join(snapshotDir,file);await writeFile(filePath,result.bytes);attempts.push({exactProductId:row.exactProductId,priorOutcome:row.outcome,priorUrl:row.evidence.requestedUrl,alternativeUrl:url,attempted:true,httpStatus:result.status,finalUrl:result.finalUrl,contentType:result.contentType,error:result.error,truncated:result.truncated,terminal:"PENDING_MATERIALIZATION",reasonCode:"DISTINCT_OFFICIAL_ALTERNATIVE_ATTEMPTED_ONCE",attemptCount:1,snapshotSha256:sha256(result.bytes),snapshotFile:path.relative(base,filePath)});}const ledger={schemaVersion:"catalog-factory-alternative-source-attempt-ledger/v0.1",workUnitId:"WU-CATALOG-FACTORY-WAVE-02-43-ALTERNATIVE-EVIDENCE-01",categoryId:closure.categoryId,retryPolicy:"PRIOR_URLS_FORBIDDEN_DISTINCT_ALTERNATIVE_ONCE",attempts};await writeFile(path.join(dir,"source-attempt-ledger.json"),`${stable(ledger)}\n`);summaries.push({categoryId:closure.categoryId,unresolved:unresolved.length,attempted:attempts.filter(x=>x.attempted).length,noAlternative:attempts.filter(x=>!x.attempted).length,httpSuccess:attempts.filter(x=>x.attempted&&x.httpStatus!==null&&x.httpStatus>=200&&x.httpStatus<300).length,ledgerDigest:sha256(stable(ledger))});console.log(JSON.stringify(summaries.at(-1)));}await writeFile(path.join(base,OUTPUT,"ACQUISITION_SUMMARY.json"),`${stable({schemaVersion:"catalog-factory-alternative-acquisition-summary/v0.1",generatedAt:NOW,categories:summaries})}\n`);return summaries;}
if(process.argv[1]?.endsWith("acquire.ts"))acquireAlternativeEvidence().catch(error=>{console.error(error);process.exitCode=1;});
