import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const EXPECTED = Object.freeze({
  releaseId: "CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01",
  releaseDigest: "06f7782250e6bd3f675be640a831180dfdab0612a30f82e88e26229be744458e",
  candidateDigest: "7f5ee7b49e029ee80b6a7b2bfae008dfb41b8c1f78f4aaadf77f0c5bffed04d8",
  packageDigest: "79e74a7b64b61ffd4a9a05bb6392743b2e81b103a668388142ac08751ffbe860",
  approvalDigest: "a5e8ae761c97ed2895df68c17310a64f74071e51b96b5341241024155d96a925",
  previousPointerSha256: "f8d7aad75c5eb0610e6a782ffa0a70b67a55e2ec08d12fe71972bb3d738a799a",
});
const POINTER = "data/production/catalog-factory/active.json";
const PACKAGE = "outputs/catalog-factory-wave-02-14-exact-identity-supersession-owner-review-01/OWNER_REVIEW_PACKAGE.json";
const APPROVAL = "outputs/catalog-factory-wave-02-14-exact-identity-supersession-owner-review-01/governance/approval-events/CATALOG-FACTORY-EXACT14-SUPERSESSION-OWNER-APPROVAL-01/owner-approval-event.json";

// Governed JSON is validated field-by-field at the trust boundary below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
export interface EffectiveCatalogProduct {
  readonly exactProductId: string; readonly departmentId: "APPLIANCES" | "ELECTRONICS"; readonly categoryId: string;
  readonly identity: { readonly brand: string; readonly family: string; readonly model: string; readonly sku: string; readonly market: "TR"; readonly exactVariant: string };
  readonly technicalFacts: readonly Json[]; readonly explicitUnknown: readonly string[]; readonly hardFilters: Json; readonly dailyLife: Json;
  readonly personaOrNeutral: Json; readonly commerce: Json; readonly secretary: Json; readonly presentation: Json;
  readonly decisionProjection: { readonly X: "CATEGORY_LOCAL_CANDIDATE"; readonly P: Json; readonly Y: "EXACT_L8_NON_DOMINATED"; readonly unknownPolicy: "NEUTRAL"; readonly hiddenRankingSignals: readonly [] };
}
export interface EffectiveCatalogFactoryView { readonly releaseId: string; readonly totals: { readonly before: 80; readonly additions: 14; readonly active: 94 }; readonly products: readonly EffectiveCatalogProduct[]; readonly byCategory: ReadonlyMap<string, readonly EffectiveCatalogProduct[]>; readonly authority: Json; }

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
const stable = (value: unknown) => JSON.stringify(canonical(value));
const sha = (value: string | Buffer | unknown) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
const read = (root: string, file: string): { raw: Buffer; value: Json } => { const raw = readFileSync(path.join(root, file)); return { raw, value: JSON.parse(raw.toString("utf8")) }; };
const verifyDigest = (value: Json, field: string, expected?: string) => { const digest = value[field]; const core = { ...value }; delete core[field]; if (typeof digest !== "string" || sha(core) !== digest || (expected && digest !== expected)) throw new Error(`CATALOG_FACTORY_${field.toUpperCase()}_MISMATCH`); return digest; };
const semanticKey = (product: EffectiveCatalogProduct) => `${product.identity.brand}:${product.identity.market}:${product.identity.model}`.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "");

