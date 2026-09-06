import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { STROLLER_PRODUCTS } from "@/features/baby/catalog";
import { MOBILITY_PRODUCTS } from "@/features/mobility/catalog";
import { buildSecretaryProductIdentityIndex, type GovernedProductIdentity, type SecretaryProductIdentityIndex } from "./secretaryProductIdentityIndex";
import type { SecretaryCategoryId } from "./secretaryRoutingPack";

const APPLIANCE_FOLDER_CATEGORY: Readonly<Record<string, SecretaryCategoryId>> = Object.freeze({
  "washing-machines":"WASHING_MACHINE","refrigerators":"REFRIGERATOR","dishwashers":"DISHWASHER","dryers":"DRYER","vacuums":"VACUUM","robot-vacuums":"ROBOT_VACUUM","freezers":"FREEZER","built-in-ovens":"BUILT_IN_OVEN","freestanding-cookers":"FREESTANDING_COOKER","hobs":"HOB","range-hoods":"RANGE_HOOD","countertop-microwave-ovens":"COUNTERTOP_MICROWAVE_OVEN","built-in-microwave-ovens":"BUILT_IN_MICROWAVE_OVEN","air-purifiers":"AIR_PURIFIER","fully-automatic-espresso-machines":"FULLY_AUTOMATIC_ESPRESSO_MACHINE","manual-espresso-machines":"MANUAL_ESPRESSO_MACHINE","filter-coffee-machines":"FILTER_COFFEE_MACHINE","turkish-coffee-machines":"TURKISH_COFFEE_MACHINE","air-fryers":"AIR_FRYER","blenders":"BLENDER","food-processors":"FOOD_PROCESSOR","electric-storage-water-heaters":"ELECTRIC_STORAGE_WATER_HEATER","instantaneous-electric-water-heaters":"INSTANTANEOUS_ELECTRIC_WATER_HEATER","split-air-conditioners":"SPLIT_AIR_CONDITIONER",
});

// Governed JSON schemas differ by department; every consumed field is narrowed below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
const read = (root:string,file:string): {raw:string; value:Json} => { const raw=readFileSync(path.join(root,file),"utf8"); return {raw,value:JSON.parse(raw)}; };
const sha = (raw:string) => createHash("sha256").update(raw).digest("hex");
const exact = (value:Json) => [value.exactProductId,value.productId,value.modelCode,value.manufacturerModelIdentifier,value.configurationIdentity].filter((item):item is string=>typeof item==="string");
const identity = (departmentId:string,categoryId:SecretaryCategoryId|undefined,value:Json): GovernedProductIdentity | undefined => {
  const brand=value.manufacturer??value.brand??value.brandId; const model=value.model??value.modelCode??value.manufacturerModelIdentifier;
  return typeof brand==="string"&&typeof model==="string" ? {departmentId,categoryId,brand,model,family:typeof value.family==="string"?value.family:undefined,exactIdentifiers:exact(value)} : undefined;
};

export function loadActiveSecretaryProductIdentityIndex(root=process.cwd()): SecretaryProductIdentityIndex {
  try {
    const products: GovernedProductIdentity[]=[];
    const ep=read(root,"data/production/electronics/runtime/active.json").value;
    if(ep.lifecycle!=="ACTIVE"||ep.runtimeActive!==true||typeof ep.catalogFile!=="string") throw new Error("INVALID_ELECTRONICS_POINTER");
    const ec=read(root,ep.catalogFile); if(`sha256:${sha(ec.raw)}`!==ep.catalogArtifactSha256) throw new Error("ELECTRONICS_DIGEST_MISMATCH");
    for(const item of ec.value.products??[]) { const record=identity("ELECTRONICS",item.categoryId,item); if(record) products.push(record); else throw new Error("MALFORMED_ELECTRONICS_IDENTITY"); }
    const appliancesRoot=path.join(root,"data/production/appliances");
    for(const folder of readdirSync(appliancesRoot,{withFileTypes:true}).filter(item=>item.isDirectory())) {
      let pointer:Json; try { pointer=read(root,`data/production/appliances/${folder.name}/active.json`).value; } catch { continue; }
      if(pointer.lifecycle!=="ACTIVE"||typeof pointer.releaseVersion!=="string") continue;
      const base=`data/production/appliances/${folder.name}/releases/${pointer.releaseVersion}`;
      let artifact:{raw:string;value:Json}|undefined; for(const name of ["domain-pack.json","catalog.json"]) try { artifact=read(root,`${base}/${name}`); break; } catch {}
      if(!artifact) continue;
      const expected=pointer.artifactSha256??pointer.decisionArtifactSha256; if(typeof expected==="string"&&sha(artifact.raw)!==expected) throw new Error(`APPLIANCES_DIGEST_MISMATCH:${folder.name}`);
      const governedCategory=APPLIANCE_FOLDER_CATEGORY[folder.name]; if(!governedCategory) continue;
      for(const item of artifact.value.products??[]) { const category=(item.categoryId??item.productType??artifact.value.categoryId??governedCategory) as SecretaryCategoryId; const record=identity("APPLIANCES",category,item); if(record) products.push(record); }
    }
    const cp=read(root,"data/production/catalog/active.json").value; if(cp.state!=="ACTIVE") throw new Error("INVALID_CARS_POINTER");
    const cc=read(root,`data/production/catalog/releases/v${cp.active_catalog_release_version}/catalog.json`).value;
    for(const item of cc.records??[]) { const variant=item.variant??{}; const brand=variant.brand?.value, model=variant.model?.value; if(typeof brand==="string"&&typeof model==="string") products.push({departmentId:"CARS",brand,model,exactIdentifiers:[variant.id].filter(Boolean)}); }
    products.push(...STROLLER_PRODUCTS.map(item=>({departmentId:"BABY_AND_CHILD",categoryId:"STROLLER" as const,brand:item.manufacturer,model:item.model,exactIdentifiers:[item.exactProductId,item.configurationIdentity]})));
    products.push(...MOBILITY_PRODUCTS.map(item=>({departmentId:"MOBILITY",categoryId:item.categoryId,brand:item.brand,family:item.family,model:item.model,exactIdentifiers:[item.exactProductId,item.configurationIdentity]})));
    return buildSecretaryProductIdentityIndex(products);
  } catch(error) { return Object.freeze({status:"FAILED_CLOSED",entries:Object.freeze([]),issue:error instanceof Error?error.message:"UNKNOWN_INDEX_FAILURE"}); }
}
