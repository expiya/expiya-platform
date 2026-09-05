import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateHeadphonesCandidate } from "./headphonesEvidenceReconciliation";

const dir = path.join(process.cwd(), "data/research/electronics/headphones-evidence-closure-01");
const read = (name: string) => JSON.parse(readFileSync(path.join(dir,name),"utf8"));
const records = read("asin-reconciliation-ledger.json");
const sources = read("source-register.json");
const facts = read("technical-capability-facts.json");
const semantics = read("semantic-policy-input-proposal.json");
const canonical = (value: unknown): string => value === null || typeof value !== "object"
  ? JSON.stringify(value)
  : Array.isArray(value)
    ? `[${value.map(canonical).join(",")}]`
    : `{${Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b,"en")).map(([key,child])=>`${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
const sha = (value: unknown) => `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;

describe("headphones exact-evidence release candidate", () => {
  it("gives all 30 unique ASINs terminal statuses with no silent drop", () => {
    expect(records).toHaveLength(30);
    expect(new Set(records.map((row: {asin:string})=>row.asin)).size).toBe(30);
    expect(records.every((row: {status:string})=>["ADMITTED","REJECTED_INSUFFICIENT_TR_APPLICABILITY","REJECTED_IDENTITY_AMBIGUOUS","DUPLICATE"].includes(row.status))).toBe(true);
  });
  it("requires exact identity and manufacturer-controlled Türkiye applicability for admissions", () => {
    expect(validateHeadphonesCandidate({records,sources,facts,activationPermitted:false,rankingInputs:[]})).toEqual([]);
    const admitted = records.filter((row: {status:string})=>row.status==="ADMITTED");
    expect(admitted.every((row: {exactConfigurationKey:string|null;sourceIds:string[]})=>row.exactConfigurationKey && row.sourceIds.length)).toBe(true);
    expect(new Set(admitted.map((row: {exactConfigurationKey:string})=>row.exactConfigurationKey)).size).toBe(admitted.length);
  });
  it("keeps Amazon non-authoritative and prevents Y or commerce ranking effect", () => {
    const approval = read("release-candidate.json");
    expect(approval.amazonAuthority).toMatchObject({technical:"NONE",decision:"NONE",ranking:"NONE"});
    expect(approval.activationPermitted).toBe(false);
    expect(semantics.comparison.rankingInputs).toEqual([]);
    expect(semantics.yRuntimeEffect).toBe("NONE");
  });
  it("preserves unknowns and suppresses subjective inference", () => {
    expect(read("unknown-register.json").length).toBeGreaterThan(0);
    expect(semantics.suppressWithoutEvidence).toEqual(expect.arrayContaining(["comfort","sound quality","call quality","sport suitability"]));
  });
  it("binds every artifact and the repaired parent lineage to canonical bytes", () => {
    const manifest = read("manifest.json");
    for (const file of manifest.files) expect(sha(read(file.path))).toBe(file.digest);
    expect(manifest.parentLineage.integrity.every((row: {verified:boolean})=>row.verified)).toBe(true);
    expect(read("parent-lineage-reconciliation.json")).toMatchObject({
      disposition:"MECHANICAL_CANONICALIZATION_ERROR_REPAIRED",
      materialPayloadChange:false,
      originalDeclaredDigest:"sha256:eebe448472d75408c07c57a891ee1542b0902c8d11bec6ebeb3bd69c0a4655b0",
      repairedPersistedPayloadDigest:"sha256:f6ed79a0f2a77ca4b321888a281a0ea5f90295fcc7a76ccf1e6456ef532f61b3",
    });
  });
});
