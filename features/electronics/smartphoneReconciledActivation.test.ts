import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root=process.cwd(), read=(p:string)=>JSON.parse(readFileSync(path.join(root,p),"utf8")), sha=(p:string)=>`sha256:${createHash("sha256").update(readFileSync(path.join(root,p))).digest("hex")}`;
describe("reconciled smartphone v02 activation",()=>{
 const pointer=read("data/production/electronics/runtime/active.json"), catalog=read(pointer.catalogFile), manifest=read(pointer.manifestFile), event=read(pointer.activationEventFile);
 it("binds pointer to the immutable release artifacts",()=>{expect(sha(pointer.catalogFile)).toBe(pointer.catalogArtifactSha256);expect(sha(pointer.manifestFile)).toBe(pointer.manifestSha256);expect(sha(pointer.activationEventFile)).toBe(pointer.activationEventSha256);expect(manifest.releaseDigest).toBe(pointer.catalogReleaseDigest);});
 it("activates the authorized reconciled counts",()=>{expect(event.after).toEqual({total:121,unique:121,smartphone:34,nonSmartphone:87,headphones:18,duplicates:0,silentDrops:0});expect(catalog.products).toHaveLength(121);expect(new Set(catalog.products.map((p:{exactProductId:string})=>p.exactProductId)).size).toBe(121);expect(catalog.products.filter((p:{categoryId:string})=>p.categoryId==="SMARTPHONE")).toHaveLength(34);expect(catalog.products.filter((p:{categoryId:string})=>p.categoryId==="HEADPHONES")).toHaveLength(18);});
 it("preserves the previously uncovered active iPhone and all 24 categories",()=>{expect(catalog.products.some((p:{exactProductId:string})=>p.exactProductId==="electronics:smartphone:apple:iphone-16e-128-white")).toBe(true);expect(catalog.categories).toHaveLength(24);expect(event.checks).toMatchObject({exactReconciliation:"PASS_6_OF_6",nonSmartphoneIdentity:"PASS_87_OF_87",headphones:"PASS_18_OF_18",categories:"PASS_24_OF_24"});});
 it("has a bound rollback and a verified post-activation deployment receipt",()=>{expect(sha(pointer.rollbackPointerFile)).toBe(pointer.rollbackPointerSha256);expect(pointer.productionDeployed).toBe(true);expect(sha(pointer.deploymentEventFile)).toBe(pointer.deploymentEventSha256);expect(event).toMatchObject({pushed:false,deployed:false,deploymentAuthorized:false});});
});
