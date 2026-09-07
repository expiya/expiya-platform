import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OLD_REVIEW = "outputs/catalog-factory-wave-02-15-exact-owner-review-01";
const OLD_OVERLAY = "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE-02-EXACT-15-ACTIVE-01/catalog-overlay.json";
const ACTIVE_POINTER = "data/production/catalog-factory/active.json";
const EXISTING_REFRIGERATOR = "data/production/appliances/refrigerators/richness/releases/APPLIANCES-REFRIGERATOR-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json";
const OUT = "outputs/catalog-factory-wave-02-14-exact-identity-supersession-owner-review-01";
const WORK_UNIT = "WU-CATALOG-FACTORY-WAVE-02-15-EXACT-IDENTITY-SUPERSESSION-01";
const DUPLICATE_ID = "appliances:refrigerator:lg:lg-gc-b569nllm";
const CANONICAL_ID = "LG_GC_B569NLLM_TR";
const NOW = "2026-09-07T11:00:00.000Z";
const EXPECTED_EXACT15_POINTER_SHA256 = "f8d7aad75c5eb0610e6a782ffa0a70b67a55e2ec08d12fe71972bb3d738a799a";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : stable(value)).digest("hex");
const readJson = async (root: string, file: string) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const identityKey = (manufacturer: string, model: string) => `${manufacturer}:${model}`.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "");
const slug = (value: string) => value.toLowerCase().replaceAll("_", "-");

