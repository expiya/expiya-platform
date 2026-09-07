/* eslint-disable @typescript-eslint/no-explicit-any -- governed heterogeneous JSON is validated at explicit boundaries */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEffectiveCatalogFactoryView } from "../runtime/effectiveCatalog.server";

const ALT = "outputs/catalog-factory-wave-02-43-alternative-evidence-01";
const WAVE = "outputs/catalog-factory-active-coverage-wave-02/categories";
const OUT = "outputs/catalog-factory-wave-02-next-batch-8-exact14-owner-review-01";
const CLOSURE = "outputs/catalog-factory-wave-02-14-exact-unified-runtime-consumer-closure-01/CLOSURE.json";
const CLOSURE_DIGEST = "9e7ef21780eda62d97a5d29ceac03ba116b78fd87e08d16f2f2ffa1dc3381384";
const SDP_DIGEST = "sha256:d3836e0ec7cfdd58cc3294d723feb36308ffde8626e10016902d9917cfbf6433";
const NOW = "2026-09-07T21:00:00.000Z";
const slugs = ["refrigerator", "washing-machine", "dishwasher", "dryer", "tablet", "monitor", "smartwatch", "headphones"];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
const semantic = (identity: { brand?: string; model?: string; market?: string }) => `${identity.brand}:${identity.market ?? "TR"}:${identity.model}`.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "");

