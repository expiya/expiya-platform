import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { immutableDigest } from "@/features/semantic-decision-projection/v2/canonical";
import type { CatalogFactoryReadinessV2Report } from "@/features/semantic-decision-projection/v2/catalogFactoryReadiness";

const EXPECTED = Object.freeze({
  releaseId: "CATALOG-FACTORY-WAVE03-EXACT3-105-REPAIRED-ACTIVE-01",
  releasePayloadDigest: "2b5d399da628930da66c0a6e7c78c8c62f2c52003f3b2198606fb928cff7bc0f",
  releaseFileDigest: "ba94cb38b62c344aa9d4d356755c7169895e0b1182fa884b857841bd08bb9b1b",
  pointerSha256: "ceade2bb6a0f4e8cec2f6c8a7b70a981a80f938dabd4d790ffedca45596aa6ad",
  previousPointerSha256: "494f01bd0221f9323a450b6105a10086f127e625aed52c96f07e30e6e6967108",
  receiptDigest: "494d542d8add55703a097fa03fcf3d19536e6dc600e54f5736d4c75658bd3851",
  priorReceiptDigest: "2ef6ad38bef474ad3e90538bf6c0330576ef7e8852cc9ca6f096533f893e3688",
  activationDigest: "96de52274f4a7ecc998205971e0d9ffb4830a644289758657a5ef03673719688",
  priorOverlayDigest: "1682884482f45d68969f0a6494ddf5ebe62fa95d1faf1ee588bba37636adb264",
  candidateDigest: "5d1754fd6b74cccf6e54eb28461fbdae40ca0a849c56918221c8769e9b937d20",
  approvalDigest: "efa82879dc869ff03e1f4718d7f471d36488b91d1731986a8be34b97a925e140",
});
const POINTER = "data/production/catalog-factory/active.json";
const PRIOR_OVERLAY = "data/production/catalog-factory/releases/CATALOG-FACTORY-NEXT-BATCH8-EXACT14-102-ACTIVE-01/catalog-overlay.json";
const RECEIPT = "data/production/catalog-factory/governance/activation-events/WU-CATALOG-FACTORY-WAVE03-EXACT3-REPAIRED-ATOMIC-ACTIVATION-01/receipt.json";
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
export interface EffectiveCatalogFactoryView { readonly releaseId: string; readonly totals: { readonly before: 80; readonly additions: 25; readonly active: 105 }; readonly products: readonly EffectiveCatalogProduct[]; readonly byCategory: ReadonlyMap<string, readonly EffectiveCatalogProduct[]>; readonly authority: Json; readonly semanticDecisionReadiness: CatalogFactoryReadinessV2Report; }

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
const stable = (value: unknown) => JSON.stringify(canonical(value));
const sha = (value: string | Buffer | unknown) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
const read = (root: string, file: string): { raw: Buffer; value: Json } => { const raw = readFileSync(path.join(root, file)); return { raw, value: JSON.parse(raw.toString("utf8")) }; };
const verifyDigest = (value: Json, field: string, expected?: string) => { const digest = value[field]; const core = { ...value }; delete core[field]; if (typeof digest !== "string" || sha(core) !== digest || (expected && digest !== expected)) throw new Error(`CATALOG_FACTORY_${field.toUpperCase()}_MISMATCH`); return digest; };
const semanticKey = (product: EffectiveCatalogProduct) => `${product.identity.brand}:${product.identity.market}:${product.identity.model}`.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "");

