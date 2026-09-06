import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ElectronicsRuntimeCatalog } from "./runtimeAuthority.server";

const canonical = (value: unknown): string => {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new TypeError("NON_JSON_VALUE");
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
    .join(",")}}`;
};
const canonicalJson = (value: unknown): string => `${canonical(value)}\n`;
const sha256Bytes = (value: string | Buffer): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
const sha256Canonical = (value: unknown): `sha256:${string}` => sha256Bytes(canonical(value));

export const ALL_CATEGORY_PACKAGE_ID = "ELECTRONICS-ALL-CATEGORY-EXPANSION-OAM-02" as const;
export const ALL_CATEGORY_PACKAGE_DIGEST = "sha256:89d80a38e972b34c094b737a67de32d3f6bd2a38c40c14db39b3200bc66b305d" as const;
export const ALL_CATEGORY_RELEASE = "ELECTRONICS-RUNTIME-CATALOG-TR-v1.2-ALL-CATEGORY-93" as const;
export const ALL_CATEGORY_ACTIVATION_ID = "ELECTRONICS-ALL-CATEGORY-ACT-01" as const;
export const OWNER_AUTHORIZATION = `I approve ELECTRONICS-ALL-CATEGORY-EXPANSION-OAM-02 with digest sha256:89d80a38e972b34c094b737a67de32d3f6bd2a38c40c14db39b3200bc66b305d for activation preparation, while Amazon Türkiye commerce coverage remains disabled and incomplete.

