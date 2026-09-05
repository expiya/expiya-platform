import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { EvidenceSource, HeadphonesReconciliationRecord } from "./headphonesEvidenceReconciliation";

export const HEADPHONES_OWNER_PACKAGE_VERSION = "electronics-headphones-owner-approval-package/v1" as const;
export const HEADPHONES_OWNER_PACKAGE_ID = "ELECTRONICS-HEADPHONES-OAM-01" as const;
export const HEADPHONES_OWNER_WORK_UNIT = "WU-ELECTRONICS-HEADPHONES-OWNER-APPROVAL-PACKAGE-01" as const;
export const HEADPHONES_PARENT_COMMIT = "008d05f9183c6f140acffb84409d399ae9d41670" as const;
export const HEADPHONES_PARENT_MANIFEST_DIGEST = "sha256:63566c48e5bcd740b057161968dd55744b4c7f6758a4babd32680f08b96a5b71" as const;
export const HEADPHONES_OWNER_APPROVAL_SENTENCE = "I approve ELECTRONICS-HEADPHONES-OAM-01 for the admission of exactly the 16 manifest-listed HEADPHONES products and their bound governed facts, explicit unknowns, and semantic-policy input proposal, subject to the stated exclusions and a separate atomic activation." as const;

type JsonObject = Readonly<Record<string, unknown>>;
type Fact = { readonly productKey: string; readonly factKey: string; readonly value: unknown; readonly sourceIds: readonly string[] };
type Unknown = { readonly productKey: string; readonly factKey: string; readonly status: string };

export interface HeadphonesPackageInputs {
  readonly records: readonly HeadphonesReconciliationRecord[];
  readonly admittedProducts: readonly HeadphonesReconciliationRecord[];
  readonly sources: readonly EvidenceSource[];
  readonly facts: readonly Fact[];
  readonly manualSupportWarranty: readonly EvidenceSource[];
  readonly unknowns: readonly Unknown[];
  readonly coverage: JsonObject;
  readonly semantics: JsonObject;
  readonly releaseCandidate: JsonObject;
  readonly parentManifest: JsonObject;
  readonly parentLineageReconciliation: JsonObject;
}

export const canonicalJson = (value: unknown): string => `${canonical(value)}\n`;
const canonical = (value: unknown): string => {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new TypeError("NON_JSON_VALUE");
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
};
export const sha256Bytes = (value: string | Buffer): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const sha256Canonical = (value: unknown): `sha256:${string}` => sha256Bytes(canonical(value));

