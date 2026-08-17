import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createTemporalCorrectionReleaseManifest, createTemporalCorrectionReleasePayload, serializeCanonical,
  validateProductionCatalogRelease,
} from "@/features/vehicle-data/productionCatalogRelease";
import type { ProductionCatalogReleasePayload } from "@/features/vehicle-data/productionCatalogRelease";

const ROOT=process.cwd(),OLD="data/production/catalog/releases/v0.55.0",NEXT="data/production/catalog/releases/v0.55.1";
async function immutable(file:string,content:string){try{await writeFile(file,content,{encoding:"utf8",flag:"wx"})}catch(error){if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;if(await readFile(file,"utf8")!==content)throw new Error(`IMMUTABLE_RELEASE_ARTIFACT_DIFFERS:${file}`)}}
const hash=(value:string)=>`sha256:${createHash("sha256").update(value).digest("hex")}`;
async function main(){
  const [oldRaw,facetsRaw]=await Promise.all([readFile(path.join(ROOT,OLD,"catalog.json"),"utf8"),readFile(path.join(ROOT,OLD,"decision-facets.json"),"utf8")]);
  const old=JSON.parse(oldRaw) as ProductionCatalogReleasePayload;const payload=createTemporalCorrectionReleasePayload(old.records);const manifest=createTemporalCorrectionReleaseManifest(payload);const raw=serializeCanonical(payload),rawManifest=serializeCanonical(manifest);
  const errors=validateProductionCatalogRelease(payload,manifest,raw);if(errors.length)throw new Error(`TEMPORAL_CORRECTION_RELEASE_INVALID:${errors.join(",")}`);
  if(serializeCanonical(old.records)!==serializeCanonical(payload.records))throw new Error("TEMPORAL_PATCH_RECORD_CONTENT_CHANGED");
  const variantIds=(value:ProductionCatalogReleasePayload)=>value.records.map(({variant})=>variant.id).sort();if(JSON.stringify(variantIds(old))!==JSON.stringify(variantIds(payload)))throw new Error("TEMPORAL_PATCH_VARIANT_IDS_CHANGED");
  const estimates=payload.records.flatMap((record)=>record.activeNewPrice?.priceType==="ESTIMATE"?[record.activeNewPrice]:[]);if(estimates.some((price)=>price.consumerVisibility!=="INTERNAL_ONLY"))throw new Error("ESTIMATE_VISIBILITY_POLICY_CHANGED");
  const output={schemaVersion:1,baseRelease:"v0.55.0",patchRelease:"v0.55.1",allowedDifferences:["catalog.effective_as_of","manifest.release/hash/effective/approval/staging/source/lineage/limitations","active-pointer","dependent-layer-compatibility-metadata"],semanticEquality:{recordJsonEqual:true,variantIdSetEqual:true,recordCountEqual:old.records.length===payload.records.length,brandModelTrimEqual:true,technicalFactsEqual:true,priceObservationsEqual:true,provenanceEqual:true,decisionFacetsByteEqual:true,internalEstimateVisibilityPreserved:true},counts:{records:payload.records.length,variantIds:variantIds(payload).length,internalEstimates:estimates.length},hashes:{oldCatalogPayload:hash(oldRaw),newCatalogPayload:manifest.catalog_payload_hash,decisionFacets:hash(facetsRaw)},timestamps:{evidenceCommit:"84b5fe8f834a4a8f1e3e2e45ea3c51e6d19e2c05",evidenceCommitAt:"2026-08-16T09:40:33.000Z",effectiveAsOf:payload.effective_as_of,approvalAt:manifest.approval.at,stagingAt:manifest.staging.at}};
  await mkdir(path.join(ROOT,NEXT),{recursive:true});await mkdir(path.join(ROOT,"outputs/catalog-temporal-correction-v0.55.1"),{recursive:true});
  await immutable(path.join(ROOT,NEXT,"catalog.json"),raw);await immutable(path.join(ROOT,NEXT,"manifest.json"),rawManifest);await immutable(path.join(ROOT,NEXT,"decision-facets.json"),facetsRaw);
  await writeFile(path.join(ROOT,"outputs/catalog-temporal-correction-v0.55.1/semantic-diff.json"),`${JSON.stringify(output,null,2)}\n`,"utf8");console.log(JSON.stringify({release:"v0.55.1",hash:manifest.catalog_payload_hash,records:payload.records.length}));
}
void main();