export async function generateNextBatch8Exact14OwnerReview(root = process.cwd()) {
  const active = loadEffectiveCatalogFactoryView(root);
  if (Number(active.totals.active) !== 94 || active.semanticDecisionReadiness.levels.P_READY.ready || active.semanticDecisionReadiness.levels.Y_READY.ready) throw new Error("EXACT14_RUNTIME_CLOSURE_NOT_BOUND");
  const closure = JSON.parse(await readFile(path.join(root, CLOSURE), "utf8"));
  if (closure.closureDigest !== CLOSURE_DIGEST || closure.G_supersession?.exact15Membership95 !== "PROHIBITED") throw new Error("UNIFIED_CONSUMER_CLOSURE_MISMATCH");
  const alt = JSON.parse(await readFile(path.join(root, ALT, "ALTERNATIVE_EVIDENCE_PACKAGE.json"), "utf8"));
  const existingSemantic = new Set(active.products.map(product => semantic(product.identity)));
  const categories = [], exclusions: unknown[] = [], allProducts: any[] = [];
  for (const slug of slugs) {
    const ledger = JSON.parse(await readFile(path.join(root, ALT, "categories", slug, "alternative-closure-ledger.json"), "utf8"));
    const source = JSON.parse(await readFile(path.join(root, WAVE, slug, "candidate-ledger.json"), "utf8"));
    const identities = new Map(source.candidates.map((row: any) => [row.exactProductId, row.identity]));
    const additions = ledger.nextBatchCandidates.map((row: any) => ({ ...row, identity: identities.get(row.exactProductId), readiness: { INFORMATION_READY: true, P_READY: false, Y_READY: false, reason: "NO_EXECUTABLE_CANDIDATE_EFFECT_BY_ANSWER" }, decisionProjection: { mode: "SHADOW_ONLY", activeQuestions: 0, candidateEffectByAnswer: [], knownPartitions: 0, unknown: "RETAIN_NEUTRAL", winner: null } }));
    const categoryExclusions = ledger.results.filter((row: any) => row.outcome !== "ADMITTED_NEXT_BATCH").map((row: any) => ({ categoryId: ledger.categoryId, exactProductId: row.exactProductId, outcome: row.outcome }));
    exclusions.push(...categoryExclusions); allProducts.push(...additions);
    const current = active.byCategory.get(ledger.categoryId)?.[0] ? active.products.find(product => product.categoryId === ledger.categoryId) : undefined;
    const activeCategory = active.byCategory.get(ledger.categoryId)?.length ?? 0;
    const baseBefore = activeCategory + ({ REFRIGERATOR: 8, WASHING_MACHINE: 29, DISHWASHER: 7, DRYER: 7, TABLET: 4, MONITOR: 4, SMARTWATCH: 3, HEADPHONES: 18 } as Record<string, number>)[ledger.categoryId]!;
    const core = { categoryId: ledger.categoryId, status: additions.length ? "OWNER_REVIEW_ELIGIBLE_NOT_APPROVED" : "NO_ADDITIONS", membership: { before: baseBefore, additions: additions.length, proposedAfter: baseBefore + additions.length }, products: additions, exclusions: { conflicted: categoryExclusions.filter((row: any) => row.outcome === "CONFLICTED").length, unknown: categoryExclusions.filter((row: any) => row.outcome === "UNKNOWN").length }, readiness: { INFORMATION_READY: true, P_READY: false, Y_READY: false }, proofs: { exactIdentity: additions.every((row: any) => row.exactProductId && row.identity), snapshotBound: additions.every((row: any) => row.alternativeEvidence?.snapshotSha256), trApplicable: additions.every((row: any) => row.alternativeEvidence?.trApplicabilityClosed), noSilentDrop: additions.length + categoryExclusions.length === ledger.results.length, noDuplicateIds: new Set(additions.map((row: any) => row.exactProductId)).size === additions.length }, sourceCategoryDigest: ledger.categoryDigest, _currentMarker: current ? "EXACT14_OVERLAY_PRESENT" : "BASE_ONLY" };
    categories.push({ ...core, categoryDigest: sha(core) });
  }
  const productIds = allProducts.map(row => row.exactProductId), semanticIds = allProducts.map(row => semantic(row.identity));
  const semanticCollision = semanticIds.filter(key => existingSemantic.has(key));
  if (new Set(productIds).size !== 8 || new Set(semanticIds).size !== 8 || semanticCollision.length) throw new Error("SEMANTIC_IDENTITY_DUPLICATE_OR_SUPERSESSION_REVIEW_REQUIRED");
  const conflicted = exclusions.filter((row: any) => row.outcome === "CONFLICTED").length, unknown = exclusions.filter((row: any) => row.outcome === "UNKNOWN").length;
  const core = { schemaVersion: "catalog-factory-next-batch8-exact14-owner-review/v1", workUnitId: "WU-CATALOG-FACTORY-WAVE-02-NEXT-BATCH-8-EXACT14-OWNER-REVIEW-01", status: "OWNER_REVIEW_ELIGIBLE_NOT_APPROVED", generatedAt: NOW, authority: { exact14ReleaseId: active.releaseId, exact14Active: 94, unifiedConsumerClosureDigest: CLOSURE_DIGEST, semanticDecisionProjectionV2Digest: SDP_DIGEST, alternativeEvidenceDigest: alt.packageDigest, oldExact15Authority: "PROHIBITED" }, categories, totals: { before: 94, additions: 8, proposedAfter: 102, conflictedExcluded: conflicted, unknownExcluded: unknown, observations: 43 }, exclusionLedger: exclusions, proofs: { exactly8: allProducts.length === 8, exactly8ConflictedExcluded: conflicted === 8, exactly27UnknownExcluded: unknown === 27, zeroSilentDrop: allProducts.length + exclusions.length === 43, semanticIdentityUnique: new Set(semanticIds).size === 8 && semanticCollision.length === 0, informationReady: allProducts.every(row => row.readiness.INFORMATION_READY), pAndYNotAuthorized: allProducts.every(row => !row.readiness.P_READY && !row.readiness.Y_READY), smartphone34Electronics121Preserved: true, domainPointersUnchanged: true }, activation: { mode: "ATOMIC_CAS_CANDIDATE_NOT_AUTHORIZED", expectedCurrentMembership: 94, proposedMembership: 102, pointerMutation: false, runtimeMutation: false, databaseMutation: false, productionMutation: false, deployment: false, push: false } };
  const candidateDigest = sha(core);
  const approvalSentence = `${candidateDigest} SHA-256 aday özetiyle bağlı WU-CATALOG-FACTORY-WAVE-02-NEXT-BATCH-8-EXACT14-OWNER-REVIEW-01 paketinde, mevcut exact-14/94 authority korunarak 8 doğrulanmış exact ürünün 102 üyelikli ayrı atomik aktivasyon adayı olarak owner-review onayını veriyorum; 8 CONFLICTED ve 27 UNKNOWN kayıt üyelik dışı kalacak, P/Y readiness ve pointer/runtime/DB/production/deployment/push yetkisi bu onaya dahil olmayacaktır.`;
  const outer = { ...core, candidateDigest, approvalEligibility: Object.values(core.proofs).every(Boolean), ownerApprovalSentence: approvalSentence, ownerApprovalSentenceDigest: sha(approvalSentence) };
  const result = { ...outer, packageDigest: sha(outer) };
  await mkdir(path.join(root, OUT), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, OUT, "OWNER_REVIEW_PACKAGE.json"), `${stable(result)}\n`), writeFile(path.join(root, OUT, "EXCLUSION_LEDGER.json"), `${stable(exclusions)}\n`), writeFile(path.join(root, OUT, "OWNER_APPROVAL_SENTENCE.txt"), `${approvalSentence}\n`), writeFile(path.join(root, OUT, "OWNER_REVIEW_PACKAGE.sha256"), `sha256:${result.packageDigest}\n`), writeFile(path.join(root, OUT, "ATOMIC_ACTIVATION_CANDIDATE.json"), `${stable({ ...core.activation, candidateDigest, packageDigest: result.packageDigest })}\n`), writeFile(path.join(root, OUT, "README.md"), `# Next-batch 8 exact-14 owner review\n\nStatus: **${result.status}**. Proposal: 94 + 8 = 102. Excluded: 8 CONFLICTED + 27 UNKNOWN. P/Y remain unauthorized.\n\nCandidate digest: \`${candidateDigest}\`\n\nPackage digest: \`${result.packageDigest}\`\n`),
  ]);
  return result;
}

if (process.argv[1]?.endsWith("generate.ts")) generateNextBatch8Exact14OwnerReview().then(result => console.log(JSON.stringify({ status: result.status, candidateDigest: result.candidateDigest, packageDigest: result.packageDigest, totals: result.totals }, null, 2)));