export function loadEffectiveCatalogFactoryView(root = process.cwd()): EffectiveCatalogFactoryView {
  const pointer = read(root, POINTER).value;
  if (pointer.state !== "ACTIVE" || pointer.schemaVersion !== "catalog-factory-overlay-active-pointer/v0.2" || pointer.activeReleaseId !== EXPECTED.releaseId || pointer.previousPointerSha256 !== EXPECTED.previousPointerSha256 || pointer.oldExact15RuntimeAuthority !== "PROHIBITED_SUPERSEDED") throw new Error("CATALOG_FACTORY_ACTIVE_POINTER_INVALID");
  for (const forbidden of ["CATALOG-FACTORY-WAVE-02-EXACT-15-ACTIVE-01", "8961121fdb13872fe2d153dc9db35aa600c72ab11771d79f25e64d9b8924a643"]) if (stable(pointer).includes(forbidden)) throw new Error("CATALOG_FACTORY_SUPERSEDED_AUTHORITY_SELECTED");
  const overlay = read(root, pointer.overlayFile).value, manifest = read(root, pointer.manifestFile).value, activation = read(root, pointer.activationEventFile).value, supersession = read(root, pointer.supersessionEventFile).value;
  if (verifyDigest(overlay, "overlayDigest") !== pointer.overlayDigest || verifyDigest(manifest, "manifestDigest") !== pointer.manifestDigest || verifyDigest(activation, "activationDigest") !== pointer.activationDigest || verifyDigest(supersession, "supersessionDigest") !== pointer.supersessionDigest) throw new Error("CATALOG_FACTORY_POINTER_DIGEST_CHAIN_MISMATCH");
  if (manifest.releaseCandidateDigest !== EXPECTED.releaseDigest || activation.releaseDigest !== EXPECTED.releaseDigest || supersession.replacement?.releaseDigest !== EXPECTED.releaseDigest || supersession.previous?.authorityDisposition !== "PROHIBITED_SUPERSEDED") throw new Error("CATALOG_FACTORY_SUPERSESSION_CHAIN_INVALID");
  const release = read(root, `data/production/catalog-factory/releases/${EXPECTED.releaseId}/release-candidate.json`).value;
  if (verifyDigest(release, "releaseDigest", EXPECTED.releaseDigest) !== EXPECTED.releaseDigest || release.candidateDigest !== EXPECTED.candidateDigest || release.packageDigest !== EXPECTED.packageDigest) throw new Error("CATALOG_FACTORY_RELEASE_CHAIN_INVALID");
  const approval = read(root, APPROVAL).value, review = read(root, PACKAGE).value;
  verifyDigest(approval, "eventDigest", EXPECTED.approvalDigest);
  const packageDigest = review.packageDigest, packageCore = { ...review }; delete packageCore.packageDigest; delete packageCore.ownerApprovalSentence; delete packageCore.ownerApprovalSentenceDigest;
  const candidateDigest = packageCore.candidateDigest, candidateCore = { ...packageCore }; delete candidateCore.candidateDigest; delete candidateCore.approvalEligibility; delete candidateCore.supersessionEvent; delete candidateCore.activationPlan;
  if (packageDigest !== EXPECTED.packageDigest || sha(packageCore) !== EXPECTED.packageDigest || candidateDigest !== EXPECTED.candidateDigest || sha(candidateCore) !== EXPECTED.candidateDigest) throw new Error("CATALOG_FACTORY_PACKAGE_DIGEST_MISMATCH");
  if (approval.candidateDigest !== EXPECTED.candidateDigest || approval.packageDigest !== EXPECTED.packageDigest || review.candidateDigest !== EXPECTED.candidateDigest || approval.approvedScope?.semanticExactAdditions !== 14) throw new Error("CATALOG_FACTORY_APPROVAL_CHAIN_INVALID");
  if (overlay.totals?.before !== 80 || overlay.totals?.additions !== 14 || overlay.totals?.active !== 94 || pointer.totals?.active !== 94 || overlay.duplicateTerminal?.membershipEffect !== 0 || overlay.duplicateTerminal?.canonicalExistingExactProductId !== "LG_GC_B569NLLM_TR") throw new Error("CATALOG_FACTORY_MEMBERSHIP_PROOF_INVALID");
  const bindings = new Map((release.productBindings as Json[]).map(row => [row.exactProductId, row]));
  const products: EffectiveCatalogProduct[] = overlay.categories.flatMap((category: Json) => (category.additions as Json[]).map(addition => {
    const binding = bindings.get(addition.exactProductId); if (!binding || binding.categoryId !== category.categoryId || binding.candidateProductDigest !== sha(addition)) throw new Error("CATALOG_FACTORY_PRODUCT_BINDING_INVALID");
    const departmentId = String(addition.exactProductId).startsWith("appliances:") ? "APPLIANCES" : "ELECTRONICS";
    return Object.freeze({ ...addition, departmentId, categoryId: category.categoryId, decisionProjection: Object.freeze({ X: "CATEGORY_LOCAL_CANDIDATE", P: Object.freeze({ questions: addition.dailyLife.questions, hardFilters: addition.hardFilters.required, materialDiscriminators: addition.hardFilters.materialDiscriminators }), Y: "EXACT_L8_NON_DOMINATED", unknownPolicy: "NEUTRAL", hiddenRankingSignals: Object.freeze([]) }) }) as unknown as EffectiveCatalogProduct;
  }));
  if (products.length !== 14 || new Set(products.map(row => row.exactProductId)).size !== 14 || new Set(products.map(semanticKey)).size !== 14) throw new Error("CATALOG_FACTORY_DUPLICATE_OR_COUNT_INVALID");
  if (products.some(row => row.identity.market !== "TR" || row.technicalFacts.length === 0 || row.hardFilters.unknownPolicy !== "UNKNOWN_NEVER_FALSE_AND_NEVER_RANKING_SIGNAL" || row.personaOrNeutral.rankingEffect !== "NONE" || row.commerce.rankingAuthority !== "NONE")) throw new Error("CATALOG_FACTORY_DECISION_BOUNDARY_INVALID");
  const byCategory = new Map<string, readonly EffectiveCatalogProduct[]>(); for (const product of products) byCategory.set(product.categoryId, Object.freeze([...(byCategory.get(product.categoryId) ?? []), product]));
  return Object.freeze({ releaseId: EXPECTED.releaseId, totals: Object.freeze({ before: 80, additions: 14, active: 94 }), products: Object.freeze(products), byCategory, authority: Object.freeze({ releaseDigest: EXPECTED.releaseDigest, overlayDigest: pointer.overlayDigest, activationDigest: pointer.activationDigest, supersessionDigest: pointer.supersessionDigest, approvalDigest: EXPECTED.approvalDigest, packageDigest: EXPECTED.packageDigest, candidateDigest: EXPECTED.candidateDigest }) });
}

export const loadEffectiveCatalogFactoryDepartment = (departmentId: "APPLIANCES" | "ELECTRONICS", root = process.cwd()) => Object.freeze(loadEffectiveCatalogFactoryView(root).products.filter(product => product.departmentId === departmentId));

export function projectExact14CategoryDecision(categoryId: string, hardRequirements: Readonly<Record<string, unknown>>, root = process.cwd()) {
  const candidates = loadEffectiveCatalogFactoryView(root).byCategory.get(categoryId) ?? [];
  const eligible = candidates.filter(product => Object.entries(hardRequirements).every(([key, expected]) => {
    const fact = product.technicalFacts.find(row => row.key === key);
    return !fact || fact.value === "UNKNOWN" || fact.value === expected;
  }));
  return Object.freeze({ categoryId, status: eligible.length ? "NON_DOMINATED_SET" as const : "NO_VERIFIED_MATCH" as const, candidates: Object.freeze(eligible), winner: null, rankingSignals: Object.freeze([]), unknownEffect: "NEUTRAL" as const });
}
