import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const directory="data/research/electronics/stage2-legacy-decision-fingerprint-bridge-01";
const immutablePackageCommit="bf9170227344a37e6c5074945e06e17eaf7bf6f0";
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==="object"?Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value;
const sha=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
describe("Electronics legacy decision fingerprint bridge package",()=>{
  it("binds every historical source and test to the exact immutable package commit",()=>{const value=JSON.parse(readFileSync(path.join(directory,"owner-review-package.json"),"utf8"));for(const group of [value.sourceSha256,value.testSha256])for(const[file,digest]of Object.entries(group))expect(sha(execFileSync("git",["show",`${immutablePackageCommit}:${file}`]))).toBe(digest);for(const[file,digest]of Object.entries(value.artifactSha256))expect(sha(readFileSync(path.join(directory,file)))).toBe(digest);const{packageDigest,...payload}=value;expect(packageDigest).toBe(`sha256:${sha(JSON.stringify(canonical(payload)))}`);expect(readFileSync(path.join(directory,"approval-sentence.txt"),"utf8")).toContain(packageDigest);});
  it("requires separate execution authority and preserves all excluded boundaries",()=>{const value=JSON.parse(readFileSync(path.join(directory,"owner-review-package.json"),"utf8"));expect(value).toMatchObject({verdict:"OWNER_REVIEW_ELIGIBLE",migration:{required:false},readOnlyEligibility:{decisionRecords:4,eligible:4,databaseWrite:false},currentMutations:{push:false,preview:false,databaseWrite:false,productionDeployment:false}});expect(value.excludedScope).toEqual(expect.arrayContaining(["STAGE_ONE_CREATE_OR_MUTATION","MEMBERSHIP","RANKING","P_Y","STAGE_THREE","SALES","PAYMENT"]));});
});
