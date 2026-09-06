import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { HEADPHONES_OWNER_APPROVAL_SENTENCE, HEADPHONES_OWNER_PACKAGE_ID, canonicalJson, readHeadphonesPackageInputs, sha256Bytes, sha256Canonical } from "./headphonesOwnerApprovalPackage";

export const HEADPHONES_ACTIVATED_RELEASE = "ELECTRONICS-RUNTIME-CATALOG-TR-v1.1-HEADPHONES" as const;
export const HEADPHONES_ACTIVATION_ID = "ELECTRONICS-HEADPHONES-ACT-01" as const;
export const APPROVAL_MANIFEST_CANONICAL_DIGEST = "sha256:c11c07e4c04a1c1282fda87dc22e19063bca4b97b3afa7e87d50f6f7b3638c11" as const;
const PRIOR_CATALOG_ARTIFACT_DIGEST = "sha256:a52ab57cb92323764e4b8d7343fc38b6cd92462feb0e0b1a3f7c6a06b432a121" as const;
const POLICY_DIGEST = "sha256:0f4db5148d6a6971b7a9341b2c0c56c298753dd2ab592b75d09fbdd372b7c20a" as const;
const XPY_DIGEST = "96a533872b3b47c594e982cf5a71e3eb50c226aef65b3f4214b71a29b87ed6ee" as const;

type RuntimeFact = { readonly factId: string; readonly key: string; readonly value: unknown; readonly sourceId: string; readonly locator: string };
type RuntimeProduct = { readonly exactProductId: string; readonly categoryId: string; readonly manufacturer: string; readonly modelCode: string; readonly configurationIdentity: string; readonly evidenceReleaseDigest: string; readonly facts: readonly RuntimeFact[]; readonly unknownCodes: readonly string[]; readonly personaEffect: "NONE"; readonly commerceEffect: "NONE" };
type RuntimeCatalog = { readonly schemaVersion: string; readonly releaseVersion: string; readonly departmentId: string; readonly market: string; readonly lifecycle: string; readonly policyVersion: string; readonly policyDigest: string; readonly runtimeVersion: string; readonly runtimeDigest: string; readonly domainPackId: string; readonly evidenceChain: readonly unknown[]; readonly categories: readonly { readonly categoryId: string; readonly exactProductIds: readonly string[] }[]; readonly products: readonly RuntimeProduct[]; readonly releaseDigest: string };

const slug = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const approvalTextHash = () => sha256Bytes(`${HEADPHONES_OWNER_APPROVAL_SENTENCE}\n`);

export function buildActivatedHeadphonesCatalog(base: RuntimeCatalog, input: Awaited<ReturnType<typeof readHeadphonesPackageInputs>>) {
  const { releaseDigest: priorReleaseDigest, ...baseUnsigned } = base;
  if (sha256Canonical(baseUnsigned) !== priorReleaseDigest || base.policyDigest !== POLICY_DIGEST || base.runtimeDigest !== XPY_DIGEST || base.domainPackId !== "electronics-stage1/v1") throw new Error("PRIOR_AUTHORITY_BINDING_INVALID");
  const admitted = input.admittedProducts;
  const factsByKey = new Map<string, typeof input.facts>();
  const unknownsByKey = new Map<string, typeof input.unknowns>();
  for (const fact of input.facts) factsByKey.set(fact.productKey, [...(factsByKey.get(fact.productKey) ?? []), fact]);
  for (const item of input.unknowns) unknownsByKey.set(item.productKey, [...(unknownsByKey.get(item.productKey) ?? []), item]);
  const additions: RuntimeProduct[] = admitted.map((row) => {
    const productKey = row.exactConfigurationKey!;
    const exactProductId = `electronics:headphones:${slug(row.manufacturer)}:${slug(row.exactCommercialModel)}:${slug(row.identityRelevantVariant ?? row.modelCode ?? "standard")}`;
    const technicalFacts = (factsByKey.get(productKey) ?? []).map((fact, index) => ({ factId: `headphones-v1.1:${slug(productKey)}:${slug(fact.factKey)}:${index + 1}`, key: fact.factKey, value: fact.value, sourceId: fact.sourceIds[0]!, locator: `Bound manufacturer-controlled source ${fact.sourceIds[0]}; evidence-closure manifest sha256:63566c48e5bcd740b057161968dd55744b4c7f6758a4babd32680f08b96a5b71` }));
    const facts = technicalFacts.length ? technicalFacts : [{ factId: `headphones-v1.1:${slug(productKey)}:exact-identity:1`, key: "exact_identity_binding", value: productKey, sourceId: row.sourceIds[0]!, locator: `Runtime-required identity binding from approved exact product record; not an additional technical-capability fact` }];
    return { exactProductId, categoryId: "HEADPHONES", manufacturer: row.manufacturer, modelCode: row.modelCode ?? row.exactCommercialModel, configurationIdentity: `${productKey}|${row.formFactor}|${row.connectivity.join("+")}|${row.bundleTopology}|TR`, evidenceReleaseDigest: "sha256:63566c48e5bcd740b057161968dd55744b4c7f6758a4babd32680f08b96a5b71", facts, unknownCodes: (unknownsByKey.get(productKey) ?? []).map((item) => item.factKey).sort(), personaEffect: "NONE" as const, commerceEffect: "NONE" as const };
  }).sort((a, b) => a.exactProductId.localeCompare(b.exactProductId, "en"));
  if (new Set(additions.map((row) => row.exactProductId)).size !== 16 || additions.some((row) => !row.facts.length || row.unknownCodes.length !== 6)) throw new Error("ACTIVATED_ADDITION_INVALID");
  const addedIds = new Set(additions.map((row) => row.exactProductId));
  if (base.products.some((row) => addedIds.has(row.exactProductId))) throw new Error("ACTIVATION_ID_COLLISION");
  const products = [...base.products, ...additions].sort((a, b) => a.exactProductId.localeCompare(b.exactProductId, "en"));
  const categories = base.categories.map((category) => category.categoryId === "HEADPHONES" ? { ...category, exactProductIds: products.filter((row) => row.categoryId === "HEADPHONES").map((row) => row.exactProductId) } : category);
  const unsigned = { ...baseUnsigned, releaseVersion: HEADPHONES_ACTIVATED_RELEASE, evidenceChain: [...base.evidenceChain, { wave: 2, releaseDigest: "sha256:63566c48e5bcd740b057161968dd55744b4c7f6758a4babd32680f08b96a5b71" }], categories, products };
  const catalog = { ...unsigned, releaseDigest: sha256Canonical(unsigned) };
  return { catalog, additions };
}

