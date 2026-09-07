import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { immutableDigest } from "@/features/semantic-decision-projection/v2/canonical";
import type { CatalogFactoryReadinessV2Report } from "@/features/semantic-decision-projection/v2/catalogFactoryReadiness";

const EXPECTED = Object.freeze({
  releaseId: "CATALOG-FACTORY-NEXT-BATCH8-EXACT14-102-ACTIVE-01",
  releaseDigest: "ad3235e5aef250af4fb97aefcfd339eaee47cc5506121e9dd0975e0a6d796cf4",
  pointerSha256: "494f01bd0221f9323a450b6105a10086f127e625aed52c96f07e30e6e6967108",
  previousPointerSha256: "bb2808bee4bc40743e97fb0966d8c6aa5a4462cdc235945398e5f726facf9236",
  receiptDigest: "2ef6ad38bef474ad3e90538bf6c0330576ef7e8852cc9ca6f096533f893e3688",
  activationDigest: "4d6e342d4d22b07d955e69b3b62de22d8dc509b0a6d2df52e5116a6eb3a9f917",
  candidateDigest: "7cddb45db187daf1bc6dbccf8f108b9e649e61307aa84bde89adb2809831902b",
  packageDigest: "4beb06df60856bc4a88ebcd284c2e0c361bcbb10d3467b0f7451c6a2fa4b2694",
  approvalDigest: "cb3c7aa6c5b82f26065611caccf1d51bd404d56f0cf8e13fc1bc2c7e9ca90a2e",
});
const POINTER = "data/production/catalog-factory/active.json";
const PRIOR_PACKAGE = "outputs/catalog-factory-wave-02-14-exact-identity-supersession-owner-review-01/OWNER_REVIEW_PACKAGE.json";
const PACKAGE = "outputs/catalog-factory-wave-02-next-batch-8-exact14-owner-review-01/OWNER_REVIEW_PACKAGE.json";
const APPROVAL = "outputs/catalog-factory-wave-02-next-batch-8-exact14-owner-review-01/governance/approval-events/CATALOG-FACTORY-NEXT-BATCH8-EXACT14-OWNER-APPROVAL-01/owner-approval-event.json";
const RECEIPT = "data/production/catalog-factory/governance/activation-events/WU-CATALOG-FACTORY-NEXT-BATCH8-EXACT14-ATOMIC-ACTIVATION-01/receipt.json";
const SDP_ROOT = "data/research/xpy-semantic-decision-projection-v2-foundation-01";
const SDP_COMMIT = "c29c356e2b15c37bd679f30a8ebd3018f744e4f0";
const SDP_RELEASE_DIGEST = "sha256:d3836e0ec7cfdd58cc3294d723feb36308ffde8626e10016902d9917cfbf6433";

// Governed JSON is validated field-by-field at the trust boundary below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
export interface EffectiveCatalogProduct {
  readonly exactProductId: string; readonly departmentId: "APPLIANCES" | "ELECTRONICS"; readonly categoryId: string;
  readonly identity: { readonly brand: string; readonly family: string; readonly model: string; readonly sku: string; readonly market: "TR"; readonly exactVariant: string };
  readonly technicalFacts: readonly Json[]; readonly explicitUnknown: readonly string[]; readonly hardFilters: Json; readonly dailyLife: Json;
  readonly personaOrNeutral: Json; readonly commerce: Json; readonly secretary: Json; readonly presentation: Json;
  readonly readiness: { readonly INFORMATION_READY: true; readonly P_READY: false; readonly Y_READY: false; readonly reason: string };
  readonly decisionProjection: { readonly mode: "SHADOW_ONLY"; readonly X: "CATEGORY_LOCAL_CANDIDATE"; readonly P: Json; readonly Y: "NOT_PARTICIPATING"; readonly unknownPolicy: "NEUTRAL"; readonly hiddenRankingSignals: readonly [] };
}
export interface EffectiveCatalogFactoryView { readonly releaseId: string; readonly totals: { readonly before: 80; readonly additions: 22; readonly active: 102 }; readonly products: readonly EffectiveCatalogProduct[]; readonly byCategory: ReadonlyMap<string, readonly EffectiveCatalogProduct[]>; readonly authority: Json; readonly semanticDecisionReadiness: CatalogFactoryReadinessV2Report; }

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
const stable = (value: unknown) => JSON.stringify(canonical(value));
const sha = (value: string | Buffer | unknown) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
const read = (root: string, file: string): { raw: Buffer; value: Json } => { const raw = readFileSync(path.join(root, file)); return { raw, value: JSON.parse(raw.toString("utf8")) }; };
const verifyDigest = (value: Json, field: string, expected?: string) => { const digest = value[field]; const core = { ...value }; delete core[field]; if (typeof digest !== "string" || sha(core) !== digest || (expected && digest !== expected)) throw new Error(`CATALOG_FACTORY_${field.toUpperCase()}_MISMATCH`); return digest; };
const semanticKey = (product: EffectiveCatalogProduct) => `${product.identity.brand}:${product.identity.market}:${product.identity.model}`.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "");
const reviewProducts = (review: Json) => (review.categories as Json[]).flatMap(category => ((category.products ?? category.proposedAdditions) as Json[]).map(product => ({ categoryId: category.categoryId, product })));