export async function generateWave02Exact14IdentitySupersession(root = process.cwd()) {
  const oldPackage = await readJson(root, `${OLD_REVIEW}/OWNER_REVIEW_PACKAGE.json`), oldOverlay = await readJson(root, OLD_OVERLAY), refrigerator = await readJson(root, EXISTING_REFRIGERATOR);
  const pointerBytes = await readFile(path.join(root, ACTIVE_POINTER)), exclusionBytes = await readFile(path.join(root, OLD_REVIEW, "EXCLUSION_LEDGER.json"));
  if (sha(pointerBytes) !== EXPECTED_EXACT15_POINTER_SHA256) throw new Error("HISTORICAL_EXACT15_POINTER_NOT_CURRENT");
  const duplicate = oldOverlay.categories.find((item: { categoryId: string }) => item.categoryId === "REFRIGERATOR").additions.find((item: { exactProductId: string }) => item.exactProductId === DUPLICATE_ID);
  const existing = refrigerator.offerings.find((item: { offeringId: string }) => item.offeringId === CANONICAL_ID);
  if (!duplicate || !existing) throw new Error("DUPLICATE_IDENTITY_INPUT_MISSING");
  const comparison = {
    manufacturer: { existing: existing.identity.manufacturer, observed: duplicate.identity.brand, matches: existing.identity.manufacturer.toLocaleLowerCase("tr-TR") === duplicate.identity.brand.toLocaleLowerCase("tr-TR") },
    model: { existing: existing.identity.model, observed: duplicate.identity.model, matches: existing.identity.model === duplicate.identity.model },
    normalizedIdentityKey: { existing: identityKey(existing.identity.manufacturer, existing.identity.model), observed: identityKey(duplicate.identity.brand, duplicate.identity.model), matches: identityKey(existing.identity.manufacturer, existing.identity.model) === identityKey(duplicate.identity.brand, duplicate.identity.model) },
    market: { existing: existing.market, observed: duplicate.identity.market, matches: existing.market === duplicate.identity.market },
    configuration: { existing: existing.identity.configuration, observed: duplicate.identity.exactVariant, compatible: /g(?:c)?-?b569nllm/iu.test(existing.identity.configuration.replaceAll("_", "-")) && /g(?:c)?-?b569nllm/iu.test(duplicate.identity.exactVariant.replaceAll("_", "-")) },
    skuMpn: { existing: "NOT_SEPARATELY_PUBLISHED_PRODUCT_ID_IS_MODEL_BOUND", observed: duplicate.identity.sku, matchesModel: duplicate.identity.sku === duplicate.identity.model },
    gtin: { existing: "UNKNOWN_NOT_PUBLISHED", observed: duplicate.identity.gtin, conflict: false },
    manufacturerEvidence: { snapshotFile: duplicate.primaryEvidence.snapshotFile, snapshotSha256: duplicate.primaryEvidence.snapshotSha256, matchedExactToken: duplicate.identity.matchedExactToken },
  };
  if (!comparison.manufacturer.matches || !comparison.model.matches || !comparison.normalizedIdentityKey.matches || !comparison.market.matches || !comparison.configuration.compatible || comparison.gtin.conflict) throw new Error("DUPLICATE_IDENTITY_NOT_PROVEN");

  const categories = [], productBindings = [];
  for (const summary of oldPackage.categories as Array<{ categoryId: string; baselineActive: number }>) {
    const oldCategory = await readJson(root, `${OLD_REVIEW}/categories/${slug(summary.categoryId)}/owner-review-category.json`);
    const additions = oldCategory.proposedAdditions.filter((item: { exactProductId: string }) => item.exactProductId !== DUPLICATE_ID);
    const membership = oldCategory.membershipProposal.exactProductIds.filter((id: string) => id !== DUPLICATE_ID);
    for (const item of additions) productBindings.push({ categoryId: summary.categoryId, exactProductId: item.exactProductId, sourceProductDigest: sha(item), candidateProductDigest: sha(item), byteSemanticIdentity: true, evidenceDigest: item.primaryEvidence.snapshotSha256 });
    const core = { schemaVersion: "catalog-factory-exact14-supersession-category/v0.1", workUnitId: WORK_UNIT, categoryId: summary.categoryId, baselineActive: summary.baselineActive, proposedAdditions: additions, additionCount: additions.length, proposedMembership: { exactProductIds: membership, before: summary.baselineActive, after: membership.length, effect: additions.length, digest: sha(membership) }, duplicateTerminal: summary.categoryId === "REFRIGERATOR" ? { observationExactProductId: DUPLICATE_ID, outcome: "REJECTED_DUPLICATE_EXISTING_EXACT_IDENTITY", canonicalExistingExactProductId: CANONICAL_ID, membershipEffect: 0, reason: "SAME_MANUFACTURER_MARKET_AND_EXACT_MODEL_ALREADY_ACTIVE" } : null };
    categories.push({ ...core, categoryDigest: sha(core) });
  }
  const duplicateTerminal = { schemaVersion: "catalog-factory-identity-reconciliation-event/v0.1", workUnitId: WORK_UNIT, observationExactProductId: DUPLICATE_ID, canonicalExistingExactProductId: CANONICAL_ID, outcome: "REJECTED_DUPLICATE_EXISTING_EXACT_IDENTITY", terminal: true, membershipEffect: 0, comparison, sourceOverlayDigest: oldOverlay.overlayDigest };
  const supersessionEventCore = { schemaVersion: "catalog-factory-authority-supersession-event/v0.1", eventId: "CATALOG-FACTORY-EXACT15-TO-EXACT14-SUPERSESSION-PROPOSED-01", eventType: "SUPERSESSION_AND_REVOCATION_PROPOSED", effective: false, ownerApprovalRequired: true, oldAuthority: { ownerReviewCandidateDigest: oldPackage.candidateDigest, ownerApprovalEventDigest: "7ff3017cba8d8b1b24e0fc46fbed5fe74655035a3733db58d1437c56caabbe4e", activationCommit: "d73cd1b34863d3cb1f2b1d7ed89aadd43c272050", activeOverlayDigest: oldOverlay.overlayDigest, activePointerSha256: sha(pointerBytes), declaredMembership: 95 }, proposedAuthority: { additions: 14, membership: 94 }, reason: "EXACT15_CONTAINS_ONE_DUPLICATE_OF_EXISTING_ACTIVE_IDENTITY", appendOnly: true, oldArtifactsRewritten: false, effectWhenSeparatelyActivated: "PROHIBIT_EXACT15_OVERLAY_RUNTIME_CONSUMPTION_AND_SELECT_EXACT14_SUPERSESSION" };
  const supersessionEvent = { ...supersessionEventCore, eventDigest: sha(supersessionEventCore) };
  const candidateCore = { schemaVersion: "catalog-factory-exact14-supersession-owner-review/v0.1", workUnitId: WORK_UNIT, status: "OWNER_REVIEW_ELIGIBLE_NOT_APPROVED", generatedAt: NOW, supersedes: { oldCandidateDigest: oldPackage.candidateDigest, oldPackageDigest: oldPackage.packageDigest, oldOverlayDigest: oldOverlay.overlayDigest, oldApprovalDoesNotCoverThisScope: true }, totals: { baselineActive: 80, proposedAdditions: 14, proposedAfter: 94, preservedExclusions: 43, duplicateTerminals: 1 }, categories, duplicateTerminal, productBindings, exclusionLedger: { source: `${OLD_REVIEW}/EXCLUSION_LEDGER.json`, sha256: sha(exclusionBytes), count: 43, preservedByteIdentical: true }, proofs: { exactly14: productBindings.length === 14, total94: categories.reduce((sum, item) => sum + item.proposedMembership.after, 0) === 94, allOtherProductsDigestIdentical: productBindings.every(item => item.sourceProductDigest === item.candidateProductDigest && item.byteSemanticIdentity), noDuplicateProductIds: new Set(productBindings.map(item => item.exactProductId)).size === 14, noSilentDrop: productBindings.length + 1 === 15, duplicateTerminalBound: duplicateTerminal.terminal && duplicateTerminal.membershipEffect === 0, exclusionsPreserved: sha(exclusionBytes) === "bceaa400b19d4f3933bacfb573a5d5d40bac877b98bf48628b6888b6460b2a0f" }, mutationBoundary: { runtime: false, activePointer: false, database: false, domainPointers: false, production: false, deployment: false, push: false, oldArtifactsRewritten: false } };
  const candidateDigest = sha(candidateCore);
  const activationPlan = { schemaVersion: "catalog-factory-exact14-atomic-activation-plan/v0.1", status: "PLANNED_NOT_AUTHORIZED", executed: false, candidateDigest, expectedCurrentOverlay: { releaseId: oldOverlay.releaseId, overlayDigest: oldOverlay.overlayDigest, activePointerSha256: sha(pointerBytes), totals: { before: 80, additions: 15, active: 95 } }, proposed: { additions: 14, active: 94, oldExact15RuntimeAuthority: "PROHIBITED_AFTER_SUCCESSFUL_CAS" }, operations: ["VERIFY_CURRENT_EXACT15_POINTER_BYTES_AND_DIGEST", "MATERIALIZE_EXACT14_IMMUTABLE_RELEASE", "SINGLE_CAS_REPLACE_CATALOG_FACTORY_POINTER"], failureSemantics: { beforeCas: "OLD_POINTER_UNCHANGED_RUNTIME_CONSUMPTION_REMAINS_PROHIBITED_BY_CURRENT_GAP", casMismatch: "ABORT_NO_WRITES", afterCasValidationFailure: "BYTE_IDENTICAL_RESTORE_OLD_EXACT15_POINTER" }, runtimeConsumption: "SEPARATE_UNIFIED_CONSUMER_ACTIVATION_REQUIRED", databaseMigration: "NONE", deployment: false, push: false };
  const manifestBase = { ...candidateCore, candidateDigest, approvalEligibility: Object.values(candidateCore.proofs).every(Boolean), supersessionEvent, activationPlan };
  const packageDigest = sha(manifestBase);
  const approvalSentence = `${candidateDigest} SHA-256 aday özeti ve ${packageDigest} SHA-256 paket özetiyle bağlı ${WORK_UNIT} paketinde, mevcut 80 aktif üyeliğe 14 gerçek semantik exact ürün eklenerek 94 üyelik önerilmesini ve LG GC-B569NLLM gözleminin ${CANONICAL_ID} kimliğine bağlı terminal duplicate olarak üyelik etkisi sıfır kalmasını onaylıyorum; önceki exact-15/95 onayı bu yeni kapsamı karşılamaz ve pointer/runtime/production/deployment/push değişikliği ayrı atomik aktivasyon onayı gerektirir.`;
  const manifest = { ...manifestBase, packageDigest, ownerApprovalSentence: approvalSentence, ownerApprovalSentenceDigest: sha(approvalSentence) };
  const directory = path.join(root, OUT);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, "OWNER_REVIEW_PACKAGE.json"), `${stable(manifest)}\n`),
    writeFile(path.join(directory, "OWNER_REVIEW_PACKAGE.sha256"), `sha256:${packageDigest}\n`),
    writeFile(path.join(directory, "OWNER_APPROVAL_SENTENCE.txt"), `${approvalSentence}\n`),
    writeFile(path.join(directory, "DUPLICATE_RECONCILIATION.json"), `${stable(duplicateTerminal)}\n`),
    writeFile(path.join(directory, "SUPERSESSION_EVENT.json"), `${stable(supersessionEvent)}\n`),
    writeFile(path.join(directory, "ATOMIC_ACTIVATION_PLAN.json"), `${stable(activationPlan)}\n`),
    writeFile(path.join(directory, "EXCLUSION_LEDGER.json"), exclusionBytes),
    writeFile(path.join(directory, "OWNER_REVIEW_PACKAGE.md"), `# Exact-14 identity supersession owner review\n\nStatus: **${manifest.status}**. Existing active: 80; real semantic additions: 14; proposed effective membership: 94. One LG GC-B569NLLM observation is terminally rejected as a duplicate of ${CANONICAL_ID}.\n\nThe previous exact-15 approval does not authorize this scope. No pointer, runtime, database, domain authority, production, deployment or push mutation was performed.\n\nCandidate digest: \`${candidateDigest}\`\n\nPackage digest: \`${packageDigest}\`\n`),
  ]);
  return manifest;
}

if (process.argv[1]?.endsWith("generate.ts")) generateWave02Exact14IdentitySupersession().then(result => console.log(JSON.stringify({ status: result.status, eligible: result.approvalEligibility, candidateDigest: result.candidateDigest, packageDigest: result.packageDigest, totals: result.totals }, null, 2)));