export function validateActivatedHeadphonesCatalog(base: RuntimeCatalog, catalog: RuntimeCatalog, additionIds: readonly string[]): readonly string[] {
  const issues: string[] = [];
  const { releaseDigest, ...unsigned } = catalog;
  if (sha256Canonical(unsigned) !== releaseDigest) issues.push("RELEASE_DIGEST_MISMATCH");
  if (catalog.policyDigest !== POLICY_DIGEST || catalog.runtimeDigest !== XPY_DIGEST || catalog.domainPackId !== "electronics-stage1/v1") issues.push("XPY_OR_POLICY_BINDING_MISMATCH");
  const additions = catalog.products.filter((row) => additionIds.includes(row.exactProductId));
  const technicalFactCount = additions.flatMap((row) => row.facts).filter((fact) => fact.key !== "exact_identity_binding").length;
  const identityBindingCount = additions.flatMap((row) => row.facts).filter((fact) => fact.key === "exact_identity_binding").length;
  if (additions.length !== 16 || technicalFactCount !== 65 || identityBindingCount !== 4 || additions.reduce((sum, row) => sum + row.unknownCodes.length, 0) !== 96) issues.push("APPROVED_PAYLOAD_COUNT_MISMATCH");
  if (catalog.products.length !== base.products.length + 16 || base.products.some((row) => canonicalJson(catalog.products.find((item) => item.exactProductId === row.exactProductId)) !== canonicalJson(row))) issues.push("PREEXISTING_PRODUCT_CHANGED");
  if (base.categories.filter((row) => row.categoryId !== "HEADPHONES").some((row) => canonicalJson(catalog.categories.find((item) => item.categoryId === row.categoryId)) !== canonicalJson(row))) issues.push("UNRELATED_CATEGORY_CHANGED");
  if (additions.some((row) => row.personaEffect !== "NONE" || row.commerceEffect !== "NONE" || row.facts.some((fact) => /asin|price|affiliate|amazon|brand/i.test(fact.key)))) issues.push("FORBIDDEN_RANKING_OR_COMMERCE_EFFECT");
  return Object.freeze(issues);
}

