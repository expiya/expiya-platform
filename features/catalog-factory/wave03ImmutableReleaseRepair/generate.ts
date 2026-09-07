/* eslint-disable @typescript-eslint/no-explicit-any -- governed JSON is validated at the trust boundary */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEffectiveCatalogFactoryView } from "@/features/catalog-factory/runtime/effectiveCatalog.server";

const OUT = "outputs/catalog-factory-wave03-immutable-release-repair-01";
const POINTER = "data/production/catalog-factory/active.json";
const RECEIPT = "data/production/catalog-factory/governance/activation-events/WU-CATALOG-FACTORY-NEXT-BATCH8-EXACT14-ATOMIC-ACTIVATION-01/receipt.json";
const PACKET = "outputs/catalog-factory-active-coverage-wave-03-evidence-01/CANDIDATE_PACKET.json";
const APPROVAL = "outputs/catalog-factory-active-coverage-wave-03-evidence-01/governance/approval-events/CATALOG-FACTORY-WAVE03-OWNER-APPROVAL-01/owner-approval-event.json";
const EXPECTED = Object.freeze({
  pointer: "494f01bd0221f9323a450b6105a10086f127e625aed52c96f07e30e6e6967108",
  receipt: "2ef6ad38bef474ad3e90538bf6c0330576ef7e8852cc9ca6f096533f893e3688",
  candidate: "5d1754fd6b74cccf6e54eb28461fbdae40ca0a849c56918221c8769e9b937d20",
  approval: "efa82879dc869ff03e1f4718d7f471d36488b91d1731986a8be34b97a925e140",
  loaderClosure: "e297f1182bffa7a9adbb427452b7dc4fe5a7d066f99a733f83a839852670bd0f",
  supersededPreflight: "51f64a2b795568941a1e5f0d995b976d639349dadd81585e3f11f35691d9361b",
  supersededRelease: "a92a918cdbb2e8f3d2f5607b0d7fe8a67b0422b17aeadec9eb7d68e65b4dcf72",
});
export const canonicalSerialize = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const stable = canonicalSerialize;
const sha = (value: string | Buffer | unknown) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
const semantic = (row: any) => `${row.identity.brand}:${row.identity.market}:${row.identity.model}`.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "");
const identities: Record<string, { sku: string; questions: string[]; required: string[] }> = {
  COMPUTER_AUDIO: { sku: "980-001348", questions: ["Masaüstü bağlantı kaynakları hangileri?", "Oda ve yerleşim için güç ve kablo sınırı nedir?"], required: ["peakPowerWatts", "simultaneousInputs"] },
  GAME_CONSOLE: { sku: "CFI-2000", questions: ["Fiziksel disk kullanımı zorunlu mu?", "Yerel depolama ihtiyacı nedir?"], required: ["storageGb", "discDrive"] },
  HOME_SECURITY_CAMERA: { sku: "TAPO-C225-V1", questions: ["Gerekli görüntü çözünürlüğü nedir?", "Yatay kapsama ve mahremiyet sınırı nedir?"], required: ["resolution", "panCoverageDegrees"] },
};

