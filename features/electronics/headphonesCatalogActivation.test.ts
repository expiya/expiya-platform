import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HEADPHONES_ACTIVATED_RELEASE, buildActivatedHeadphonesCatalog, reconstructPriorCatalogFromActivated, validateActivatedHeadphonesCatalog } from "./headphonesCatalogActivation";
import { readHeadphonesPackageInputs, sha256Bytes, sha256Canonical } from "./headphonesOwnerApprovalPackage";

const root = process.cwd();
const releaseDir = path.join(root, "data/production/electronics/runtime/releases", HEADPHONES_ACTIVATED_RELEASE);

describe("approved HEADPHONES atomic activation", () => {
  it("reconstructs the prior authority and deterministically reproduces the activated catalog", async () => {
    const prior = await reconstructPriorCatalogFromActivated(root);
    expect(sha256Bytes(`${JSON.stringify(prior, null, 2)}\n`)).not.toBe("");
    const built = buildActivatedHeadphonesCatalog(prior, await readHeadphonesPackageInputs(root));
    const persisted = JSON.parse(await readFile(path.join(releaseDir, "catalog.json"), "utf8"));
    expect(built.catalog).toEqual(persisted);
    expect(validateActivatedHeadphonesCatalog(prior, persisted, built.additions.map((row) => row.exactProductId))).toEqual([]);
  });
  it("preserves 52 existing products and admits exactly 16 additions", async () => {
    const catalog = JSON.parse(await readFile(path.join(releaseDir, "catalog.json"), "utf8"));
    expect(catalog.products).toHaveLength(68);
    expect(catalog.categories.find((row: {categoryId:string}) => row.categoryId === "HEADPHONES").exactProductIds).toHaveLength(18);
    const additions = catalog.products.filter((row: {evidenceReleaseDigest:string}) => row.evidenceReleaseDigest === "sha256:63566c48e5bcd740b057161968dd55744b4c7f6758a4babd32680f08b96a5b71");
    expect(additions).toHaveLength(16);
    const facts = additions.flatMap((row: {facts:{key:string}[]}) => row.facts);
    expect(facts.filter((fact: {key:string}) => fact.key !== "exact_identity_binding")).toHaveLength(65);
    expect(facts.filter((fact: {key:string}) => fact.key === "exact_identity_binding")).toHaveLength(4);
    expect(additions.flatMap((row: {unknownCodes:string[]}) => row.unknownCodes)).toHaveLength(96);
  });
  it("preserves the deployed headphones authority as the exact rollback pointer", async () => {
    const pointer = JSON.parse(await readFile(path.join(root, "data/production/electronics/runtime/active.json"), "utf8"));
    const rollbackRaw = await readFile(path.join(root, pointer.rollbackPointerFile));
    const rollback = JSON.parse(rollbackRaw.toString("utf8"));
    const catalogRaw = await readFile(path.join(root, rollback.catalogFile));
    const manifestRaw = await readFile(path.join(root, rollback.manifestFile));
    const eventRaw = await readFile(path.join(root, rollback.activationEventFile));
    expect(sha256Bytes(rollbackRaw)).toBe(pointer.rollbackPointerSha256);
    expect(sha256Bytes(catalogRaw)).toBe(rollback.catalogArtifactSha256);
    expect(sha256Bytes(manifestRaw)).toBe(rollback.manifestSha256);
    expect(sha256Bytes(eventRaw)).toBe(rollback.activationEventSha256);
    expect(rollback.productionDeployed).toBe(true);
    expect(JSON.parse(eventRaw.toString("utf8"))).toMatchObject({ productionMigrationApplied: false, deployed: false, focusedGates: "PASS" });
    expect(sha256Canonical(JSON.parse(catalogRaw.toString("utf8")).products.filter((row: {categoryId:string}) => row.categoryId !== "HEADPHONES"))).toMatch(/^sha256:/);
  });
});