export async function executeHeadphonesActivation(root: string, baseCatalogPath: string) {
  const packageDir = path.join(root, "data/production/electronics/governance/approval-manifests", HEADPHONES_OWNER_PACKAGE_ID);
  const approvalManifest = JSON.parse(await readFile(path.join(packageDir, "approval-manifest.json"), "utf8"));
  if (sha256Canonical(approvalManifest) !== APPROVAL_MANIFEST_CANONICAL_DIGEST || approvalManifest.ownerApprovalSentence !== HEADPHONES_OWNER_APPROVAL_SENTENCE) throw new Error("APPROVAL_PACKAGE_PRECONDITION_FAILED");
  const baseRaw = await readFile(baseCatalogPath);
  if (sha256Bytes(baseRaw) !== PRIOR_CATALOG_ARTIFACT_DIGEST) throw new Error("PRIOR_ACTIVE_CATALOG_CHANGED");
  const base = JSON.parse(baseRaw.toString("utf8")) as RuntimeCatalog;
  const input = await readHeadphonesPackageInputs(root);
  const { catalog, additions } = buildActivatedHeadphonesCatalog(base, input);
  const issues = validateActivatedHeadphonesCatalog(base, catalog, additions.map((row) => row.exactProductId));
  if (issues.length) throw new Error(`ACTIVATED_CATALOG_INVALID:${issues.join(",")}`);
  const releaseDir = path.join(root, "data/production/electronics/runtime/releases", HEADPHONES_ACTIVATED_RELEASE);
  const eventDir = path.join(root, "data/production/electronics/governance/activation-events", HEADPHONES_ACTIVATION_ID);
  const approvalDir = path.join(root, "data/production/electronics/governance/approval-events", `${HEADPHONES_OWNER_PACKAGE_ID}-APPROVAL-01`);
  const semanticBinding = { schemaVersion: "electronics-headphones-xpy-semantic-binding/v1", categoryId: "HEADPHONES", proposalDigest: sha256Canonical(input.semantics), runtimeVersion: "XPY_RUNTIME/v0.1", runtimeDigest: XPY_DIGEST, domainPackId: "electronics-stage1/v1", pBinding: { role: "QUESTION_INPUT", candidateQuestions: input.semantics.candidateQuestions }, yBinding: { role: "CANDIDATE_EVALUATION_INPUT", directRuntimeEffectBeforeActivation: "NONE", unknownAware: true, tiesAllowed: true, nonDominatedSetAllowed: true, rankingInputs: [] }, xBinding: { decisionAuthority: "NONE" } };
  const approvalPayload = { schemaVersion: "electronics-owner-approval-event/v1", eventId: `${HEADPHONES_OWNER_PACKAGE_ID}-APPROVAL-01`, packageId: HEADPHONES_OWNER_PACKAGE_ID, approvalManifestCanonicalDigest: APPROVAL_MANIFEST_CANONICAL_DIGEST, approvedBy: "PRODUCT_OWNER_USER_EXPLICIT", authorityBasis: "EXACT_USER_APPROVAL_WORDING", approvalText: HEADPHONES_OWNER_APPROVAL_SENTENCE, approvalTextSha256: approvalTextHash(), recordedAt: "2026-09-06T00:00:00.000Z", activationAuthorityGranted: "ONE_SCOPE_BOUND_ATOMIC_ACTIVATION" };
  const approvalEvent = { ...approvalPayload, eventDigest: sha256Canonical(approvalPayload) };
  const catalogBytes = canonicalJson(catalog);
  const semanticBytes = canonicalJson(semanticBinding);
  const manifestPayload = { schemaVersion: "electronics-runtime-catalog-manifest/v1", workUnitId: "WU-ELECTRONICS-HEADPHONES-ATOMIC-ACTIVATION-01", releaseVersion: HEADPHONES_ACTIVATED_RELEASE, releaseDigest: catalog.releaseDigest, catalogArtifactSha256: sha256Bytes(catalogBytes), policyDigest: POLICY_DIGEST, categoryCount: catalog.categories.length, productCount: catalog.products.length, factCount: catalog.products.reduce((sum, row) => sum + row.facts.length, 0), approvedTechnicalFactCount: 65, runtimeIdentityBindingFactCount: 4, explicitUnknownCount: additions.reduce((sum, row) => sum + row.unknownCodes.length, 0), approvedAdditionCount: 16, approvalEventDigest: approvalEvent.eventDigest, approvalManifestCanonicalDigest: APPROVAL_MANIFEST_CANONICAL_DIGEST, semanticBindingArtifactSha256: sha256Bytes(semanticBytes), activation: "ACTIVE_RUNTIME_REPOSITORY_ONLY", productionDeployed: false };
  const manifest = { ...manifestPayload, manifestPayloadDigest: sha256Canonical(manifestPayload) };
  const activationPayload = { schemaVersion: "electronics-headphones-activation-event/v1", eventId: HEADPHONES_ACTIVATION_ID, approvalEventDigest: approvalEvent.eventDigest, approvalManifestCanonicalDigest: APPROVAL_MANIFEST_CANONICAL_DIGEST, priorCatalogReleaseDigest: base.releaseDigest, catalogReleaseDigest: catalog.releaseDigest, policyDigest: POLICY_DIGEST, semanticBindingDigest: sha256Canonical(semanticBinding), addedExactProductIds: additions.map((row) => row.exactProductId), focusedGates: "PASS", atomicPointerSwap: true, productionMigrationApplied: false, deployed: false };
  const activationEvent = { ...activationPayload, eventDigest: sha256Canonical(activationPayload) };
  const manifestBytes = canonicalJson(manifest), activationBytes = canonicalJson(activationEvent), approvalBytes = canonicalJson(approvalEvent);
  const activePointer = { schemaVersion: "electronics-runtime-active-pointer/v1", lifecycle: "ACTIVE", runtimeActive: true, productionDeployed: false, catalogFile: path.relative(root, path.join(releaseDir, "catalog.json")), catalogArtifactSha256: sha256Bytes(catalogBytes), catalogReleaseDigest: catalog.releaseDigest, policyDigest: POLICY_DIGEST, manifestFile: path.relative(root, path.join(releaseDir, "manifest.json")), manifestSha256: sha256Bytes(manifestBytes), activationEventFile: path.relative(root, path.join(eventDir, "activation-event.json")), activationEventSha256: sha256Bytes(activationBytes), deploymentEventFile: "data/production/electronics/runtime/deployment-events/ELECTRONICS-PRODUCTION-DEPLOY-2IKZH2XL1YP8U1ZA/deployment.json", deploymentEventSha256: "sha256:183e757c591ea7fc3c34747909825ed33e3d890f67c4ec9817a4e54e3da5b332", deploymentContinuity: "PRIOR_DEPLOYMENT_REFERENCE_ONLY_NEW_RELEASE_NOT_DEPLOYED" };
  await mkdir(releaseDir, { recursive: true }); await mkdir(eventDir, { recursive: true }); await mkdir(approvalDir, { recursive: true });
  await writeFile(path.join(releaseDir, "catalog.json"), catalogBytes); await writeFile(path.join(releaseDir, "manifest.json"), manifestBytes); await writeFile(path.join(releaseDir, "headphones-semantic-binding.json"), semanticBytes); await writeFile(path.join(approvalDir, "approval-event.json"), approvalBytes); await writeFile(path.join(eventDir, "activation-event.json"), activationBytes);
  const postWrite = [sha256Bytes(await readFile(path.join(releaseDir, "catalog.json"))) === activePointer.catalogArtifactSha256, sha256Bytes(await readFile(path.join(releaseDir, "manifest.json"))) === activePointer.manifestSha256, sha256Bytes(await readFile(path.join(eventDir, "activation-event.json"))) === activePointer.activationEventSha256];
  if (postWrite.some((value) => !value)) throw new Error("STAGED_ARTIFACT_POST_WRITE_VALIDATION_FAILED");
  const pointerDir = path.join(root, "data/production/electronics/runtime"); await mkdir(pointerDir, { recursive: true });
  await writeFile(path.join(pointerDir, "active.json.next"), canonicalJson(activePointer));
  await rename(path.join(pointerDir, "active.json.next"), path.join(pointerDir, "active.json"));
  return { releaseVersion: HEADPHONES_ACTIVATED_RELEASE, releaseDigest: catalog.releaseDigest, catalogArtifactSha256: activePointer.catalogArtifactSha256, approvalEventDigest: approvalEvent.eventDigest, activationEventDigest: activationEvent.eventDigest, activePointerSha256: sha256Bytes(canonicalJson(activePointer)), addedProducts: additions.length };
}