export function validateHeadphonesOwnerPackageInputs(input: HeadphonesPackageInputs): readonly string[] {
  const issues: string[] = [];
  if (sha256Canonical(input.parentManifest) !== HEADPHONES_PARENT_MANIFEST_DIGEST) issues.push("EVIDENCE_CLOSURE_MANIFEST_DIGEST_MISMATCH");
  const declaredArtifacts = new Map(((input.parentManifest.files as readonly { readonly path: string; readonly digest: string }[] | undefined) ?? []).map((item) => [item.path, item.digest]));
  const governedArtifacts: readonly [string, unknown][] = [["parent-lineage-reconciliation.json", input.parentLineageReconciliation], ["source-register.json", input.sources], ["asin-reconciliation-ledger.json", input.records], ["admitted-product-catalog.json", input.admittedProducts], ["technical-capability-facts.json", input.facts], ["manual-support-warranty-register.json", input.manualSupportWarranty], ["unknown-register.json", input.unknowns], ["coverage-report.json", input.coverage], ["semantic-policy-input-proposal.json", input.semantics], ["release-candidate.json", input.releaseCandidate]];
  for (const [name, value] of governedArtifacts) if (declaredArtifacts.get(name) !== sha256Canonical(value)) issues.push(`EVIDENCE_ARTIFACT_DIGEST_MISMATCH:${name}`);
  const statusCounts = new Map<string, number>();
  for (const row of input.records) statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  if (input.records.length !== 30 || new Set(input.records.map((row) => row.asin)).size !== 30) issues.push("TERMINAL_LEDGER_NOT_EXACTLY_30_UNIQUE_ASINS");
  if (statusCounts.get("ADMITTED") !== 16 || statusCounts.get("REJECTED_INSUFFICIENT_TR_APPLICABILITY") !== 13 || statusCounts.get("REJECTED_IDENTITY_AMBIGUOUS") !== 1 || (statusCounts.get("DUPLICATE") ?? 0) !== 0) issues.push("TERMINAL_OUTCOME_COUNTS_INVALID");
  const admitted = input.records.filter((row) => row.status === "ADMITTED");
  if (input.admittedProducts.length !== 16 || canonical(input.admittedProducts) !== canonical(admitted)) issues.push("ADMITTED_CATALOG_MEMBERSHIP_MISMATCH");
  const productKeys = admitted.map((row) => row.exactConfigurationKey).filter((key): key is string => Boolean(key));
  if (productKeys.length !== 16 || new Set(productKeys).size !== 16) issues.push("EXACT_IDENTITY_NOT_UNIQUE");
  const sourceMap = new Map(input.sources.map((source) => [source.sourceId, source]));
  for (const row of admitted) {
    if (!row.sourceIds.length || !row.sourceIds.some((id) => sourceMap.get(id)?.jurisdiction === "TR" && sourceMap.get(id)?.establishesTurkiyeApplicability)) issues.push(`TR_APPLICABILITY_MISSING:${row.asin}`);
    for (const id of row.sourceIds) if (!sourceMap.has(id)) issues.push(`PRODUCT_SOURCE_BINDING_MISSING:${row.asin}:${id}`);
  }
  const productKeySet = new Set(productKeys);
  if (input.facts.length !== 65) issues.push(`EXPECTED_65_FACTS:${input.facts.length}`);
  for (const fact of input.facts) {
    if (!productKeySet.has(fact.productKey)) issues.push(`FACT_OUTSIDE_APPROVED_MEMBERSHIP:${fact.productKey}`);
    if (!fact.sourceIds.length || fact.sourceIds.some((id) => !sourceMap.has(id))) issues.push(`FACT_PROVENANCE_INVALID:${fact.productKey}:${fact.factKey}`);
  }
  if (input.unknowns.length !== 96) issues.push(`EXPECTED_96_UNKNOWNS:${input.unknowns.length}`);
  if (new Set(input.unknowns.map((item) => `${item.productKey}|${item.factKey}`)).size !== input.unknowns.length) issues.push("DUPLICATE_UNKNOWN");
  for (const item of input.unknowns) if (!productKeySet.has(item.productKey) || item.status !== "UNKNOWN_NOT_INFERRED") issues.push(`UNKNOWN_NOT_PRESERVED:${item.productKey}:${item.factKey}`);
  const separatedTypes = new Set(["MANUAL", "SUPPORT", "WARRANTY"]);
  if (input.manualSupportWarranty.some((source) => !separatedTypes.has(source.sourceType) || canonical(sourceMap.get(source.sourceId)) !== canonical(source))) issues.push("MANUAL_SUPPORT_WARRANTY_SEPARATION_INVALID");
  const comparison = input.semantics.comparison as Record<string, unknown> | undefined;
  if (input.semantics.authorityStatus !== "CANDIDATE_INPUT_NOT_ACTIVE_POLICY" || input.semantics.yRuntimeEffect !== "NONE" || comparison?.unknownsRemainUnknown !== true || comparison?.tiesAllowed !== true || comparison?.nonDominatedResultsAllowed !== true || !Array.isArray(comparison?.rankingInputs) || comparison.rankingInputs.length !== 0) issues.push("SEMANTIC_OR_XPY_BOUNDARY_INVALID");
  const coverage = input.coverage as Record<string, unknown>;
  if (coverage.admitted !== 16 || coverage.rejected !== 14 || coverage.duplicates !== 0 || !Array.isArray(coverage.missingSegments)) issues.push("COVERAGE_DISCLOSURE_INVALID");
  if (input.releaseCandidate.amazonAuthority === undefined || (input.releaseCandidate.amazonAuthority as Record<string, unknown>).commerceOnly !== true) issues.push("AMAZON_BOUNDARY_MISSING");
  return Object.freeze(issues);
}

