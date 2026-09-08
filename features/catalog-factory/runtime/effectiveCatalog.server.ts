import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { immutableDigest } from "@/features/semantic-decision-projection/v2/canonical";
import type { CatalogFactoryReadinessV2Report } from "@/features/semantic-decision-projection/v2/catalogFactoryReadiness";

const EXPECTED = Object.freeze({
  releaseId: "CATALOG-FACTORY-WAVE04-EXACT3-108-CANDIDATE-01",
  releaseDigest: "cb1eb28a6bcf8d2a63c66bcc72d277dc7e9b6f9417c1790bb2d774e82b1e902e",
  releaseFileDigest: "82738bbcc53991971a3f8475c30b63779b7e35f63d1014441e487de183c38d22",
  pointerSha256: "c6d1a1ee821891e34d3e7c2bb05d7fe63a4375d0a43da543a964404b7eed4589",
  previousPointerSha256: "ceade2bb6a0f4e8cec2f6c8a7b70a981a80f938dabd4d790ffedca45596aa6ad",
  receiptDigest: "1671ac5b5550d1f98cbcf63f2d5e9867582576a9ead2e222f4bb56659d18b51b",
  activationDigest: "4c018fa560457adfa01265e616f61aabb4528147e75250021b41ca07c895c27a",
  priorOverlayDigest: "a7481dd9c014f5dff4c513dfe9b3cdf3e1c332f84a46f58488d48fff846dd4a5",
  candidateDigest: "fc85a4d9a3814ed05a20805f3b6e9033cd0c0925d8d680407ff48e0983817126",
  approvalDigest: "c6a79d6a0677e1f43e6f7f01fef9193b6c6557b67d526a15ee652a466c552ae9",
});
const POINTER = "data/production/catalog-factory/active.json";
const PRIOR_OVERLAY = "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE03-EXACT3-105-REPAIRED-ACTIVE-01/catalog-overlay.json";
const RECEIPT = "data/production/catalog-factory/governance/activation-events/WU-CATALOG-FACTORY-WAVE04-EXACT3-ATOMIC-ACTIVATION-01/receipt.json";
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
export interface EffectiveCatalogFactoryView { readonly releaseId: string; readonly totals: { readonly before: 80; readonly additions: 28; readonly active: 108 }; readonly products: readonly EffectiveCatalogProduct[]; readonly byCategory: ReadonlyMap<string, readonly EffectiveCatalogProduct[]>; readonly authority: Json; readonly semanticDecisionReadiness: CatalogFactoryReadinessV2Report; }

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
const stable = (value: unknown) => JSON.stringify(canonical(value));
const sha = (value: string | Buffer | unknown) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
const read = (root: string, file: string): { raw: Buffer; value: Json } => { const raw = readFileSync(path.join(root, file)); return { raw, value: JSON.parse(raw.toString("utf8")) }; };
const verifyDigest = (value: Json, field: string, expected?: string) => { const digest = value[field]; const core = { ...value }; delete core[field]; if (typeof digest !== "string" || sha(core) !== digest || (expected && digest !== expected)) throw new Error(`CATALOG_FACTORY_${field.toUpperCase()}_MISMATCH`); return digest; };
const semanticKey = (product: EffectiveCatalogProduct) => `${product.identity.brand}:${product.identity.market}:${product.identity.model}`.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "");

