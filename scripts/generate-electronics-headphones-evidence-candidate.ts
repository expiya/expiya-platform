import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  HEADPHONES_RECONCILIATION_SCHEMA_VERSION,
  validateHeadphonesCandidate,
  type EvidenceSource,
  type HeadphonesReconciliationRecord,
} from "../features/electronics/headphonesEvidenceReconciliation";

const root = process.cwd();
const parentDir = path.join(root, "data/research/electronics/catalog-coverage-expansion-01");
const outputDir = path.join(root, "data/research/electronics/headphones-evidence-closure-01");
const workUnit = "WU-ELECTRONICS-HEADPHONES-EVIDENCE-CLOSURE-01";
const generatedAt = "2026-09-06T00:00:00.000Z";
const canonical = (value: unknown): string => {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new Error("CANONICALIZATION_REQUIRES_JSON_VALUE");
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
};
const sha = (value: unknown) => `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
const fileSha = (file: string) => `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;

const parentManifestPath = path.join(parentDir, "manifest.json");
const parentManifest = JSON.parse(readFileSync(parentManifestPath, "utf8"));
const parentIntegrity = (parentManifest.files as { path: string; digest: string }[]).map((expected) => {
  const payload = JSON.parse(readFileSync(path.join(parentDir, expected.path), "utf8"));
  const observedDigest = sha(payload);
  return { path: expected.path, declaredDigest: expected.digest, observedDigest, verified: observedDigest === expected.digest };
});
const observationPayload = JSON.parse(readFileSync(path.join(parentDir, "headphones-amazon-observations.json"), "utf8"));
const observations = observationPayload.acquisition.observations as { asin: string; title: string }[];

const sources: EvidenceSource[] = [
  ["HUAWEI-7I-TR","Huawei","TR","PRODUCT","https://consumer.huawei.com/tr/headphones/freebuds7i/",true],
  ["HUAWEI-6I-TR","Huawei","TR","PRODUCT","https://consumer.huawei.com/tr/headphones/freebuds6i/",true],
  ["HUAWEI-6-TR","Huawei","TR","SUPPORT","https://consumer.huawei.com/tr/support/content/tr-tr15868521/",true],
  ["HUAWEI-SE2-TR","Huawei","TR","PRODUCT","https://consumer.huawei.com/tr/headphones/freebuds-se-2/",true],
  ["HUAWEI-SE4-TR","Huawei","TR","PRODUCT","https://consumer.huawei.com/tr/headphones/freebuds-se-4-anc/",true],
  ["APPLE-PRO3-TR","Apple","TR","PRODUCT","https://www.apple.com/tr/airpods-pro/specs/",true],
  ["APPLE-AIRPODS4-TR","Apple","TR","PRODUCT","https://www.apple.com/tr/airpods-4/specs/",true],
  ["APPLE-EARPODS35-TR","Apple","TR","PRODUCT","https://www.apple.com/tr/shop/product/MWU53TU/A",true],
  ["APPLE-EARPODSUSBC-TR","Apple","TR","PRODUCT","https://www.apple.com/tr/shop/product/MYQY3TU/A",true],
  ["UGREEN-S3-TR","UGREEN","TR","PRODUCT","https://www.ugreen.com/tr-tr/products/tr-45785",true],
  ["SAMSUNG-IC100-TR","Samsung","TR","PRODUCT","https://www.samsung.com/tr/business/mobile-accessories/samsung-type-c-earphones-white-eo-ic100bwegww/",true],
  ["SAMSUNG-R420-TR","Samsung","TR","PRODUCT","https://www.samsung.com/tr/audio-sound/galaxy-buds/galaxy-buds3-fe-black-sm-r420nzkatur/",true],
  ["HYPERX-C3S-TR","HyperX","TR","PRODUCT","https://row.hyperx.com/tr/products/hyperx-cloud-iii-s-wireless-gaming-headset",true],
  ["MARSHALL-MAJORV-TR","Marshall","TR","PRODUCT","https://www.marshall.com/tr/en/product/major-v?pid=1006833",true],
  ["MARSHALL-MAJORV-MANUAL-TR","Marshall","TR","MANUAL","https://www.marshall.com/on/demandware.static/-/Library-Sites-SharedLibrary-Marshall/default/dwe0dadd06/images/cms-pages/user/Marshall_Major-V_OLM_R1_0_tr.pdf",true],
  ["XIAOMI-RB6PLAY-TR","Xiaomi","TR","PRODUCT","https://www.mi.com/tr/product/redmi-buds-6-play/specs/",true],
  ["HYPERX-C3-TR","HyperX","TR","PRODUCT","https://row.hyperx.com/tr/products/hyperx-cloud-iii-wired-gaming-headset",true],
  ["PHILIPS-TAUE101BK-TR","Philips","TR","PRODUCT","https://www.philips.com.tr/c-p/TAUE101BK_00/mikrofonlu-kulaklik",true],
  ["PHILIPS-TAUE101BK-SUPPORT-TR","Philips","TR","SUPPORT","https://www.philips.com.tr/c-p/TAUE101BK_00/mikrofonlu-kulaklik/destek",true],
].map(([sourceId,publisher,jurisdiction,sourceType,url,establishesTurkiyeApplicability]) => ({ sourceId,publisher,jurisdiction,sourceType,url,establishesTurkiyeApplicability })) as EvidenceSource[];

