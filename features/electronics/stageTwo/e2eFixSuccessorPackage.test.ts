import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const directory="data/research/electronics/stage2-e2e-fix-successor-package-01";
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==="object"?Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value;
const sha=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");

describe("Electronics Stage Two E2E fix successor package",()=>{
  it("binds current sources, tests, artifacts and its canonical digest",()=>{const value=JSON.parse(readFileSync(path.join(directory,"owner-review-package.json"),"utf8"));for(const group of [value.sourceSha256,value.testSha256])for(const[file,digest]of Object.entries(group))expect(sha(readFileSync(file))).toBe(digest);for(const[file,digest]of Object.entries(value.artifactSha256)){const location=file.startsWith("artifacts/")?file:path.join(directory,file);expect(sha(readFileSync(location))).toBe(digest);}const{packageDigest,...payload}=value;expect(packageDigest).toBe(`sha256:${sha(JSON.stringify(canonical(payload)))}`);});
  it("keeps the historical package immutable and requires separate execution authority",()=>{const value=JSON.parse(readFileSync(path.join(directory,"owner-review-package.json"),"utf8")),archive=JSON.parse(readFileSync(path.join(directory,"archival-characterization.json"),"utf8"));expect(archive).toMatchObject({historicalCommit:"bf9170227344a37e6c5074945e06e17eaf7bf6f0",historicalPackageDigest:"sha256:8870781edb6cfa677a3ecb11623af4fe36847e58b3f20df8ed98de06a45bd968",status:"SUPERSEDED_BY_E2E_FIX_NOT_EXECUTABLE",historicalArtifactMutated:false});expect(value).toMatchObject({verdict:"OWNER_REVIEW_ELIGIBLE",executionAuthorized:false,supersedesBlockedDraftDigest:"sha256:c8f88ada8ad915769e3bec6a943ce5df01e69dbc4159a117c797dae75b2e53be"});});
});