export function loadEffectiveCatalogFactoryView(root = process.cwd()): EffectiveCatalogFactoryView {
  const pointerFile = read(root, POINTER), pointer = pointerFile.value;
  if (sha(pointerFile.raw) !== EXPECTED.pointerSha256 || pointer.state !== "ACTIVE" || pointer.schemaVersion !== "catalog-factory-overlay-active-pointer/v0.5" || pointer.activeReleaseId !== EXPECTED.releaseId || pointer.previousPointerSha256 !== EXPECTED.previousPointerSha256 || pointer.releaseDigest !== EXPECTED.releaseDigest || pointer.pReady || pointer.yReady) throw new Error("CATALOG_FACTORY_ACTIVE_POINTER_INVALID");
  const overlay = read(root, pointer.overlayFile).value, manifest = read(root, pointer.manifestFile).value, activation = read(root, pointer.activationEventFile).value;
  if (verifyDigest(overlay, "overlayDigest") !== pointer.overlayDigest || verifyDigest(manifest, "manifestDigest") !== pointer.manifestDigest || verifyDigest(activation, "activationDigest", EXPECTED.activationDigest) !== pointer.activationDigest) throw new Error("CATALOG_FACTORY_POINTER_DIGEST_CHAIN_MISMATCH");
  const releaseFile = read(root, `data/production/catalog-factory/releases/${EXPECTED.releaseId}/release-candidate.json`), release = releaseFile.value;
  if (sha(releaseFile.raw) !== EXPECTED.releaseFileDigest || verifyDigest(release, "releaseDigest", EXPECTED.releaseDigest) !== pointer.releaseDigest || manifest.releaseDigest !== EXPECTED.releaseDigest || activation.releaseDigest !== EXPECTED.releaseDigest) throw new Error("CATALOG_FACTORY_RELEASE_CHAIN_INVALID");
  const receipt = read(root, RECEIPT).value;
  if (verifyDigest(receipt, "receiptDigest", EXPECTED.receiptDigest) !== EXPECTED.receiptDigest || receipt.status !== "SUCCESS" || receipt.oldPointerSha256 !== EXPECTED.previousPointerSha256 || receipt.newPointerSha256 !== EXPECTED.pointerSha256 || receipt.releaseDigest !== EXPECTED.releaseDigest || receipt.activationDigest !== EXPECTED.activationDigest) throw new Error("CATALOG_FACTORY_CAS_RECEIPT_INVALID");
  if (activation.preflightDigest !== "66da9783019b736a45bc5150caf885f5bfe5f459f409522b2d88f5864b28263e" || overlay.authority?.ownerApprovalEventDigest !== EXPECTED.approvalDigest || overlay.authority?.releaseDigest !== EXPECTED.releaseDigest) throw new Error("CATALOG_FACTORY_WAVE04_PREFLIGHT_CHAIN_INVALID");
  if (overlay.totals?.baseline !== 80 || overlay.totals?.priorActive !== 105 || overlay.totals?.additions !== 28 || overlay.totals?.waveAdditions !== 3 || overlay.totals?.active !== 108 || pointer.totals?.before !== 105 || pointer.totals?.additions !== 3 || pointer.totals?.active !== 108 || overlay.exclusions?.duplicate !== 0 || overlay.exclusions?.supersession !== 0 || overlay.exclusions?.silentDrop !== 0) throw new Error("CATALOG_FACTORY_MEMBERSHIP_PROOF_INVALID");
  const priorOverlay = read(root, PRIOR_OVERLAY).value;
  if (verifyDigest(priorOverlay, "overlayDigest", EXPECTED.priorOverlayDigest) !== overlay.authority?.priorOverlayDigest) throw new Error("CATALOG_FACTORY_PRIOR_AUTHORITY_INVALID");
  const priorById = new Map((priorOverlay.categories as Json[]).flatMap(category => (category.additions as Json[]).map(product => [product.exactProductId, { categoryId: category.categoryId, product }]))), wave04ById = new Map((release.products as Json[]).map(product => [product.exactProductId, product]));
  if (priorById.size !== 25 || wave04ById.size !== 3) throw new Error("CATALOG_FACTORY_RELEASE_MEMBERSHIP_INVALID");
  let priorSeen = 0, wave04Seen = 0;
  const products: EffectiveCatalogProduct[] = overlay.categories.flatMap((category: Json) => (category.additions as Json[]).map(addition => {
    const prior = priorById.get(addition.exactProductId) as Json | undefined, wave04 = wave04ById.get(addition.exactProductId) as Json | undefined;
    if (prior) { if (prior.categoryId !== category.categoryId || sha(prior.product) !== sha(addition)) throw new Error("CATALOG_FACTORY_PRIOR_PRODUCT_CHANGED"); priorSeen += 1; }
    else { if (!wave04 || wave04.personaOrNeutral?.hierarchy?.[1] !== category.categoryId || sha(wave04) !== sha(addition)) throw new Error("CATALOG_FACTORY_PRODUCT_BINDING_INVALID"); wave04Seen += 1; }
    const departmentId = String(addition.exactProductId).startsWith("appliances:") ? "APPLIANCES" : "ELECTRONICS";
    return Object.freeze({ ...addition, personaOrNeutral: addition.personaOrNeutral ?? addition.persona, departmentId, categoryId: category.categoryId, readiness: Object.freeze({ INFORMATION_READY: true, P_READY: false, Y_READY: false, reason: "NO_QUESTION_HAS_CANDIDATE_EFFECT_BY_ANSWER_WITH_TWO_KNOWN_PARTITIONS" }), decisionProjection: Object.freeze({ mode: "SHADOW_ONLY", X: "CATEGORY_LOCAL_CANDIDATE", P: Object.freeze({ questions: addition.dailyLife.questions, candidateEffectByAnswer: Object.freeze([]), knownPartitions: 0, suppression: "ALL_UNMATERIALIZED_QUESTIONS_SUPPRESSED", dailyLifeEffect: "EXPLANATION_ONLY_NOT_HARD_OR_SOFT" }), Y: "NOT_PARTICIPATING", unknownPolicy: "NEUTRAL", hiddenRankingSignals: Object.freeze([]) }) }) as unknown as EffectiveCatalogProduct;
  }));
  if (products.length !== 28 || priorSeen !== 25 || wave04Seen !== 3 || new Set(products.map(row => row.exactProductId)).size !== 28 || new Set(products.map(semanticKey)).size !== 28) throw new Error("CATALOG_FACTORY_DUPLICATE_OR_COUNT_INVALID");
  if (products.some(row => row.identity.market !== "TR" || row.technicalFacts.length === 0 || row.hardFilters.unknownPolicy !== "UNKNOWN_NEVER_FALSE_AND_NEVER_RANKING_SIGNAL" || row.personaOrNeutral.rankingEffect !== "NONE" || row.commerce.rankingAuthority !== "NONE")) throw new Error("CATALOG_FACTORY_DECISION_BOUNDARY_INVALID");
  const sdpManifest = read(root, `${SDP_ROOT}/manifest.json`).value, readiness = read(root, `${SDP_ROOT}/catalog-factory-readiness-v2.json`).value as CatalogFactoryReadinessV2Report;
  if (sdpManifest.releaseDigest !== SDP_RELEASE_DIGEST || sdpManifest.mode !== "SHADOW_ONLY" || sdpManifest.artifactDigests?.["catalog-factory-readiness-v2.json"] !== immutableDigest(readiness)) throw new Error("SEMANTIC_DECISION_PROJECTION_V2_AUTHORITY_MISMATCH");
  if (!readiness.levels.INFORMATION_READY.ready || readiness.levels.P_READY.ready || readiness.levels.Y_READY.ready || readiness.declarativeCapabilityRecordsObserved !== 16 || readiness.declarativeCapabilityRecordsAcceptedAsExecutableEvidence !== false) throw new Error("SEMANTIC_DECISION_READINESS_BOUNDARY_INVALID");
  const byCategory = new Map<string, readonly EffectiveCatalogProduct[]>(); for (const product of products) byCategory.set(product.categoryId, Object.freeze([...(byCategory.get(product.categoryId) ?? []), product]));
  return Object.freeze({ releaseId: EXPECTED.releaseId, totals: Object.freeze({ before: 80, additions: 28, active: 108 }), products: Object.freeze(products), byCategory, semanticDecisionReadiness: readiness, authority: Object.freeze({ releaseDigest: EXPECTED.releaseDigest, releaseFileDigest: EXPECTED.releaseFileDigest, pointerSha256: EXPECTED.pointerSha256, receiptDigest: EXPECTED.receiptDigest, overlayDigest: pointer.overlayDigest, activationDigest: pointer.activationDigest, approvalDigest: EXPECTED.approvalDigest, candidateDigest: EXPECTED.candidateDigest, priorActive: 105, admittedWave04: 3, allCatalogAuthority: 813, semanticDecisionProjectionCommit: SDP_COMMIT, semanticDecisionProjectionReleaseDigest: SDP_RELEASE_DIGEST }) });
}

export const loadEffectiveCatalogFactoryDepartment = (departmentId: "APPLIANCES" | "ELECTRONICS", root = process.cwd()) => Object.freeze(loadEffectiveCatalogFactoryView(root).products.filter(product => product.departmentId === departmentId));

export function projectExact14CategoryDecision(categoryId: string, hardRequirements: Readonly<Record<string, unknown>>, root = process.cwd()) {
  const shadowCandidates = loadEffectiveCatalogFactoryView(root).byCategory.get(categoryId) ?? [];
  return Object.freeze({ categoryId, status: "DECISION_NOT_READY" as const, reason: "P_AND_Y_MATERIALITY_NOT_PROVEN", hardRequirementsIgnoredForExact14: Object.freeze({ ...hardRequirements }), candidates: Object.freeze([]), shadowCandidates: Object.freeze(shadowCandidates), winner: null, rankingSignals: Object.freeze([]), unknownEffect: "NEUTRAL" as const, activeQuestionEffects: Object.freeze([]) });
}
