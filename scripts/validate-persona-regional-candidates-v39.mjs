import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root=process.cwd();
const discovery=JSON.parse(readFileSync(path.join(root,"data/production/personas/evidence/research-discovery/regional-150-2026-08-24/discovery-input.json"),"utf8"));
const completion=JSON.parse(readFileSync(path.join(root,"data/production/personas/evidence/research-completion/release-candidates/v3.9.0-deferred-150-2026-08-24/research-completion.json"),"utf8"));
const done=new Set(["family-be90f0db119d9d3859a2d0b7","family-e54cda2a90648060a99cb37b","family-2c7a24089fdb0c812282f4e6","family-31961cca2fce994af065068e"]);
const aliases={"N°4":["ds 4"],"Egea Cross":["tipo cross"],"A-Serisi":["a class"],"C-Serisi":["c class"],"E-Serisi":["e class"],"S-Serisi":["s class"],"G-Serisi":["g class"],"1 Serisi":["1 series"],"2 Serisi Active Tourer":["2 series active tourer"],"2 Serisi Gran Coupe":["2 series gran coupe"],"4 Serisi Cabrio":["4 series convertible","430i convertible"],"4 Serisi Coupe":["4 series"],"4 Serisi Gran Coupe":["4 series gran coupe"],"5 Serisi Sedan":["5 series"],"7 Serisi Sedan":["7 series"],"TIGGO7":["tiggo 7"],"TIGGO8":["tiggo 8"],"JAECOO 7":["jaecoo j7"],"OMODA 5":["omoda 5"],"Cooper 5 Kapı":["cooper 5 door"],"Phantom Extended":["phantom"],"Ghost Extended":["ghost"],"C4 X Hybrid 145":["c4 x"],"C4 Hybrid 145":["c4"],"C3 Aircross Hybrid 145":["c3 aircross"],"C5 Aircross Hybrid 145":["c5 aircross"],"Land Cruiser Prado":["prado"],"A3 Sedan":["a3"],"A5 Sedan":["a5"],"A6 Sedan":["a6"],"A5 Avant":["a5"],"Q3 Sportback":["q3 sportback"],"Q5 Sportback":["q5 sportback"],"M3 Sedan":["m3"],"M3 Touring":["m3 touring"],"M4 Coupe":["m4"],"M4 Cabrio":["m4 convertible","m4 cabrio"],"X5 M":["x5m","x5 m"],"X6 M":["x6m","x6 m"]};
const patterns={
 COMFORT:/\b(comfort|comfortable|refined|smooth ride|ride quality|supple|quiet cabin)\b/iu,
 PRACTICALITY:/\b(practical|practicality|boot|cargo|luggage|storage|spacious|space|roomy|rear seat)\b/iu,
 TECHNOLOGY:/\b(technology|tech|infotainment|touchscreen|digital|connectivity|connected|cockpit|display)\b/iu,
 PRESTIGE:/\b(premium|luxury|luxurious|upmarket|prestige|prestigious|high-end)\b/iu,
 DRIVING_ENGAGEMENT:/\b(fun to drive|engaging|agile|handling|steering feel|driving dynamics|driver.?s car|sporty)\b/iu,
 FAMILY:/\b(family|families|seven-seat|seven seat|7-seat|child seat|isofix)\b/iu,
 VALUE:/\b(value for money|good value|value proposition|affordable|keenly priced|competitive price|budget)\b/iu,
 ADVENTURE:/\b(adventure|off-road|off road|rugged|terrain|overland|4x4|all-wheel drive)\b/iu,
 URBAN:/\b(urban|city|around town|commute|commuting|manoeuvr|maneuver|compact)\b/iu,
 MINIMALISM:/\b(minimalist|minimalism|simple|simplistic|clean design|uncluttered)\b/iu
};
const norm=(s)=>String(s??"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").replace(/[^a-z0-9]+/gu," ").trim();
const decode=(s)=>String(s??"").replace(/<script[\s\S]*?<\/script>/giu," ").replace(/<style[\s\S]*?<\/style>/giu," ").replace(/<[^>]+>/gu," ").replace(/&nbsp;|&#160;/gu," ").replace(/&amp;/gu,"&").replace(/&#39;|&apos;/gu,"'").replace(/&quot;/gu,'"').replace(/\s+/gu," ").trim();
const titleOf=(html)=>decode(html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)/iu)?.[1]??html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1]??"");
const modelMatches=(model,title,url)=>[model,...(aliases[model]??[])].map(norm).some((name)=>norm(title).includes(name)||norm(url).includes(name));
const candidates=(row)=>[row?.source,row?.source2,row?.source3,...(row?.sources??[])].filter(Boolean);
const completionById=new Map(completion.families.map((f)=>[f.familyId,f]));
const rows=[];
for(const family of discovery.families.filter((f)=>!done.has(f.familyId))){
 const target=completionById.get(family.familyId); const checked=[];
 for(const candidate of candidates(family)){
  try{
   const response=await fetch(candidate.url,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0 ExpiyaEvidenceResearch/3.9"},signal:AbortSignal.timeout(25000)});
   const html=await response.text(); const title=titleOf(html); const text=decode(html); const sentences=text.split(/(?<=[.!?])\s+/u).filter((s)=>s.length>=35&&s.length<=500);
   const exactModel=modelMatches(family.model,title,response.url); const spans={};
   if(exactModel) for(const trait of target.claims.map((c)=>c.trait)){const span=sentences.find((s)=>patterns[trait].test(s)); if(span)spans[trait]=span;}
   checked.push({requestedUrl:candidate.url,finalUrl:response.url,publisher:candidate.publisher,title,httpStatus:response.status,exactModel,spans});
  }catch(error){checked.push({requestedUrl:candidate.url,publisher:candidate.publisher,error:error instanceof Error?error.message:String(error),exactModel:false,spans:{}});}
 }
 const supportedTraits=target.claims.map((c)=>c.trait).filter((trait)=>checked.some((c)=>c.exactModel&&c.spans[trait]));
 rows.push({familyId:family.familyId,canonicalBrand:family.brand,canonicalModel:family.model,targetTraits:target.claims.map((c)=>c.trait),supportedTraits,missingTraits:target.claims.map((c)=>c.trait).filter((t)=>!supportedTraits.includes(t)),candidates:checked});
 console.log(`${rows.length}/146 ${family.brand} ${family.model}: ${supportedTraits.length}/${target.claims.length}`);
}
const out=path.join(root,"data/production/personas/evidence/expanded-regional-research/v3.9.0-2026-08-24/live-validation"); mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,"validation-ledger.json"),`${JSON.stringify({schemaVersion:"3.9.0-live-regional-validation.1",validatedAt:"2026-08-24T00:00:00.000Z",families:rows},null,2)}\n`);
writeFileSync(path.join(out,"validation-summary.json"),`${JSON.stringify({familyCount:rows.length,fullySupportedFamilyCount:rows.filter((r)=>!r.missingTraits.length).length,supportedClaimCount:rows.reduce((n,r)=>n+r.supportedTraits.length,0),missingClaimCount:rows.reduce((n,r)=>n+r.missingTraits.length,0)},null,2)}\n`);