type Seed = { manufacturer: string; model: string; code?: string; suffix?: string; form: string; connection: string[]; variant?: string; source?: string[]; segment: string; topology?: string };
const admitted: Record<string, Seed> = {
  B0FKN8GTGS:{manufacturer:"Huawei",model:"FreeBuds 7i",form:"sealed in-ear TWS",connection:["Bluetooth"],variant:"Black",source:["HUAWEI-7I-TR"],segment:"TWS ANC"},
  B0D35JN2JH:{manufacturer:"Huawei",model:"FreeBuds 6i",form:"sealed in-ear TWS",connection:["Bluetooth"],variant:"White",source:["HUAWEI-6I-TR"],segment:"TWS ANC"},
  B0F68YX7TS:{manufacturer:"Huawei",model:"FreeBuds 6",form:"open-fit TWS",connection:["Bluetooth"],variant:"Purple",source:["HUAWEI-6-TR"],segment:"open-fit TWS"},
  B0FQF59PPW:{manufacturer:"Apple",model:"AirPods Pro 3",form:"sealed in-ear TWS",connection:["Bluetooth 5.3"],source:["APPLE-PRO3-TR"],segment:"premium TWS ANC"},
  B0D7QKV9K4:{manufacturer:"Apple",model:"EarPods with 3.5 mm Headphone Plug",code:"MWU53TU/A",suffix:"TU/A",form:"open-fit earbud",connection:["3.5 mm analog"],source:["APPLE-EARPODS35-TR"],segment:"wired 3.5 mm"},
  B0DMZWD4JP:{manufacturer:"UGREEN",model:"HiTune S3",code:"45785",form:"open-ear clip TWS",connection:["Bluetooth 5.4"],variant:"Black",source:["UGREEN-S3-TR"],segment:"open-ear sport"},
  B0CDMB5ZQW:{manufacturer:"Huawei",model:"FreeBuds SE 2",form:"open-fit TWS",connection:["Bluetooth 5.3"],variant:"White",source:["HUAWEI-SE2-TR"],segment:"entry TWS"},
  B0DGJDW9G4:{manufacturer:"Apple",model:"AirPods 4 with Active Noise Cancellation",form:"open-fit TWS",connection:["Bluetooth 5.3"],source:["APPLE-AIRPODS4-TR"],segment:"open-fit TWS ANC"},
  B085RN9GRX:{manufacturer:"Samsung",model:"Type-C Earphones",code:"EO-IC100B",form:"sealed in-ear wired",connection:["USB-C digital"],variant:"Black",source:["SAMSUNG-IC100-TR"],segment:"wired USB-C"},
  B0DCW94411:{manufacturer:"Apple",model:"EarPods (USB-C)",code:"MYQY3TU/A",suffix:"TU/A",form:"open-fit earbud",connection:["USB-C digital"],source:["APPLE-EARPODSUSBC-TR"],segment:"wired USB-C"},
  B0FK9TJZV2:{manufacturer:"Huawei",model:"FreeBuds SE 4 ANC",form:"sealed in-ear TWS",connection:["Bluetooth 5.4"],variant:"White",source:["HUAWEI-SE4-TR"],segment:"entry TWS ANC"},
  B0F6NZWPTC:{manufacturer:"HyperX",model:"Cloud III S Wireless",form:"over-ear headset",connection:["2.4 GHz USB","Bluetooth"],variant:"Black",source:["HYPERX-C3S-TR"],segment:"wireless gaming"},
  B0D5CZQ31M:{manufacturer:"Marshall",model:"Major V",code:"1006833",form:"on-ear",connection:["Bluetooth 5.3","3.5 mm analog"],variant:"Cream",source:["MARSHALL-MAJORV-TR","MARSHALL-MAJORV-MANUAL-TR"],segment:"on-ear hybrid"},
  B0FR98G8PL:{manufacturer:"Samsung",model:"Galaxy Buds3 FE",code:"SM-R420NZKATUR",suffix:"TUR",form:"sealed in-ear TWS",connection:["Bluetooth 5.4"],variant:"Black",source:["SAMSUNG-R420-TR"],segment:"ecosystem TWS ANC"},
  B0C3BSZ56D:{manufacturer:"HyperX",model:"Cloud III",code:"727A9AA",form:"over-ear headset",connection:["3.5 mm analog","USB-C","USB-A adapter"],variant:"Black",source:["HYPERX-C3-TR"],segment:"wired gaming"},
  B084S6BCJN:{manufacturer:"Philips",model:"Headphones with microphone",code:"TAUE101BK/00",suffix:"/00",form:"open-fit earbud",connection:["3.5 mm analog"],variant:"Black",source:["PHILIPS-TAUE101BK-TR","PHILIPS-TAUE101BK-SUPPORT-TR"],segment:"wired 3.5 mm"},
};
const segments: Record<string,string> = { B0BYWL962Q:"wireless over-ear",B0C3BSZ56D:"wired gaming",B01DEWVZ2C:"wired 3.5 mm",B0DBHTG7ZX:"entry TWS",B089SSFV85:"wired gaming",B0C6KKQ7ND:"wireless over-ear ANC",B09X5G16ZM:"wireless gaming",B0CRTYZG5C:"entry TWS ANC",B084S6BCJN:"wired 3.5 mm",B0F93QP4RK:"wireless gaming",B07XC936P8:"wired gaming",B0DHL93XCN:"TWS ANC",B0BTYCRJSS:"entry TWS",B0D6NLHV8N:"wired gaming",B0D2XRXNGY:"open-ear sport",B0F4884LN3:"wireless over-ear ANC" };
const parseManufacturer = (title: string) => title.split(" ")[0];
const records: HeadphonesReconciliationRecord[] = observations.map((observation) => {
  const seed = admitted[observation.asin];
  if (seed) return { asin:observation.asin, listingTitle:observation.title, discoverySegment:seed.segment, observedConfigurationClues:[seed.model,...seed.connection,seed.variant].filter(Boolean) as string[], manufacturer:seed.manufacturer, exactCommercialModel:seed.model, modelCode:seed.code ?? null, regionalSuffix:seed.suffix ?? null, formFactor:seed.form, connectivity:seed.connection, identityRelevantVariant:seed.variant ?? null, bundleTopology:seed.topology ?? "manufacturer retail product; included accessories governed by primary source", exactConfigurationKey:`${seed.manufacturer}:${seed.code ?? seed.model}:${seed.variant ?? "standard"}`, status:"ADMITTED" as const, reason:"Exact commercial configuration and Türkiye applicability independently established by manufacturer-controlled Türkiye evidence; Amazon remains discovery/commerce only.", sourceIds:seed.source ?? [] };
  if (observation.asin === "B0DBHTG7ZX") return { asin:observation.asin, listingTitle:observation.title, discoverySegment:segments[observation.asin], observedConfigurationClues:["Redmi Buds 6 Play","Blue"], manufacturer:"Xiaomi", exactCommercialModel:"Redmi Buds 6 Play", modelCode:"M2420E1", regionalSuffix:null, formFactor:"sealed in-ear TWS", connectivity:["Bluetooth 5.4"], identityRelevantVariant:"Blue", bundleTopology:"manufacturer retail product; exact blue Türkiye configuration not established", exactConfigurationKey:null, status:"REJECTED_IDENTITY_AMBIGUOUS" as const, reason:"Xiaomi Türkiye establishes model M2420E1 but its specification page lists black and white; it does not establish the observed blue configuration. Amazon color copy cannot close identity.", sourceIds:["XIAOMI-RB6PLAY-TR"] };
  return { asin:observation.asin, listingTitle:observation.title, discoverySegment:segments[observation.asin] ?? "headphones", observedConfigurationClues:observation.title.split(/, | /).slice(0,6), manufacturer:parseManufacturer(observation.title), exactCommercialModel:observation.title.split(",")[0], modelCode:null, regionalSuffix:null, formFactor:"unknown pending primary evidence", connectivity:[], identityRelevantVariant:null, bundleTopology:"Amazon title does not establish retail bundle/accessory topology", exactConfigurationKey:null, status:"REJECTED_INSUFFICIENT_TR_APPLICABILITY" as const, reason:"No sufficiently exact manufacturer-controlled Türkiye product/support, conformity, warranty, or provably authorized distributor bridge was captured for this ASIN configuration; global or seller material cannot establish Türkiye applicability.", sourceIds:[] };
});