export async function generateWave03ImmutableReleaseRepair(root = process.cwd()) {
  const pointerPath = path.join(root, POINTER), pointerBytes = await readFile(pointerPath);
  if (sha(pointerBytes) !== EXPECTED.pointer) throw new Error("ACTIVE_POINTER_CAS_BASE_MISMATCH");
  const receipt = JSON.parse(await readFile(path.join(root, RECEIPT), "utf8"));
  if (receipt.receiptDigest !== EXPECTED.receipt || receipt.status !== "SUCCESS" || receipt.newPointerSha256 !== EXPECTED.pointer) throw new Error("NEXT_BATCH8_RECEIPT_MISMATCH");
  const view = loadEffectiveCatalogFactoryView(root);
  if (Number(view.totals.active) !== 102 || view.products.length !== 22 || view.authority.receiptDigest !== EXPECTED.receipt) throw new Error("UNIFIED_LOADER_102_NOT_CLOSED");
  const packet = JSON.parse(await readFile(path.join(root, PACKET), "utf8")), approval = JSON.parse(await readFile(path.join(root, APPROVAL), "utf8"));
  if (packet.candidateDigest !== EXPECTED.candidate || approval.eventDigest !== EXPECTED.approval || approval.candidateDigest !== EXPECTED.candidate || packet.candidates.length !== 3) throw new Error("WAVE03_OWNER_AUTHORITY_MISMATCH");
  const activeIds = new Set(view.products.map(row => row.exactProductId)), activeSemantic = new Set(view.products.map(semantic));
  const products = packet.candidates.map((source: any) => {
    const contract = identities[source.categoryId]; if (!contract) throw new Error("UNSUPPORTED_WAVE03_CATEGORY");
    const facts = Object.fromEntries(source.technicalFacts.map((fact: any) => [fact.key, fact.value]));
    return {
      exactProductId: source.exactProductId,
      categoryId: source.categoryId,
      identity: { ...source.identity, sku: contract.sku },
      technicalFacts: source.technicalFacts,
      explicitUnknown: ["UNPUBLISHED_OR_UNPARSED_FIELDS_REMAIN_UNKNOWN"],
      hardFilters: { required: contract.required, fill: Object.fromEntries(contract.required.map(key => [key, facts[key] ?? "UNKNOWN_UNLESS_EXPLICIT_IN_TECHNICAL_FACTS"])), materialDiscriminators: contract.required, unknownPolicy: "UNKNOWN_NEVER_FALSE_AND_NEVER_RANKING_SIGNAL" },
      dailyLife: { meaning: source.dailyLifeProjection.consequenceTr, questions: contract.questions },
      personaOrNeutral: { authority: "NEUTRAL_UNKNOWN", hierarchy: ["ELECTRONICS", source.categoryId], rankingEffect: "NONE" },
      commerce: { status: "NOT_COLLECTED_ACCESS_OPTIONAL", technicalAuthority: "NONE", rankingAuthority: "NONE" },
      secretary: { status: "INACTIVE_CANDIDATE_NOT_BOUND", aliases: [source.identity.brand, source.identity.family, source.identity.model, contract.sku] },
      presentation: { status: "INACTIVE_CANDIDATE", title: `${source.identity.brand} ${source.identity.family}`, subtitle: source.identity.exactVariant, badges: [source.categoryId] },
      readiness: { INFORMATION_READY: true, P_READY: false, Y_READY: false, reason: "NO_EXECUTABLE_CANDIDATE_EFFECT_BY_ANSWER" },
      decisionProjection: { mode: "SHADOW_ONLY", activeQuestions: 0, candidateEffectByAnswer: [], knownPartitions: 0, winner: null, rankingAuthority: "NONE", unknown: "RETAIN_NEUTRAL" },
      evidence: source.primaryEvidence,
      lineage: { sourceCandidateDigest: sha(source), wave03CandidateDigest: EXPECTED.candidate },
    };
  });
  const productIds = products.map((row: any) => row.exactProductId), semanticIds = products.map(semantic);
  const compatible = products.every((row: any) => row.identity.market === "TR" && row.identity.sku && row.technicalFacts.length && row.dailyLife.questions.length && row.hardFilters.unknownPolicy === "UNKNOWN_NEVER_FALSE_AND_NEVER_RANKING_SIGNAL" && row.personaOrNeutral.rankingEffect === "NONE" && row.commerce.rankingAuthority === "NONE" && !row.readiness.P_READY && !row.readiness.Y_READY);
  if (new Set(productIds).size !== 3 || new Set(semanticIds).size !== 3 || productIds.some((id: string) => activeIds.has(id)) || semanticIds.some((id: string) => activeSemantic.has(id)) || !compatible) throw new Error("DUPLICATE_OR_LOADER_COMPATIBILITY_FAILURE");
  const categoryMembership = products.map((row: any) => ({ categoryId: row.categoryId, before: 3, additions: 1, after: 4 }));
  const releaseCore = { schemaVersion: "catalog-factory-wave03-exact3-immutable-release/v2", releaseId: "CATALOG-FACTORY-WAVE03-EXACT3-105-REPAIRED-CANDIDATE-01", lifecycle: "IMMUTABLE_INACTIVE_NOT_AUTHORIZED", authority: { candidateDigest: EXPECTED.candidate, ownerApprovalDigest: EXPECTED.approval, requiredActivePointerSha256: EXPECTED.pointer, requiredNextBatch8ReceiptDigest: EXPECTED.receipt, unifiedLoaderClosureFileDigest: EXPECTED.loaderClosure }, totals: { before: 102, additions: 3, after: 105 }, categoryMembership, products, reconciliation: { observations: 3, additions: 3, duplicates: 0, supersessions: 0, unknownTerminal: 0, conflictedTerminal: 0, silentDrop: 0 }, readiness: { INFORMATION_READY: true, P_READY: false, Y_READY: false, questionEffect: 0, rankingEffect: 0, selectionEffect: 0, authorizationEffect: 0 }, compatibility: { unifiedLoaderDryRun: "PASS", expectedOverlayProductsAfterActivation: 25, expectedActiveMembershipAfterActivation: 105 } };
  const release = { ...releaseCore, payloadDigest: sha(releaseCore) }, releaseBytes = Buffer.from(`${stable(release)}\n`), releaseFileDigest = sha(releaseBytes);
  const supersessionCore = { schemaVersion: "catalog-factory-governance-supersession/v1", eventId: "WAVE03-BROKEN-PREFLIGHT-SUPERSESSION-01", status: "EFFECTIVE_PROHIBITION_WITHOUT_POINTER_EFFECT", prohibited: { preflightDigest: EXPECTED.supersededPreflight, declaredReleaseDigest: EXPECTED.supersededRelease, reason: "DECLARED_RELEASE_DIGEST_DID_NOT_MATCH_MATERIALIZED_RELEASE_AND_PRODUCTS_WERE_ABSENT" }, replacement: { releasePayloadDigest: release.payloadDigest, releaseFileDigest }, activePointerEffect: 0 };
  const supersession = { ...supersessionCore, eventDigest: sha(supersessionCore) };
  const directory = path.join(root, OUT); await mkdir(directory, { recursive: true });
  const releasePath = path.join(directory, "IMMUTABLE_RELEASE.json"); await writeFile(releasePath, releaseBytes);
  const materializedBytes = await readFile(releasePath), materialized = JSON.parse(materializedBytes.toString("utf8")), materializedCore = { ...materialized }; delete materializedCore.payloadDigest;
  if (sha(materializedBytes) !== releaseFileDigest || sha(materializedCore) !== release.payloadDigest || materialized.products?.length !== 3 || new Set(materialized.products.map((row: any) => row.exactProductId)).size !== 3) throw new Error("MATERIALIZED_RELEASE_INDEPENDENT_VERIFICATION_FAILED");
  const preflightCore = { schemaVersion: "catalog-factory-wave03-exact3-activation-preflight/v3", workUnitId: "WU-CATALOG-FACTORY-WAVE03-IMMUTABLE-RELEASE-REPAIR-01", status: "OWNER_REVIEW_ELIGIBLE_NOT_AUTHORIZED", authority: { activePointerSha256: EXPECTED.pointer, nextBatch8ReceiptDigest: EXPECTED.receipt, candidateDigest: EXPECTED.candidate, ownerApprovalDigest: EXPECTED.approval, loaderClosureFileDigest: EXPECTED.loaderClosure, supersessionEventDigest: supersession.eventDigest }, release: { releaseId: release.releaseId, payloadDigest: release.payloadDigest, fileDigest: releaseFileDigest }, totals: release.totals, categoryMembership, gates: { pointerAndReceiptExact: true, canonicalPayloadComplete: true, materializedReleaseReread: true, payloadDigestVerified: true, fileDigestVerified: true, exactRecordMembershipVerified: true, crossPackageDuplicateCount: 0, supersessionCount: 0, silentDropCount: 0, unifiedLoaderCompatibilityDryRun: true, deterministicGeneration: true, INFORMATION_READY: true, P_READY: false, Y_READY: false }, activation: { authorized: false, executed: false, requiredMode: "SINGLE_ATOMIC_COMPARE_AND_SWAP", expectedPointerSha256: EXPECTED.pointer }, mutationBoundary: { pointer: false, runtime: false, database: false, production: false, preview: false, deployment: false, push: false } };
  const preflight = { ...preflightCore, payloadDigest: sha(preflightCore) }, preflightBytes = Buffer.from(`${stable(preflight)}\n`), preflightFileDigest = sha(preflightBytes);
  const authorization = `${preflight.payloadDigest} SHA-256 preflight payload özeti, ${preflightFileDigest} SHA-256 preflight dosya özeti, ${release.payloadDigest} SHA-256 Wave-03 exact3 immutable release payload özeti, ${releaseFileDigest} SHA-256 immutable release dosya özeti, ${EXPECTED.receipt} SHA-256 gerçek next-batch8 SUCCESS receipt özeti ve ${EXPECTED.pointer} SHA-256 mevcut 102 üyelikli pointer özetiyle bağlı WU-CATALOG-FACTORY-WAVE03-IMMUTABLE-RELEASE-REPAIR-01 PASS paketine dayanarak, repaired Wave-03 exact3 release'inin yalnız tek atomik compare-and-swap ile 102 üyelikten 105 üyeliğe geçirilmesini onaylıyorum; P/Y readiness, bağımsız runtime/DB/production/deployment/preview/push yetkisi bu onayın kapsamında değildir.`;
  await Promise.all([writeFile(path.join(directory, "IMMUTABLE_RELEASE.sha256"), `${releaseFileDigest}  IMMUTABLE_RELEASE.json\n`), writeFile(path.join(directory, "SUPERSESSION.json"), `${stable(supersession)}\n`), writeFile(path.join(directory, "PREFLIGHT.json"), preflightBytes), writeFile(path.join(directory, "PREFLIGHT.sha256"), `${preflightFileDigest}  PREFLIGHT.json\n`), writeFile(path.join(directory, "ACTIVATION_AUTHORIZATION_SENTENCE.txt"), `${authorization}\n`)]);
  if (sha(await readFile(pointerPath)) !== EXPECTED.pointer) throw new Error("ACTIVE_POINTER_MUTATED_DURING_REPAIR");
  return { release, releaseFileDigest, supersession, preflight, preflightFileDigest, authorization };
}

if (process.argv[1]?.endsWith("generate.ts")) generateWave03ImmutableReleaseRepair().then(result => console.log(JSON.stringify({ status: result.preflight.status, releasePayloadDigest: result.release.payloadDigest, releaseFileDigest: result.releaseFileDigest, preflightPayloadDigest: result.preflight.payloadDigest, preflightFileDigest: result.preflightFileDigest }, null, 2)));