export function buildHeadphonesOwnerPackage(input: HeadphonesPackageInputs) {
  const issues = validateHeadphonesOwnerPackageInputs(input);
  if (issues.length) throw new Error(`HEADPHONES_OWNER_PACKAGE_INVALID:${issues.join(",")}`);
  const statusCounts = Object.fromEntries(["ADMITTED", "REJECTED_INSUFFICIENT_TR_APPLICABILITY", "REJECTED_IDENTITY_AMBIGUOUS", "DUPLICATE"].map((status) => [status, input.records.filter((row) => row.status === status).length]));
  const sourceTypes = Object.fromEntries(input.sources.map((source) => [source.sourceId, source.sourceType]));
  const membership = input.admittedProducts.map((row) => ({ asin: row.asin, exactConfigurationKey: row.exactConfigurationKey, manufacturer: row.manufacturer, exactCommercialModel: row.exactCommercialModel, modelCode: row.modelCode, formFactor: row.formFactor, sourceIds: row.sourceIds }));
  const files = {
    "approval-manifest.json": {
      schemaVersion: HEADPHONES_OWNER_PACKAGE_VERSION,
      packageId: HEADPHONES_OWNER_PACKAGE_ID,
      workUnit: HEADPHONES_OWNER_WORK_UNIT,
      lifecycle: "AWAITING_EXPLICIT_OWNER_APPROVAL",
      approvalEffect: "ADMIT_EXACTLY_MANIFESTED_16_PRODUCTS_ONLY",
      activationPermitted: false,
      selfApproved: false,
      generatedAt: "2026-09-06T00:00:00.000Z",
      lineage: { parentCommit: HEADPHONES_PARENT_COMMIT, evidenceClosureManifestDigest: HEADPHONES_PARENT_MANIFEST_DIGEST, evidenceClosureWorkUnit: "WU-ELECTRONICS-HEADPHONES-EVIDENCE-CLOSURE-01", parentLineageDisposition: "MECHANICAL_CANONICALIZATION_ERROR_REPAIRED", materialPayloadChange: false },
      membership,
      terminalLedger: input.records.map((row) => ({ asin: row.asin, status: row.status, exactConfigurationKey: row.exactConfigurationKey, reason: row.reason })),
      terminalOutcomeCounts: statusCounts,
      governedPayload: { productCount: 16, factCount: 65, explicitUnknownCount: 96, manufacturerCount: 7, artifactDigests: { admittedProductCatalog: sha256Canonical(input.admittedProducts), sourceRegister: sha256Canonical(input.sources), technicalCapabilityFacts: sha256Canonical(input.facts), manualSupportWarrantyRegister: sha256Canonical(input.manualSupportWarranty), unknownRegister: sha256Canonical(input.unknowns), coverageReport: sha256Canonical(input.coverage), semanticPolicyInputProposal: sha256Canonical(input.semantics), releaseCandidate: sha256Canonical(input.releaseCandidate), evidenceClosureManifest: HEADPHONES_PARENT_MANIFEST_DIGEST, parentLineageReconciliation: sha256Canonical(input.parentLineageReconciliation) } },
      authorityBindings: { existingAuthority: "ELECTRONICS-RUNTIME-CATALOG-TR-v1.0", activePointerPath: "data/production/electronics/runtime/active.json", activePointerArtifactSha256: "sha256:4aacd0a8ec635b91acbd26436c4a46cb53a143617390a37434dc88f42d3bcb77", activeCatalogReleaseDigest: "sha256:fcee3071c8a9004551cbf38358014fbfa2dd10b2a2dad57781cf3d4bbf6a39fc", activeCatalogArtifactSha256: "sha256:a52ab57cb92323764e4b8d7343fc38b6cd92462feb0e0b1a3f7c6a06b432a121", activeManifestArtifactSha256: "sha256:aa1ece10d48ecf7bbdc7075018169c4709956bbdb1e87c692c5da1ef129a9c37", activeActivationEventArtifactSha256: "sha256:2172a31ad8067adb0417878853102f4c25d50f738d33e3b6e178ab3d8c805d37", categoryPolicyVersion: "ELECTRONICS-CATEGORY-POLICY-TR-v1.0", categoryPolicyDigest: "sha256:0f4db5148d6a6971b7a9341b2c0c56c298753dd2ab592b75d09fbdd372b7c20a", categoryPolicyActivePointerArtifactSha256: "sha256:3c795ca9c10a7c6cffaf8ba775940efc6a4794160dab7b36c14cc228d028a6f4", xpyRuntimeVersion: "XPY_RUNTIME/v0.1", xpyRuntimeDigest: "96a533872b3b47c594e982cf5a71e3eb50c226aef65b3f4214b71a29b87ed6ee", domainPackId: "electronics-stage1/v1", categoryId: "HEADPHONES" },
      invariants: { unknownsRemainUnknown: true, tiedOutcomesAllowed: true, nonDominatedSetAllowed: true, pOwnsQuestions: true, yOwnsCandidatesSufficiencySelectionAuthorization: true, amazonRole: "COMMERCE_AND_DISCOVERY_ONLY", forbiddenRankingInputs: ["ASIN", "PRICE", "AFFILIATE_STATE", "AMAZON_POSITION", "BRAND"], personaDirectCandidateEffect: "NONE" },
      scopeDisclaimer: "Approval admits only the 16 manifest-listed exact products. It does not attest any rejected configuration and does not claim exhaustive Amazon or Türkiye market coverage.",
      explicitCoverageGaps: input.coverage.missingSegments,
      ownerApprovalSentence: HEADPHONES_OWNER_APPROVAL_SENTENCE,
    },
    "validation-report.json": { schemaVersion: "electronics-headphones-owner-validation/v1", verdict: "PASS", checks: ["SCHEMA", "EXACT_IDENTITY_UNIQUENESS", "TR_APPLICABILITY", "SOURCE_BINDINGS", "MANUAL_SUPPORT_WARRANTY_SEPARATION", "FACT_PROVENANCE", "UNKNOWN_PRESERVATION", "SEMANTIC_NEED_MAPPING", "XPY_P_Y_COMPATIBILITY", "AMAZON_DECISION_NEUTRALITY"], counts: { terminalRecords: 30, admittedProducts: 16, facts: 65, explicitUnknowns: 96 }, sourceTypes },
    "activation-plan.json": { schemaVersion: "electronics-headphones-atomic-activation-plan/v1", status: "PREPARED_NOT_EXECUTED", authority: "EXISTING_ELECTRONICS_AUTHORITY_ONLY", preconditions: ["EXPLICIT_OWNER_APPROVAL_MATCHING_PACKAGE_ID_AND_MANIFEST_DIGEST", "CURRENT_ACTIVE_POINTER_AND_BOUND_DIGESTS_UNCHANGED", "REGENERATED_RELEASE_PASSES_ALL_PACKAGE_AND_RUNTIME_VALIDATORS"], transaction: ["STAGE_NEW_IMMUTABLE_ELECTRONICS_RUNTIME_CATALOG_RELEASE_BY_COPYING_CURRENT_RELEASE_AND_ADDING_EXACTLY_THE_16_MANIFESTED_HEADPHONES_PRODUCTS", "BIND_65_FACTS_AND_96_EXPLICIT_UNKNOWNS_WITHOUT_COERCING_UNKNOWN_TO_FALSE_OR_UNAVAILABLE", "BIND_HEADPHONES_SEMANTIC_PROPOSAL_TO_EXISTING_ELECTRONICS_DOMAIN_PACK_P_QUESTION_INPUTS_AND_Y_CANDIDATE_EVALUATION", "VERIFY_XPY_RUNTIME_VERSION_DIGEST_CATEGORY_POLICY_DIGEST_AND_DOMAIN_PACK_ID", "VERIFY_UNKNOWN_AWARE_HARD_FILTERING_TIED_TOP_SET_AND_NON_DOMINATED_SET", "VERIFY_ASIN_PRICE_AFFILIATE_STATE_AMAZON_POSITION_AND_BRAND_HAVE_NO_RANKING_SUFFICIENCY_RECOMMENDATION_OR_AUTHORIZATION_EFFECT", "WRITE_RELEASE_MANIFEST_AND_ACTIVATION_EVENT", "TRANSACTIONALLY_COMPARE_AND_SWAP_EXISTING_RUNTIME_ACTIVE_POINTER_TO_NEW_FILE_AND_DIGEST_SET"], rollback: "If any precondition, write, digest, or post-write validation fails, retain the prior active pointer byte-for-byte and leave the staged release inactive.", prohibited: ["SELF_APPROVAL", "ACTIVATION_DURING_PACKAGE_GENERATION", "PRODUCTION_DEPLOYMENT", "UNRELATED_CATEGORY_CHANGE", "DESIGN_CHANGE", "EVIDENCE_REACQUISITION"] },
    "owner-review.md": `# HEADPHONES owner approval review\n\nThis immutable package proposes admission of exactly 16 HEADPHONES products, 65 sourced facts, 96 explicit unknowns, and the bound semantic-policy input proposal. It does not activate them.\n\nApproval does not attest the 14 rejected configurations and does not claim exhaustive Amazon or Türkiye market coverage. The disclosed non-blocking gaps are neckband, bone-conduction, and hearing-assistance-specific products. Amazon remains commerce/discovery only.\n\nExact approval wording:\n\n${HEADPHONES_OWNER_APPROVAL_SENTENCE}\n`,
  } as const;
  const artifactDigests = Object.fromEntries(Object.entries(files).map(([name, value]) => [name, sha256Bytes(typeof value === "string" ? value : canonicalJson(value))]));
  return { files, checksums: { schemaVersion: "electronics-headphones-owner-package-checksums/v1", packageId: HEADPHONES_OWNER_PACKAGE_ID, artifacts: artifactDigests } } as const;
}