export async function reconstructPriorCatalogFromActivated(root: string): Promise<RuntimeCatalog> {
  const catalog = JSON.parse(await readFile(path.join(root, "data/production/electronics/runtime/releases", HEADPHONES_ACTIVATED_RELEASE, "catalog.json"), "utf8")) as RuntimeCatalog;
  const approval = JSON.parse(await readFile(path.join(root, "data/production/electronics/governance/approval-manifests", HEADPHONES_OWNER_PACKAGE_ID, "approval-manifest.json"), "utf8")) as { membership: readonly { exactConfigurationKey: string }[] };
  const approvedKeys = new Set(approval.membership.map((row) => row.exactConfigurationKey));
  const products = catalog.products.filter((row) => ![...approvedKeys].some((key) => row.configurationIdentity.startsWith(`${key}|`)));
  const addedIds = new Set(catalog.products.filter((row) => !products.includes(row)).map((row) => row.exactProductId));
  const categories = catalog.categories.map((row) => row.categoryId === "HEADPHONES" ? { ...row, exactProductIds: row.exactProductIds.filter((id) => !addedIds.has(id)) } : row);
  const evidenceChain = catalog.evidenceChain.slice(0, -1);
  const unsigned = { ...catalog, releaseVersion: "ELECTRONICS-RUNTIME-CATALOG-TR-v1.0", evidenceChain, categories, products } as Record<string, unknown>;
  delete unsigned.releaseDigest;
  return { ...unsigned, releaseDigest: sha256Canonical(unsigned) } as RuntimeCatalog;
}