const factSeeds: Record<string, Record<string, unknown>> = {
  "Huawei:FreeBuds 7i:Black":{noiseControl:"active",microphones:"three microphones plus VPU for calls",battery:"35 h total, ANC off",ingress:"IP54 earbuds",multipoint:true,spatialAudio:true,app:"AI Life or Huawei Audio Connect"},
  "Huawei:FreeBuds 6i:White":{noiseControl:"active",weightGramsPerEarbud:5.4,codecs:["LDAC","L2HC 2.0","AAC","SBC"],ingress:"IP54 earbuds"},
  "Huawei:FreeBuds SE 2:White":{battery:"9 h earbuds / 40 h with case; AAC, 50% volume",weightGramsPerEarbud:3.8,ingress:"IP54 earbuds",codecs:["AAC","SBC"]},
  "Huawei:FreeBuds SE 4 ANC:White":{noiseControl:"active, three modes",microphones:"three-direction call pickup",battery:"7 h ANC on / 10 h ANC off / 50 h with case",weightGramsPerEarbud:4.3,ingress:"IP54",app:"AI Life"},
  "Apple:AirPods Pro 3:standard":{noiseControl:"active",microphones:"dual beamforming plus inward-facing",battery:"8 h ANC on / 24 h with case",weightGramsPerEarbud:5.55,ingress:"IP57 earbuds and case",spatialAudio:true},
  "Apple:AirPods 4 with Active Noise Cancellation:standard":{noiseControl:"active",battery:"4 h ANC on / 20 h with case; 5 h / 30 h noise control off",spatialAudio:true},
  "UGREEN:45785:Black":{microphones:"AI call noise processing",battery:"7.5 h / 30 h with case",weightGramsPerEarbud:5.3,ingress:"IPX5",latency:"0.06 s game mode"},
  "HyperX:Cloud III S Wireless:Black":{microphones:"detachable electret condenser boom microphone",battery:"up to 120 h at 50% volume over 2.4 GHz",weightGrams:340,spatialAudio:"DTS Headphone:X",app:"NGENUITY",platforms:["PC","Mac","PS5","mobile","Switch"]},
  "Marshall:1006833:Cream":{battery:"100+ h",weightGrams:186,codecs:["SBC","AAC","LC3"],multipoint:true,app:"Marshall Bluetooth optional",ingress:"none"},
  "Samsung:SM-R420NZKATUR:Black":{noiseControl:"active",microphones:6,battery:"6 h / 24 h total ANC on; 8.5 h / 30 h total ANC off",weightGramsPerEarbud:5,ingress:"IP54",codecs:["AAC","SBC","SSC"],spatialAudio:"360 Audio"},
  "HyperX:727A9AA:Black":{microphones:"10 mm detachable microphone",weightGrams:308,platforms:["PC","PS5","PS4","Xbox Series X|S","Xbox One","Nintendo Switch","Mac","mobile"],warranty:"2 years"},
  "Philips:TAUE101BK/00:Black":{driver:"14.2 mm dynamic",frequencyResponseHz:"20-20000",impedanceOhms:32,weightGrams:65.4,microphones:"in-line microphone",cable:"1.2 m",connector:"3.5 mm stereo"},
};
const facts = records.filter((row) => row.status === "ADMITTED").flatMap((row) => Object.entries(factSeeds[row.exactConfigurationKey!] ?? {}).map(([factKey,value]) => ({ productKey:row.exactConfigurationKey!,factKey,value,sourceIds:row.sourceIds.slice(0,1) })));
const unknowns = records.filter((row) => row.status === "ADMITTED").flatMap((row) => ["comfort","soundQuality","callQuality","sportSuitability","replaceableParts","softwareLifecycle"].filter((key) => !facts.some((fact) => fact.productKey === row.exactConfigurationKey && fact.factKey === key)).map((factKey) => ({productKey:row.exactConfigurationKey,factKey,status:"UNKNOWN_NOT_INFERRED"})));
const coverage = { observed:records.length, reconciled:records.length, admitted:records.filter((row)=>row.status==="ADMITTED").length, rejected:records.filter((row)=>row.status!=="ADMITTED").length, duplicates:0, manufacturers:[...new Set(records.filter((row)=>row.status==="ADMITTED").map((row)=>row.manufacturer))].sort(), formFactors:[...new Set(records.filter((row)=>row.status==="ADMITTED").map((row)=>row.formFactor))].sort(), missingSegments:["neckband","bone-conduction","hearing-assistance-specific"], blockers:[...records.filter((row)=>row.status!=="ADMITTED").map((row)=>`REJECTED:${row.asin}:${row.status}`)], gate:"COVERAGE_INCOMPLETE" };
const semantics = { authorityStatus:"CANDIDATE_INPUT_NOT_ACTIVE_POLICY", technicalFactNotDailyLifeInterpretation:true, personaNotUserFact:true, candidateQuestions:["wearing form preference: over-ear/on-ear/in-ear/open-fit/open-ear","commute/travel noise-control need","calls/meetings where microphone evidence exists","battery session duration","wired connector/source requirement","platform and codec compatibility","gaming latency requirement","water exposure","portability/weight"], suppressWithoutEvidence:["comfort","fit quality","sound quality","call quality","sport suitability"], comparison:{unknownsRemainUnknown:true,tiesAllowed:true,nonDominatedResultsAllowed:true,rankingInputs:[]}, yRuntimeEffect:"NONE" };
const manuals = sources.filter((source)=>["MANUAL","SUPPORT","WARRANTY"].includes(source.sourceType));
const lineageReconciliation = { schemaVersion:"electronics-parent-lineage-reconciliation/v1", parentWorkUnit:parentManifest.workUnit, disposition:"MECHANICAL_CANONICALIZATION_ERROR_REPAIRED", materialPayloadChange:false, path:"before-state.json", originalDeclaredDigest:"sha256:eebe448472d75408c07c57a891ee1542b0902c8d11bec6ebeb3bd69c0a4655b0", repairedPersistedPayloadDigest:"sha256:f6ed79a0f2a77ca4b321888a281a0ea5f90295fcc7a76ccf1e6456ef532f61b3", proof:{omittedPropertyPath:"base.activeCatalogDigest", inMemoryValue:"undefined", persistedJsonBehavior:"JSON.stringify omitted the undefined-valued property", legacyCanonicalBehavior:"custom canonicalizer emitted the non-JSON token undefined", reproducedLegacyDigest:true}, repair:"Parent manifest now binds the actual persisted canonical JSON payload; both historical and repaired digests are preserved here.", prevention:"Canonicalizers reject undefined and other non-JSON values." };
const packageData = { schemaVersion:HEADPHONES_RECONCILIATION_SCHEMA_VERSION,workUnit,generatedAt,authorityStatus:"IMMUTABLE_RELEASE_CANDIDATE_COVERAGE_INCOMPLETE_NOT_APPROVAL_ELIGIBLE",activationPermitted:false,parent:{workUnit:parentManifest.workUnit,manifestDigest:fileSha(parentManifestPath),declaredPayloadDigests:parentManifest.files,integrity:parentIntegrity,lineageReconciliation},amazonAuthority:{technical:"NONE",decision:"NONE",ranking:"NONE",commerceOnly:true},sources,records,facts,manuals,unknowns,coverage,semantics,nextBoundedStep:"Run one bounded Türkiye-applicability closure pass for the 13 terminally rejected exact configurations; do not broaden discovery or lower admission rules." };
const issues = validateHeadphonesCandidate({records,sources,facts,activationPermitted:false,rankingInputs:semantics.comparison.rankingInputs});
if (issues.length) throw new Error(issues.join("\n"));
mkdirSync(outputDir,{recursive:true});
const artifacts: Record<string,unknown> = {"parent-lineage-reconciliation.json":lineageReconciliation,"source-register.json":sources,"asin-reconciliation-ledger.json":records,"admitted-product-catalog.json":records.filter((row)=>row.status==="ADMITTED"),"technical-capability-facts.json":facts,"manual-support-warranty-register.json":manuals,"unknown-register.json":unknowns,"coverage-report.json":coverage,"semantic-policy-input-proposal.json":semantics,"release-candidate.json":packageData};
for (const [name,value] of Object.entries(artifacts)) writeFileSync(path.join(outputDir,name),`${JSON.stringify(value,null,2)}\n`);
const manifest = {schemaVersion:"electronics-headphones-evidence-manifest/v1",workUnit,generatedAt,parentLineage:packageData.parent,authorityStatus:packageData.authorityStatus,activationPermitted:false,files:Object.entries(artifacts).map(([file,value])=>({path:file,digest:sha(value)}))};
writeFileSync(path.join(outputDir,"manifest.json"),`${JSON.stringify(manifest,null,2)}\n`);
console.log(JSON.stringify({verdict:coverage.gate,counts:coverage,manifestDigest:sha(manifest)}));