export function loadEffectiveCatalogFactoryView(root = process.cwd()): EffectiveCatalogFactoryView {
  const pointerFile = read(root, POINTER), pointer = pointerFile.value;
  if (sha(pointerFile.raw) !== EXPECTED.pointerSha256 || pointer.state !== "ACTIVE" || pointer.schemaVersion !== "catalog-factory-overlay-active-pointer/v0.3" || pointer.activeReleaseId !== EXPECTED.releaseId || pointer.previousPointerSha256 !== EXPECTED.previousPointerSha256 || pointer.releaseCandidateDigest !== EXPECTED.releaseDigest || pointer.pReady || pointer.yReady) throw new Error("CATALOG_FACTORY_ACTIVE_POINTER_INVALID");
  const overlay = read(root, pointer.overlayFile).value, manifest = read(root, pointer.manifestFile).value, activation = read(root, pointer.activationEventFile).value;
  if (verifyDigest(overlay, "overlayDigest") !== pointer.overlayDigest || verifyDigest(manifest, "manifestDigest") !== pointer.manifestDigest || verifyDigest(activation, "activationDigest", EXPECTED.activationDigest) !== pointer.activationDigest) throw new Error("CATALOG_FACTORY_POINTER_DIGEST_CHAIN_MISMATCH");
  const release = read(root, `data/production/catalog-factory/releases/${EXPECTED.releaseId}/release-candidate.json`).value;
  if (verifyDigest(release, "releaseDigest", EXPECTED.releaseDigest) !== pointer.releaseCandidateDigest || manifest.releaseCandidateDigest !== EXPECTED.releaseDigest || activation.releaseDigest !== EXPECTED.releaseDigest) throw new Error("CATALOG_FACTORY_RELEASE_CHAIN_INVALID");
  const receipt = read(root, RECEIPT).value;
  if (verifyDigest(receipt, "receiptDigest", EXPECTED.receiptDigest) !== EXPECTED.receiptDigest || receipt.status !== "SUCCESS" || receipt.oldPointerSha256 !== EXPECTED.previousPointerSha256 || receipt.newPointerSha256 !== EXPECTED.pointerSha256 || receipt.releaseDigest !== EXPECTED.releaseDigest || receipt.activationDigest !== EXPECTED.activationDigest) throw new Error("CATALOG_FACTORY_CAS_RECEIPT_INVALID");
  const approval = read(root, APPROVAL).value, review = read(root, PACKAGE).value, priorReview = read(root, PRIOR_PACKAGE).value;
  verifyDigest(approval, "eventDigest", EXPECTED.approvalDigest);
  const packageCore = { ...review }; delete packageCore.packageDigest;
  const candidateCore = { ...packageCore }; delete candidateCore.candidateDigest; delete candidateCore.approvalEligibility; delete candidateCore.ownerApprovalSentence; delete candidateCore.ownerApprovalSentenceDigest;
  if (review.packageDigest !== EXPECTED.packageDigest || sha(packageCore) !== EXPECTED.packageDigest || review.candidateDigest !== EXPECTED.candidateDigest || sha(candidateCore) !== EXPECTED.candidateDigest || approval.candidateDigest !== EXPECTED.candidateDigest || approval.packageDigest !== EXPECTED.packageDigest || approval.approvedScope?.exactAdditions !== 8) throw new Error("CATALOG_FACTORY_APPROVAL_CHAIN_INVALID");
  if (overlay.totals?.baseline !== 80 || overlay.totals?.priorActive !== 94 || overlay.totals?.additions !== 8 || overlay.totals?.active !== 102 || pointer.totals?.before !== 94 || pointer.totals?.additions !== 8 || pointer.totals?.active !== 102 || overlay.exclusions?.conflicted !== 8 || overlay.exclusions?.unknown !== 27 || overlay.exclusions?.silentDrop !== 0) throw new Error("CATALOG_FACTORY_MEMBERSHIP_PROOF_INVALID");
  const priorIds = new Set(reviewProducts(priorReview).map(row => row.product.exactProductId));
  const nextRows = reviewProducts(review), nextById = new Map(nextRows.map(row => [row.product.exactProductId, row]));
  const releaseIds = new Set((release.products as Json[]).map(product => product.exactProductId));
  if (priorIds.size !== 14 || nextById.size !== 8 || releaseIds.size !== 8 || [...nextById.keys()].some(id => !releaseIds.has(id))) throw new Error("CATALOG_FACTORY_RELEASE_MEMBERSHIP_INVALID");
  let priorSeen = 0, nextSeen = 0;
  const products: EffectiveCatalogProduct[] = overlay.categories.flatMap((category: Json) => (category.additions as Json[]).map(addition => {
    if (priorIds.has(addition.exactProductId)) priorSeen += 1;
    else { const next = nextById.get(addition.exactProductId); if (!next || next.categoryId !== category.categoryId || sha(next.product) !== sha(addition)) throw new Error("CATALOG_FACTORY_PRODUCT_BINDING_INVALID"); nextSeen += 1; }
    const departmentId = String(addition.exactProductId).startsWith("appliances:") ? "APPLIANCES" : "ELECTRONICS";
    return Object.freeze({ ...addition, personaOrNeutral: addition.personaOrNeutral ?? addition.persona, departmentId, categoryId: category.categoryId, readiness: Object.freeze({ INFORMATION_READY: true, P_READY: false, Y_READY: false, reason: "NO_QUESTION_HAS_CANDIDATE_EFFECT_BY_ANSWER_WITH_TWO_KNOWN_PARTITIONS" }), decisionProjection: Object.freeze({ mode: "SHADOW_ONLY", X: "CATEGORY_LOCAL_CANDIDATE", P: Object.freeze({ questions: addition.dailyLife.questions, candidateEffectByAnswer: Object.freeze([]), knownPartitions: 0, suppression: "ALL_UNMATERIALIZED_QUESTIONS_SUPPRESSED", dailyLifeEffect: "EXPLANATION_ONLY_NOT_HARD_OR_SOFT" }), Y: "NOT_PARTICIPATING", unknownPolicy: "NEUTRAL", hiddenRankingSignals: Object.freeze([]) }) }) as unknown as EffectiveCatalogProduct;
  }));
  if (products.length !== 22 || priorSeen !== 14 || nextSeen !== 8 || new Set(products.map(row => row.exactProductId)).size !== 22 || new Set(products.map(semanticKey)).size !== 22) throw new Error("CATALOG_FACTORY_DUPLICATE_OR_COUNT_INVALID");
  if (products.some(row => row.identity.market !== "TR" || row.technicalFacts.length === 0 || row.hardFilters.unknownPolicy !== "UNKNOWN_NEVER_FALSE_AND_NEVER_RANKING_SIGNAL" || row.personaOrNeutral.rankingEffect !== "NONE" || row.commerce.rankingAuthority !== "NONE")) throw new Error("CATALOG_FACTORY_DECISION_BOUNDARY_INVALID");
  const sdpManifest = read(root, `${SDP_ROOT}/manifest.json`).value, readiness = read(root, `${SDP_ROOT}/catalog-factory-readiness-v2.json`).value as CatalogFactoryReadinessV2Report;
  if (sdpManifest.releaseDigest !== SDP_RELEASE_DIGEST || sdpManifest.mode !== "SHADOW_ONLY" || sdpManifest.artifactDigests?.["catalog-factory-readiness-v2.json"] !== immutableDigest(readiness)) throw new Error("SEMANTIC_DECISION_PROJECTION_V2_AUTHORITY_MISMATCH");
  if (!readiness.levels.INFORMATION_READY.ready || readiness.levels.P_READY.ready || readiness.levels.Y_READY.ready || readiness.declarativeCapabilityRecordsObserved !== 16 || readiness.declarativeCapabilityRecordsAcceptedAsExecutableEvidence !== false) throw new Error("SEMANTIC_DECISION_READINESS_BOUNDARY_INVALID");
  const byCategory = new Map<string, readonly EffectiveCatalogProduct[]>(); for (const product of products) byCategory.set(product.categoryId, Object.freeze([...(byCategory.get(product.categoryId) ?? []), product]));
  return Object.freeze({ releaseId: EXPECTED.releaseId, totals: Object.freeze({ before: 80, additions: 22, active: 102 }), products: Object.freeze(products), byCategory, semanticDecisionReadiness: readiness, authority: Object.freeze({ releaseDigest: EXPECTED.releaseDigest, pointerSha256: EXPECTED.pointerSha256, receiptDigest: EXPECTED.receiptDigest, overlayDigest: pointer.overlayDigest, activationDigest: pointer.activationDigest, approvalDigest: EXPECTED.approvalDigest, packageDigest: EXPECTED.packageDigest, candidateDigest: EXPECTED.candidateDigest, priorActive: 94, admittedNextBatch: 8, semanticDecisionProjectionCommit: SDP_COMMIT, semanticDecisionProjectionReleaseDigest: SDP_RELEASE_DIGEST }) });
}

export const loadEffectiveCatalogFactoryDepartment = (departmentId: "APPLIANCES" | "ELECTRONICS", root = process.cwd()) => Object.freeze(loadEffectiveCatalogFactoryView(root).products.filter(product => product.departmentId === departmentId));

export function projectExact14CategoryDecision(categoryId: string, hardRequirements: Readonly<Record<string, unknown>>, root = process.cwd()) {
  const shadowCandidates = loadEffectiveCatalogFactoryView(root).byCategory.get(categoryId) ?? [];
  return Object.freeze({ categoryId, status: "DECISION_NOT_READY" as const, reason: "P_AND_Y_MATERIALITY_NOT_PROVEN", hardRequirementsIgnoredForExact14: Object.freeze({ ...hardRequirements }), candidates: Object.freeze([]), shadowCandidates: Object.freeze(shadowCandidates), winner: null, rankingSignals: Object.freeze([]), unknownEffect: "NEUTRAL" as const, activeQuestionEffects: Object.freeze([]) });
}