export function loadEffectiveCatalogFactoryView(root = process.cwd()): EffectiveCatalogFactoryView {
  const pointerFile = read(root, POINTER), pointer = pointerFile.value;
  if (sha(pointerFile.raw) !== EXPECTED.pointerSha256 || pointer.state !== "ACTIVE" || pointer.schemaVersion !== "catalog-factory-overlay-active-pointer/v0.4" || pointer.activeReleaseId !== EXPECTED.releaseId || pointer.previousPointerSha256 !== EXPECTED.previousPointerSha256 || pointer.releaseCandidatePayloadDigest !== EXPECTED.releasePayloadDigest || pointer.releaseCandidateFileDigest !== EXPECTED.releaseFileDigest || pointer.pReady || pointer.yReady) throw new Error("CATALOG_FACTORY_ACTIVE_POINTER_INVALID");
  const overlay = read(root, pointer.overlayFile).value, manifest = read(root, pointer.manifestFile).value, activation = read(root, pointer.activationEventFile).value;
  if (verifyDigest(overlay, "overlayDigest") !== pointer.overlayDigest || verifyDigest(manifest, "manifestDigest") !== pointer.manifestDigest || verifyDigest(activation, "activationDigest", EXPECTED.activationDigest) !== pointer.activationDigest) throw new Error("CATALOG_FACTORY_POINTER_DIGEST_CHAIN_MISMATCH");
  const releaseFile = read(root, `data/production/catalog-factory/releases/${EXPECTED.releaseId}/release-candidate.json`), release = releaseFile.value;
  if (sha(releaseFile.raw) !== EXPECTED.releaseFileDigest || verifyDigest(release, "payloadDigest", EXPECTED.releasePayloadDigest) !== pointer.releaseCandidatePayloadDigest || manifest.releaseCandidatePayloadDigest !== EXPECTED.releasePayloadDigest || manifest.releaseCandidateFileDigest !== EXPECTED.releaseFileDigest || activation.releasePayloadDigest !== EXPECTED.releasePayloadDigest || activation.releaseFileDigest !== EXPECTED.releaseFileDigest) throw new Error("CATALOG_FACTORY_RELEASE_CHAIN_INVALID");
  const receipt = read(root, RECEIPT).value;
  if (verifyDigest(receipt, "receiptDigest", EXPECTED.receiptDigest) !== EXPECTED.receiptDigest || receipt.status !== "SUCCESS" || receipt.oldPointerSha256 !== EXPECTED.previousPointerSha256 || receipt.newPointerSha256 !== EXPECTED.pointerSha256 || receipt.priorReceiptDigest !== EXPECTED.priorReceiptDigest || receipt.releasePayloadDigest !== EXPECTED.releasePayloadDigest || receipt.activationDigest !== EXPECTED.activationDigest) throw new Error("CATALOG_FACTORY_CAS_RECEIPT_INVALID");
  if (activation.preflightPayloadDigest !== "7baa2ee735a987f7dad934b67101cb3576f245926c0faa2f60942a880e01e582" || activation.preflightFileDigest !== "75e08ae6e2a89f09ede588fac532ee5bfaa98273b141e06510b133c53d13d4d6" || overlay.authority?.ownerApprovalDigest !== EXPECTED.approvalDigest || overlay.authority?.releasePayloadDigest !== EXPECTED.releasePayloadDigest || overlay.authority?.releaseFileDigest !== EXPECTED.releaseFileDigest) throw new Error("CATALOG_FACTORY_REPAIR_PREFLIGHT_CHAIN_INVALID");
  if (overlay.totals?.baseline !== 80 || overlay.totals?.priorActive !== 102 || overlay.totals?.additions !== 3 || overlay.totals?.active !== 105 || pointer.totals?.before !== 102 || pointer.totals?.additions !== 3 || pointer.totals?.active !== 105 || overlay.exclusions?.duplicate !== 0 || overlay.exclusions?.supersession !== 0 || overlay.exclusions?.silentDrop !== 0) throw new Error("CATALOG_FACTORY_MEMBERSHIP_PROOF_INVALID");
  const priorOverlay = read(root, PRIOR_OVERLAY).value;
  if (verifyDigest(priorOverlay, "overlayDigest", EXPECTED.priorOverlayDigest) !== overlay.authority?.priorOverlayDigest) throw new Error("CATALOG_FACTORY_PRIOR_AUTHORITY_INVALID");
  const priorById = new Map((priorOverlay.categories as Json[]).flatMap(category => (category.additions as Json[]).map(product => [product.exactProductId, { categoryId: category.categoryId, product }]))), wave03ById = new Map((release.products as Json[]).map(product => [product.exactProductId, product]));
  if (priorById.size !== 22 || wave03ById.size !== 3) throw new Error("CATALOG_FACTORY_RELEASE_MEMBERSHIP_INVALID");
  let priorSeen = 0, wave03Seen = 0;
  const products: EffectiveCatalogProduct[] = overlay.categories.flatMap((category: Json) => (category.additions as Json[]).map(addition => {
    const prior = priorById.get(addition.exactProductId) as Json | undefined, wave03 = wave03ById.get(addition.exactProductId) as Json | undefined;
    if (prior) { if (prior.categoryId !== category.categoryId || sha(prior.product) !== sha(addition)) throw new Error("CATALOG_FACTORY_PRIOR_PRODUCT_CHANGED"); priorSeen += 1; }
    else { if (!wave03 || wave03.categoryId !== category.categoryId || sha(wave03) !== sha(addition)) throw new Error("CATALOG_FACTORY_PRODUCT_BINDING_INVALID"); wave03Seen += 1; }
    const departmentId = String(addition.exactProductId).startsWith("appliances:") ? "APPLIANCES" : "ELECTRONICS";
    return Object.freeze({ ...addition, personaOrNeutral: addition.personaOrNeutral ?? addition.persona, departmentId, categoryId: category.categoryId, readiness: Object.freeze({ INFORMATION_READY: true, P_READY: false, Y_READY: false, reason: "NO_QUESTION_HAS_CANDIDATE_EFFECT_BY_ANSWER_WITH_TWO_KNOWN_PARTITIONS" }), decisionProjection: Object.freeze({ mode: "SHADOW_ONLY", X: "CATEGORY_LOCAL_CANDIDATE", P: Object.freeze({ questions: addition.dailyLife.questions, candidateEffectByAnswer: Object.freeze([]), knownPartitions: 0, suppression: "ALL_UNMATERIALIZED_QUESTIONS_SUPPRESSED", dailyLifeEffect: "EXPLANATION_ONLY_NOT_HARD_OR_SOFT" }), Y: "NOT_PARTICIPATING", unknownPolicy: "NEUTRAL", hiddenRankingSignals: Object.freeze([]) }) }) as unknown as EffectiveCatalogProduct;
  }));
  if (products.length !== 25 || priorSeen !== 22 || wave03Seen !== 3 || new Set(products.map(row => row.exactProductId)).size !== 25 || new Set(products.map(semanticKey)).size !== 25) throw new Error("CATALOG_FACTORY_DUPLICATE_OR_COUNT_INVALID");
  if (products.some(row => row.identity.market !== "TR" || row.technicalFacts.length === 0 || row.hardFilters.unknownPolicy !== "UNKNOWN_NEVER_FALSE_AND_NEVER_RANKING_SIGNAL" || row.personaOrNeutral.rankingEffect !== "NONE" || row.commerce.rankingAuthority !== "NONE")) throw new Error("CATALOG_FACTORY_DECISION_BOUNDARY_INVALID");
  const sdpManifest = read(root, `${SDP_ROOT}/manifest.json`).value, readiness = read(root, `${SDP_ROOT}/catalog-factory-readiness-v2.json`).value as CatalogFactoryReadinessV2Report;
  if (sdpManifest.releaseDigest !== SDP_RELEASE_DIGEST || sdpManifest.mode !== "SHADOW_ONLY" || sdpManifest.artifactDigests?.["catalog-factory-readiness-v2.json"] !== immutableDigest(readiness)) throw new Error("SEMANTIC_DECISION_PROJECTION_V2_AUTHORITY_MISMATCH");
  if (!readiness.levels.INFORMATION_READY.ready || readiness.levels.P_READY.ready || readiness.levels.Y_READY.ready || readiness.declarativeCapabilityRecordsObserved !== 16 || readiness.declarativeCapabilityRecordsAcceptedAsExecutableEvidence !== false) throw new Error("SEMANTIC_DECISION_READINESS_BOUNDARY_INVALID");
  const byCategory = new Map<string, readonly EffectiveCatalogProduct[]>(); for (const product of products) byCategory.set(product.categoryId, Object.freeze([...(byCategory.get(product.categoryId) ?? []), product]));
  return Object.freeze({ releaseId: EXPECTED.releaseId, totals: Object.freeze({ before: 80, additions: 25, active: 105 }), products: Object.freeze(products), byCategory, semanticDecisionReadiness: readiness, authority: Object.freeze({ releasePayloadDigest: EXPECTED.releasePayloadDigest, releaseFileDigest: EXPECTED.releaseFileDigest, pointerSha256: EXPECTED.pointerSha256, receiptDigest: EXPECTED.receiptDigest, priorReceiptDigest: EXPECTED.priorReceiptDigest, overlayDigest: pointer.overlayDigest, activationDigest: pointer.activationDigest, approvalDigest: EXPECTED.approvalDigest, candidateDigest: EXPECTED.candidateDigest, priorActive: 102, admittedWave03: 3, semanticDecisionProjectionCommit: SDP_COMMIT, semanticDecisionProjectionReleaseDigest: SDP_RELEASE_DIGEST }) });
}

export const loadEffectiveCatalogFactoryDepartment = (departmentId: "APPLIANCES" | "ELECTRONICS", root = process.cwd()) => Object.freeze(loadEffectiveCatalogFactoryView(root).products.filter(product => product.departmentId === departmentId));

export function projectExact14CategoryDecision(categoryId: string, hardRequirements: Readonly<Record<string, unknown>>, root = process.cwd()) {
  const shadowCandidates = loadEffectiveCatalogFactoryView(root).byCategory.get(categoryId) ?? [];
  return Object.freeze({ categoryId, status: "DECISION_NOT_READY" as const, reason: "P_AND_Y_MATERIALITY_NOT_PROVEN", hardRequirementsIgnoredForExact14: Object.freeze({ ...hardRequirements }), candidates: Object.freeze([]), shadowCandidates: Object.freeze(shadowCandidates), winner: null, rankingSignals: Object.freeze([]), unknownEffect: "NEUTRAL" as const, activeQuestionEffects: Object.freeze([]) });
}