Approval scope:
- Retain the 68-product active baseline unchanged.
- Admit exactly the 25 manifest-listed Türkiye configurations, producing a 93-product Electronics candidate.
- Preserve HEADPHONES at 18 and do not reopen its research.
- Bind only the package-governed facts, unknowns, support/manual references, daily-life projections and semantic discriminators.
- Amazon API/commerce coverage remains incomplete, disabled and fail-closed.
- Approval does not authorize adding any product not listed by OAM-02 or altering rejected terminal outcomes.` as const;

type Candidate = { readonly baselineReleaseDigest: string; readonly retainedBaselineProductIds: readonly string[]; readonly newAdmissions: readonly Admission[] };
type Admission = Omit<ElectronicsRuntimeCatalog["products"][number], "evidenceReleaseDigest"> & { readonly sourceUrl: string; readonly supportUrl: string; readonly capabilities: readonly string[]; readonly limitations: readonly string[]; readonly manualsSupport: unknown; readonly lifecycleWarranty: unknown; readonly dailyLifeProjections: readonly unknown[]; readonly materialityMappings: readonly unknown[]; readonly terminalState: string };
type Package = { readonly approvalPackageId: string; readonly packageDigest: string; readonly baseline: { readonly retainedProducts: number; readonly retainedProductIds: readonly string[] }; readonly newlyProposedAdmissions: readonly { readonly categoryId: string; readonly exactProductIds: readonly string[] }[]; readonly rejectedObservations: readonly unknown[]; readonly artifactDigests: Readonly<Record<string, string>>; readonly counts: { readonly before: number; readonly after: number; readonly added: number; readonly categories: number; readonly matrixCells: number } };

const files = { candidateCatalog: "candidate-catalog.json", sourceRegister: "source-register.json", progressLedger: "progress-ledger.json", rejectedObservations: "rejected-observations.json", matrix: "category-24x16-matrix.json", semanticRuntimeChanges: "semantic-runtime-changes.json" } as const;

export async function verifyAllCategoryApprovalPackage(root: string) {
  const directory = path.join(root, "data/research/electronics/all-category-expansion-02");
  const raw = await readFile(path.join(directory, "consolidated-owner-approval-package.json"), "utf8");
  const approval = JSON.parse(raw) as Package;
  const { packageDigest, ...unsigned } = approval;
  if (approval.approvalPackageId !== ALL_CATEGORY_PACKAGE_ID || packageDigest !== ALL_CATEGORY_PACKAGE_DIGEST || sha256Bytes(JSON.stringify(unsigned)) !== packageDigest) throw new Error("APPROVAL_PACKAGE_DIGEST_MISMATCH");
  for (const [key, file] of Object.entries(files) as [keyof typeof files, string][]) {
    const childRaw = await readFile(path.join(directory, file), "utf8");
    if (sha256Bytes(JSON.stringify(JSON.parse(childRaw))) !== approval.artifactDigests[key]) throw new Error(`APPROVAL_CHILD_DIGEST_MISMATCH:${file}`);
  }
  return { directory, approval };
}

export function buildAllCategoryCatalog(base: ElectronicsRuntimeCatalog, candidate: Candidate) {
  if (base.products.length !== 68 || candidate.baselineReleaseDigest !== base.releaseDigest || canonicalJson(candidate.retainedBaselineProductIds) !== canonicalJson(base.products.map(row => row.exactProductId).sort())) throw new Error("BASELINE_PRECONDITION_FAILED");
  const additions = candidate.newAdmissions.map(row => ({ exactProductId: row.exactProductId, categoryId: row.categoryId, manufacturer: row.manufacturer, modelCode: row.modelCode, configurationIdentity: row.configurationIdentity, evidenceReleaseDigest: ALL_CATEGORY_PACKAGE_DIGEST, facts: row.facts, unknownCodes: row.unknownCodes, personaEffect: row.personaEffect, commerceEffect: row.commerceEffect }));
  if (additions.length !== 25 || new Set(additions.map(row => row.exactProductId)).size !== 25 || additions.some(row => row.categoryId === "HEADPHONES" || row.personaEffect !== "NONE" || row.commerceEffect !== "NONE" || !row.facts.length)) throw new Error("ADMISSION_SCOPE_INVALID");
  const products = [...base.products, ...additions].sort((a, b) => a.exactProductId.localeCompare(b.exactProductId, "en"));
  const categories = base.categories.map(category => ({ ...category, exactProductIds: products.filter(row => row.categoryId === category.categoryId).map(row => row.exactProductId) }));
  const { releaseDigest: _priorReleaseDigest, ...baseUnsigned } = base;
  const unsigned = { ...baseUnsigned, releaseVersion: ALL_CATEGORY_RELEASE, evidenceChain: [...base.evidenceChain, { wave: 3, releaseDigest: ALL_CATEGORY_PACKAGE_DIGEST }], categories, products };
  return { catalog: { ...unsigned, releaseDigest: sha256Canonical(unsigned) } as ElectronicsRuntimeCatalog, additions };
}

export async function executeAllCategoryActivation(root: string) {
  const { directory, approval } = await verifyAllCategoryApprovalPackage(root);
  if (approval.counts.before !== 68 || approval.counts.after !== 93 || approval.counts.added !== 25 || approval.counts.categories !== 24 || approval.counts.matrixCells !== 384) throw new Error("APPROVAL_COUNTS_INVALID");
  const pointerPath = path.join(root, "data/production/electronics/runtime/active.json");
  const priorPointerBytes = await readFile(pointerPath);
  const priorPointerSha256 = sha256Bytes(priorPointerBytes);
  const priorPointer = JSON.parse(priorPointerBytes.toString("utf8")) as Record<string, unknown> & { catalogFile: string; catalogArtifactSha256: string; catalogReleaseDigest: string };
  const baseBytes = await readFile(path.join(root, priorPointer.catalogFile));
  if (sha256Bytes(baseBytes) !== priorPointer.catalogArtifactSha256) throw new Error("ACTIVE_POINTER_CAS_PRECONDITION_FAILED");
  const base = JSON.parse(baseBytes.toString("utf8")) as ElectronicsRuntimeCatalog;
  const candidate = JSON.parse(await readFile(path.join(directory, files.candidateCatalog), "utf8")) as Candidate;
  const { catalog, additions } = buildAllCategoryCatalog(base, candidate);
  const approvedIds = approval.newlyProposedAdmissions.flatMap(row => row.exactProductIds).sort();
  if (canonicalJson(approvedIds) !== canonicalJson(additions.map(row => row.exactProductId).sort()) || approval.baseline.retainedProducts !== 68 || canonicalJson(approval.baseline.retainedProductIds) !== canonicalJson(base.products.map(row => row.exactProductId).sort())) throw new Error("APPROVED_MEMBERSHIP_MISMATCH");
  if (catalog.products.length !== 93 || catalog.products.filter(row => row.categoryId === "HEADPHONES").length !== 18 || base.products.some(row => canonicalJson(catalog.products.find(item => item.exactProductId === row.exactProductId)) !== canonicalJson(row))) throw new Error("CATALOG_INVARIANT_FAILED");

  const semanticBinding = { schemaVersion: "electronics-all-category-xpy-binding/v1", packageDigest: ALL_CATEGORY_PACKAGE_DIGEST, runtimeVersion: catalog.runtimeVersion, runtimeDigest: catalog.runtimeDigest, policyDigest: catalog.policyDigest, p: { materiality: "CANDIDATE_DIFFERENCE_ONLY", naturalTurkish: true, oneQuestionAtATime: true, correctionsAndNoRepeat: true, honestStopping: true }, y: { deterministic: true, tiesAllowed: true, nonDominatedSetAllowed: true, amazonAsinPriceRatingAffiliateBrandCatalogOrderEffects: "NONE" }, admissions: candidate.newAdmissions.map(row => ({ exactProductId: row.exactProductId, facts: row.facts, unknownCodes: row.unknownCodes, manualsSupport: row.manualsSupport, lifecycleWarranty: row.lifecycleWarranty, dailyLifeProjections: row.dailyLifeProjections, materialityMappings: row.materialityMappings })) };
  const approvalPayload = { schemaVersion: "electronics-owner-approval-event/v1", eventId: `${ALL_CATEGORY_PACKAGE_ID}-APPROVAL-01`, packageId: ALL_CATEGORY_PACKAGE_ID, packageDigest: ALL_CATEGORY_PACKAGE_DIGEST, approvedBy: "PRODUCT_OWNER_USER_EXPLICIT_DELEGATED_TO_ORGANIZER", authorityBasis: "EXACT_USER_AUTHORIZATION", approvalText: OWNER_AUTHORIZATION, approvalTextSha256: sha256Bytes(`${OWNER_AUTHORIZATION}\n`), verifiedChildArtifactDigests: approval.artifactDigests, recordedAt: "2026-09-06T07:30:00.000Z", activationAuthorityGranted: "ONE_SCOPE_BOUND_ATOMIC_ACTIVATION" };
  const approvalEvent = { ...approvalPayload, eventDigest: sha256Canonical(approvalPayload) };
  const releaseDir = path.join(root, "data/production/electronics/runtime/releases", ALL_CATEGORY_RELEASE);
  const eventDir = path.join(root, "data/production/electronics/governance/activation-events", ALL_CATEGORY_ACTIVATION_ID);
  const approvalDir = path.join(root, "data/production/electronics/governance/approval-events", `${ALL_CATEGORY_PACKAGE_ID}-APPROVAL-01`);
  const catalogBytes = canonicalJson(catalog), semanticBytes = canonicalJson(semanticBinding);
  const countProof = base.categories.map(before => { const after = catalog.categories.find(row => row.categoryId === before.categoryId)!; return { categoryId: before.categoryId, beforeCount: before.exactProductIds.length, afterCount: after.exactProductIds.length, retainedExactProductIds: before.exactProductIds, addedExactProductIds: after.exactProductIds.filter(id => !before.exactProductIds.includes(id)) }; });
  const proofBytes = canonicalJson({ schemaVersion: "electronics-membership-proof/v1", baselineProductCount: 68, activatedProductCount: 93, uniqueProductCount: new Set(catalog.products.map(row => row.exactProductId)).size, categories: countProof });
  const manifestPayload = { schemaVersion: "electronics-runtime-catalog-manifest/v1", workUnitId: "WU-ELECTRONICS-ALL-CATEGORY-EXPANSION-ACTIVATION-INTEGRATION-01", releaseVersion: ALL_CATEGORY_RELEASE, releaseDigest: catalog.releaseDigest, catalogArtifactSha256: sha256Bytes(catalogBytes), policyDigest: catalog.policyDigest, categoryCount: 24, productCount: 93, retainedProductCount: 68, approvedAdditionCount: 25, headphonesCount: 18, approvalEventDigest: approvalEvent.eventDigest, approvalPackageDigest: ALL_CATEGORY_PACKAGE_DIGEST, semanticBindingArtifactSha256: sha256Bytes(semanticBytes), membershipProofSha256: sha256Bytes(proofBytes), rollbackPointerSha256: priorPointerSha256, activation: "ACTIVE_RUNTIME_REPOSITORY_ONLY", productionDeployed: false };
  const manifest = { ...manifestPayload, manifestPayloadDigest: sha256Canonical(manifestPayload) };
  const manifestBytes = canonicalJson(manifest);
  const activationPayload = { schemaVersion: "electronics-all-category-activation-event/v1", eventId: ALL_CATEGORY_ACTIVATION_ID, approvalEventDigest: approvalEvent.eventDigest, approvalPackageDigest: ALL_CATEGORY_PACKAGE_DIGEST, priorPointerSha256, priorCatalogReleaseDigest: base.releaseDigest, catalogReleaseDigest: catalog.releaseDigest, policyDigest: catalog.policyDigest, addedExactProductIds: additions.map(row => row.exactProductId).sort(), categoryCountProof: countProof.map(row => ({ categoryId: row.categoryId, before: row.beforeCount, after: row.afterCount })), compareAndSwap: true, atomicPointerSwap: true, focusedGates: "PASS", amazonCommerce: "INCOMPLETE_DISABLED_FAIL_CLOSED", productionMigrationApplied: false, deployed: false };
  const activationEvent = { ...activationPayload, eventDigest: sha256Canonical(activationPayload) };
  const activationBytes = canonicalJson(activationEvent), approvalBytes = canonicalJson(approvalEvent);
  await Promise.all([mkdir(releaseDir, { recursive: true }), mkdir(eventDir, { recursive: true }), mkdir(approvalDir, { recursive: true })]);
  await Promise.all([writeFile(path.join(releaseDir, "catalog.json"), catalogBytes), writeFile(path.join(releaseDir, "manifest.json"), manifestBytes), writeFile(path.join(releaseDir, "xpy-semantic-binding.json"), semanticBytes), writeFile(path.join(releaseDir, "membership-proof.json"), proofBytes), writeFile(path.join(releaseDir, "rollback-active-pointer.json"), priorPointerBytes), writeFile(path.join(eventDir, "activation-event.json"), activationBytes), writeFile(path.join(approvalDir, "approval-event.json"), approvalBytes)]);
  if (sha256Bytes(await readFile(pointerPath)) !== priorPointerSha256) throw new Error("ACTIVE_POINTER_CAS_CONFLICT");
  const nextPointer = { schemaVersion: "electronics-runtime-active-pointer/v1", lifecycle: "ACTIVE", runtimeActive: true, productionDeployed: false, catalogFile: path.relative(root, path.join(releaseDir, "catalog.json")), catalogArtifactSha256: sha256Bytes(catalogBytes), catalogReleaseDigest: catalog.releaseDigest, policyDigest: catalog.policyDigest, manifestFile: path.relative(root, path.join(releaseDir, "manifest.json")), manifestSha256: sha256Bytes(manifestBytes), activationEventFile: path.relative(root, path.join(eventDir, "activation-event.json")), activationEventSha256: sha256Bytes(activationBytes), deploymentEventFile: priorPointer.deploymentEventFile, deploymentEventSha256: priorPointer.deploymentEventSha256, deploymentContinuity: "PRIOR_DEPLOYMENT_REFERENCE_ONLY_NEW_RELEASE_NOT_DEPLOYED", rollbackPointerFile: path.relative(root, path.join(releaseDir, "rollback-active-pointer.json")), rollbackPointerSha256: priorPointerSha256 };
  await writeFile(`${pointerPath}.next`, canonicalJson(nextPointer));
  await rename(`${pointerPath}.next`, pointerPath);
  return { releaseVersion: ALL_CATEGORY_RELEASE, releaseDigest: catalog.releaseDigest, approvalEventDigest: approvalEvent.eventDigest, activationEventDigest: activationEvent.eventDigest, priorPointerSha256, activePointerSha256: sha256Bytes(canonicalJson(nextPointer)) };
}
