import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root=path.join(process.cwd(),"data/research/electronics/smartphone-amazon-tr-catalog-expansion-02/exact-set-reconciliation-e0928d0");
const read=(name:string)=>JSON.parse(readFileSync(path.join(root,name),"utf8"));

describe("SMARTPHONE v02 exact active-set reconciliation",()=>{
 it("reconciles all six active identities without duplicates or silent drops",()=>{
  const reconciliation=read("active-six-reconciliation.json"), proof=read("membership-proof.json");
  expect(reconciliation.counts).toEqual({active:6,exactOverlap:0,replaced:5,preserved:1});
  expect(reconciliation.rows).toHaveLength(6);
  expect(proof.counts).toMatchObject({preservedNonSmartphone:87,replacedActiveSmartphone:5,preservedActiveSmartphone:1,pendingAdmitted:33,finalTotal:121,finalSmartphone:34,headphones:18,categories:24,duplicates:0,silentDrops:0});
 });
 it("retains the uncovered active iPhone 16e",()=>{
  const proof=read("membership-proof.json"), id="electronics:smartphone:apple:iphone-16e-128-white";
  expect(proof.activeReconciliation.find((row:{activeExactProductId:string})=>row.activeExactProductId===id).disposition).toBe("PRESERVED_ACTIVE_NOT_COVERED_BY_PACKAGE");
  expect(proof.finalSmartphoneExactProductIds).toContain(id);
 });
 it("preserves 18 headphones and all non-smartphone category memberships",()=>{
  const proof=read("membership-proof.json");
  expect(proof.headphonesExactProductIds).toHaveLength(18);
  expect(proof.categories).toHaveLength(24);
  expect(proof.categories.filter((row:{categoryId:string})=>row.categoryId!=="SMARTPHONE").every((row:{preservation:string})=>row.preservation==="IDENTICAL_TO_ELECTRONICS_V1_2")).toBe(true);
 });
 it("is manifest-bound and strictly read-only",()=>{
  const manifest=read("manifest.json"), plan=read("integration-plan.json");
  for(const file of manifest.files){const bytes=readFileSync(path.join(root,file.name));expect(`sha256:${createHash("sha256").update(bytes).digest("hex")}`).toBe(file.sha256);}
  expect(plan.status).toBe("READ_ONLY_NOT_AUTHORIZED_NOT_ACTIVE");
  expect(plan.invariants).toEqual({push:false,activePointerMutation:false,runtimeMutation:false,activation:false,deployment:false});
 });
});
