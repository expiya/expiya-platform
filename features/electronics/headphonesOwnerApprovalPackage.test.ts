import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { HEADPHONES_OWNER_APPROVAL_SENTENCE, HEADPHONES_OWNER_PACKAGE_ID, readHeadphonesPackageInputs, sha256Bytes, validateHeadphonesOwnerPackageInputs, writeHeadphonesOwnerPackage } from "./headphonesOwnerApprovalPackage";

const root = process.cwd();

describe("HEADPHONES immutable owner approval package", () => {
  it("validates the exact governed release without changing authority", async () => {
    const input = await readHeadphonesPackageInputs(root);
    expect(validateHeadphonesOwnerPackageInputs(input)).toEqual([]);
    expect(input.admittedProducts.map((row) => row.exactConfigurationKey)).toHaveLength(16);
    expect(input.records.filter((row) => row.status === "REJECTED_INSUFFICIENT_TR_APPLICABILITY")).toHaveLength(13);
    expect(input.records.filter((row) => row.status === "REJECTED_IDENTITY_AMBIGUOUS")).toHaveLength(1);
  });

  it("generates byte-identical packages twice", async () => {
    const first = await mkdtemp(path.join(os.tmpdir(), "headphones-owner-a-"));
    const second = await mkdtemp(path.join(os.tmpdir(), "headphones-owner-b-"));
    const a = await writeHeadphonesOwnerPackage(root, first);
    const b = await writeHeadphonesOwnerPackage(root, second);
    expect(a.canonicalManifestDigest).toBe(b.canonicalManifestDigest);
    expect(await readdir(first)).toEqual(await readdir(second));
    for (const name of await readdir(first)) expect(await readFile(path.join(first, name))).toEqual(await readFile(path.join(second, name)));
  });

  it("binds package checksums, exclusions, and exact approval wording", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "headphones-owner-check-"));
    const result = await writeHeadphonesOwnerPackage(root, output);
    const manifestRaw = await readFile(path.join(output, "approval-manifest.json"));
    const manifest = JSON.parse(manifestRaw.toString("utf8"));
    const checksums = JSON.parse(await readFile(path.join(output, "checksums.json"), "utf8"));
    expect(manifest.packageId).toBe(HEADPHONES_OWNER_PACKAGE_ID);
    expect(manifest.lifecycle).toBe("AWAITING_EXPLICIT_OWNER_APPROVAL");
    expect(manifest.activationPermitted).toBe(false);
    expect(manifest.membership).toHaveLength(16);
    expect(manifest.scopeDisclaimer).toContain("does not attest any rejected configuration");
    expect(manifest.explicitCoverageGaps).toEqual(["neckband", "bone-conduction", "hearing-assistance-specific"]);
    expect(manifest.ownerApprovalSentence).toBe(HEADPHONES_OWNER_APPROVAL_SENTENCE);
    expect(checksums.artifacts["approval-manifest.json"]).toBe(sha256Bytes(manifestRaw));
    expect(result.canonicalManifestDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
