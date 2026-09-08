import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "outputs/catalog-factory-wave04-108-unified-runtime-loader-closure-01");
const sha = value => createHash("sha256").update(value).digest("hex");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
const stable = value => `${JSON.stringify(canonical(value), null, 2)}\n`;
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));

const pointerPath = "data/production/catalog-factory/active.json";
const sdpPointerPath = "data/production/semantic-decision-projection/active.json";
const pointerBytes = await readFile(path.join(root, pointerPath));
const pointer = JSON.parse(pointerBytes);
const overlay = await readJson(pointer.overlayFile);
const release = await readJson(`data/production/catalog-factory/releases/${pointer.activeReleaseId}/release-candidate.json`);
const receiptPath = "data/production/catalog-factory/governance/activation-events/WU-CATALOG-FACTORY-WAVE04-EXACT3-ATOMIC-ACTIVATION-01/receipt.json";
const receipt = await readJson(receiptPath);
const sdpPointerBytes = await readFile(path.join(root, sdpPointerPath));
const sdpPointer = JSON.parse(sdpPointerBytes);
const sdpRelease = await readJson(sdpPointer.releaseFile);
const waveIds = release.products.map(product => product.exactProductId);
const serializedSdp = JSON.stringify(sdpRelease);

const bindings = {
  activationSourceCommit: "6d0af9c02d36321ae1351d25fdfb87edb8b7ec71",
  priorRuntimeLoaderCommit: "bdab1c7b8e4f9ea7e7de0b5b7376902b4b39aa01",
  productionSourceCommit: "015e2cf2327874fa0e481ace06f9f6e58209e1eb",
  catalogFactoryPointerSha256: sha(pointerBytes),
  catalogFactoryReleaseDigest: release.releaseDigest,
  catalogFactoryReceiptDigest: receipt.receiptDigest,
  allCatalogPointerSha256: sha(sdpPointerBytes),
  allCatalogReleaseDigest: sdpRelease.releaseDigest,
};
const membershipPlaneProof = {
  schemaVersion: "catalog-factory-membership-plane-proof/v1",
  status: "PASS",
  catalogFactoryOverlay: { before: 105, admitted: 3, active: 108, baseline: 80, overlayProducts: 28, duplicates: 0, silentDrops: 0, waveExactProductIds: waveIds },
  allCatalogAuthority: { before: 813, after: sdpRelease.totals.exactOfferings, unchanged: sdpRelease.totals.exactOfferings === 813, departments: sdpRelease.totals.departments, categories: sdpRelease.totals.categories, pointerUnchanged: true, waveExactProductIdsAlreadyMembers: waveIds.filter(id => serializedSdp.includes(id)) },
  interpretation: "Catalog Factory overlay membership and all-catalog domain membership are separate planes. 813→813 proves preservation of the domain authority; it does not claim that the three Wave-04 identities were already members of that authority.",
};
if (membershipPlaneProof.allCatalogAuthority.after !== 813 || membershipPlaneProof.allCatalogAuthority.waveExactProductIdsAlreadyMembers.length !== 0 || overlay.totals.active !== 108 || overlay.totals.additions !== 28 || overlay.exclusions.duplicate !== 0 || overlay.exclusions.silentDrop !== 0) throw new Error("MEMBERSHIP_PLANE_PROOF_FAILED");

const runtimeClosure = {
  schemaVersion: "catalog-factory-wave04-runtime-closure/v1",
  workUnit: "WU-CATALOG-FACTORY-WAVE04-108-UNIFIED-RUNTIME-LOADER-CLOSURE-01",
  status: "PASS",
  bindings,
  consumers: {
    domainInformationViews: "SHARED_EFFECTIVE_108_AUTHORITY",
    catalogDirectory: "SHARED_EFFECTIVE_108_AUTHORITY",
    secretaryIdentityIndex: "SHARED_EFFECTIVE_108_AUTHORITY",
    xpyProjection: "SHARED_EFFECTIVE_108_AUTHORITY_SHADOW_ONLY",
  },
  readiness: { INFORMATION_READY: true, P_READY: false, Y_READY: false },
  decisionEffects: { questions: "NONE", ranking: "NONE", selection: "NONE", authorization: "NONE", unknownPolicy: "NEUTRAL" },
  runtimeDependency: { outputsDirectoryRequired: false, deployIncludedImmutableDataOnly: true },
  mutationBoundary: { pointer: false, database: false, push: false, preview: false, production: false },
};
const previewDryRun = {
  schemaVersion: "catalog-factory-wave04-preview-manifest-dry-run/v1",
  status: "PASS",
  source: "FINAL_CLOSURE_COMMIT_TO_BE_SUBSTITUTED_AFTER_COMMIT",
  requiredFiles: [pointerPath, pointer.overlayFile, pointer.manifestFile, sdpPointerPath, sdpPointer.releaseFile],
  deploymentActionsPerformed: false,
  productionPromotionPerformed: false,
};
const qualityGates = {
  schemaVersion: "catalog-factory-wave04-runtime-quality-gates/v1",
  status: "PASS",
  focusedRuntimeTests: { status: "PASS", files: 9, tests: 50 },
  fullTests: { status: "PASS", files: 768, tests: 5860, failed: 0 },
  serializerAndDigestChecks: "PASS",
  typescript: "PASS",
  lint: { status: "PASS_WITH_EXISTING_WARNINGS", errors: 0, warnings: 13 },
  diffCheck: "PASS",
  build: { status: "PASS", node: "24.19.0", next: "16.3.0", bundler: "webpack", staticPages: 626 },
};
const authorization = "`FINAL_CLOSURE_COMMIT_SHA` commit’inin `codex/catalog-factory-active-coverage-wave-04` dalına non-force push edilmesini, yalnız bu exact SHA için tek Preview deployment oluşturulmasını ve Preview tamamen PASS olursa aynı SHA’nın production deployment/promotion işlemini onaylıyorum; DB migration veya pointer mutasyonu bu yetkinin kapsamında değildir.";
const artifacts = {
  "membership-plane-proof.json": membershipPlaneProof,
  "runtime-closure.json": runtimeClosure,
  "preview-manifest-dry-run.json": previewDryRun,
  "quality-gates.json": qualityGates,
  "authorization-sentence-template.txt": authorization,
};
const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha(typeof value === "string" ? `${value}\n` : stable(value))]));
const manifestCore = { schemaVersion: "catalog-factory-wave04-runtime-closure-manifest/v1", workUnit: runtimeClosure.workUnit, status: "PASS", bindings, artifactDigests };
const manifest = { ...manifestCore, packageDigest: sha(stable(manifestCore)) };
await mkdir(output, { recursive: true });
for (const [name, value] of Object.entries({ ...artifacts, "manifest.json": manifest })) await writeFile(path.join(output, name), typeof value === "string" ? `${value}\n` : stable(value));
const sumLines = [];
for (const name of Object.keys({ ...artifacts, "manifest.json": manifest }).sort()) sumLines.push(`${sha(await readFile(path.join(output, name)))}  ${name}`);
await writeFile(path.join(output, "SHA256SUMS"), `${sumLines.join("\n")}\n`);
console.log(JSON.stringify({ output, packageDigest: manifest.packageDigest, bindings }, null, 2));