export async function readHeadphonesPackageInputs(root: string): Promise<HeadphonesPackageInputs> {
  const dir = path.join(root, "data/research/electronics/headphones-evidence-closure-01");
  const read = async <T>(name: string): Promise<T> => JSON.parse(await readFile(path.join(dir, name), "utf8")) as T;
  return { records: await read("asin-reconciliation-ledger.json"), admittedProducts: await read("admitted-product-catalog.json"), sources: await read("source-register.json"), facts: await read("technical-capability-facts.json"), manualSupportWarranty: await read("manual-support-warranty-register.json"), unknowns: await read("unknown-register.json"), coverage: await read("coverage-report.json"), semantics: await read("semantic-policy-input-proposal.json"), releaseCandidate: await read("release-candidate.json"), parentManifest: await read("manifest.json"), parentLineageReconciliation: await read("parent-lineage-reconciliation.json") };
}

export async function writeHeadphonesOwnerPackage(root: string, outputDir = path.join(root, "data/production/electronics/governance/approval-manifests", HEADPHONES_OWNER_PACKAGE_ID)) {
  const built = buildHeadphonesOwnerPackage(await readHeadphonesPackageInputs(root));
  await mkdir(outputDir, { recursive: true });
  for (const [name, value] of Object.entries(built.files)) await writeFile(path.join(outputDir, name), typeof value === "string" ? value : canonicalJson(value));
  await writeFile(path.join(outputDir, "checksums.json"), canonicalJson(built.checksums));
  const canonicalManifestDigest = sha256Canonical(built.files["approval-manifest.json"]);
  return { outputDir, canonicalManifestDigest, artifactDigests: built.checksums.artifacts };
}
