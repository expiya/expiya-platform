import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { POLICY_POINTER, RUNTIME_POINTER, buildSmartphonePMaterialityShadow } from "./smartphonePMaterialityShadow";
import { buildSmartphoneSupportPolicyClosure } from "./smartphoneSupportPolicyClosure";

const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export function buildSmartphonePMaterialityOwnerReview(root = process.cwd()) {
  const shadow = buildSmartphonePMaterialityShadow(root);
  const closure = buildSmartphoneSupportPolicyClosure(root);
  const projection = shadow.artifacts["shadow-projection.json"] as { proposals: Array<Record<string, unknown>> };
  const selected = projection.proposals.filter((proposal) => proposal.status === "ASK");
  const runtimePointerBytes = readFileSync(`${root}/${RUNTIME_POINTER}`);
  const policyPointerBytes = readFileSync(`${root}/${POLICY_POINTER}`);
  const runtimePointer = JSON.parse(runtimePointerBytes.toString());
  const policyPointer = JSON.parse(policyPointerBytes.toString());
  const catalogBytes = readFileSync(`${root}/${runtimePointer.catalogFile}`);
  const policyBytes = readFileSync(`${root}/${policyPointer.policyFile}`);
  const catalog = JSON.parse(catalogBytes.toString());
  const policy = JSON.parse(policyBytes.toString());
  const current = policy.payload.categories.find((category: { categoryId: string }) => category.categoryId === "SMARTPHONE").questionPlan;
  const questions = selected.map((proposal, index) => ({
    questionKey: proposal.questionKey, axis: proposal.axis, priority: index + 1, textTr: proposal.textTr,
    answersTr: [{ value: "YES", label: "Evet, gerekli" }, { value: "NO", label: "Hayır, zorunlu değil" }, { value: "UNKNOWN", label: "Henüz emin değilim" }],
    chain: proposal.chain, candidateEffectByAnswer: proposal.candidateEffectByAnswer,
    askOnlyWhen: ["CURRENT_POOL_HAS_AT_LEAST_TWO_KNOWN_PARTITIONS", "AT_LEAST_ONE_ANSWER_HAS_KNOWN_CANDIDATE_EFFECT", "NOT_ALREADY_ANSWERED"],
    suppressWhen: ["ZERO_EFFECT", "UNSUPPORTED", "PREDOMINANTLY_UNKNOWN", "REPEATED", "ALREADY_ANSWERED"],
    unknownRule: "UNKNOWN_RETAIN_NEVER_ADVANTAGE_EXCLUDE_OR_WINNER",
  }));
  const bindings = {
    runtimePointerSha256: sha(runtimePointerBytes), catalogSha256: sha(catalogBytes), catalogArtifactSha256: runtimePointer.catalogArtifactSha256,
    policyPointerSha256: sha(policyPointerBytes), policySha256: sha(policyBytes), policyDigest: policyPointer.policyDigest,
    shadow: { commit: "8b5ee38c5837815ef4ef3e04ba8c435a77579048", digest: "sha256:489339776731d2498b2ba115822ab9da95fb13d8b696dfc8d92b1512ffe81f16" },
    supportBackfill: { commit: "4bb450921b189537a2c89fde8f44febb7f96fe29", digest: "sha256:b099e17d1a674b2d8d3eb927033330960c81ad220fc524c5d1d3f2a46822e680" },
    supportClosure: { commit: "62ea022d528e7c062fecf10c0065e6039ed4efbf", digest: "sha256:1f112aba506258f45d01b7fd88ac811a98012834f1a95955dd2308314ce15868" },
  };
  const eligibility = questions.length === 3 && catalog.products.length === 121 && catalog.products.filter((p: { categoryId: string }) => p.categoryId === "SMARTPHONE").length === 34;
  const artifacts: Record<string, unknown> = {
    "owner-review-candidate.json": { schemaVersion: "smartphone-p-materiality-owner-review/v1", lifecycle: "OWNER_REVIEW_CANDIDATE", runtimeActive: false, featureFlag: "SMARTPHONE_P_MATERIALITY_V1", defaultEnabled: false, categoryId: "SMARTPHONE", questions, ordering: { mode: "ONE_QUESTION_AT_A_TIME", select: "LOWEST_PRIORITY_ELIGIBLE_MATERIAL_UNANSWERED", recomputeAfterEveryAnswer: true }, conversationState: { correction: "SUPERSEDE_PRIOR_ANSWER_AND_RECOMPUTE", clear: "REMOVE_ANSWER_AND_RECOMPUTE", supersession: "LATEST_EXPLICIT_ANSWER_WINS_WITH_AUDIT_LINK" }, outcomeRules: { noFalseSingleWinner: true, tiesAllowed: true, nonDominatedSetAllowed: true, rationaleFacts: "PARTICIPATING_FACTS_ONLY", unknownNeutral: true }, excluded: { supportLongevity: { status: "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN", durationKnown: 16, durationUnknown: 18 }, signals: ["PRICE", "BRAND_PRESTIGE", "SELLER", "RATING", "AFFILIATE", "CATALOG_ORDER"] } },
    "authority-bindings.json": { schemaVersion: "smartphone-p-owner-review-bindings/v1", ...bindings },
    "current-vs-proposed-runtime.json": { schemaVersion: "smartphone-p-runtime-diff/v1", current: { runtimeUnchanged: true, questions: current }, proposed: { planOnly: true, questions: questions.map(({ questionKey, axis, priority, textTr, answersTr }) => ({ questionKey, axis, priority, textTr, answersTr })) }, removals: ["GENERIC_OS_SUPPORT", "GENERIC_CELLULAR_BANDS", "GENERIC_CAMERA", "GENERIC_BATTERY"], additions: questions.map((q) => q.questionKey), candidateMembershipOrderEffect: "NONE" },
    "activation-plan.json": { schemaVersion: "smartphone-p-activation-plan/v1", status: "PLAN_ONLY_NOT_AUTHORIZED", steps: ["VERIFY_PINNED_DIGESTS", "ADD_DEFAULT_OFF_FEATURE_FLAG", "IMPLEMENT_SHADOW_PARITY_CHECK", "RUN_FOCUSED_AND_FULL_GATES", "OBTAIN_EXACT_OWNER_APPROVAL", "ATOMIC_POINTER_OR_FLAG_ACTIVATION"], failClosed: ["DIGEST_MISMATCH", "UNKNOWN_EFFECT_NOT_NEUTRAL", "CANDIDATE_ORDER_OR_FINGERPRINT_CHANGE", "ZERO_EFFECT_QUESTION", "MISSING_ROLLBACK_RECEIPT"], rollback: { mechanism: "DISABLE_FEATURE_FLAG", restoresCurrentPolicy: true, catalogPointerUnchanged: true }, buildGate: { requiredRuntime: "Node 24", currentHostRuntime: "Node 26.6.0", executed: false, reason: "NODE_24_NOT_AVAILABLE; known Node 26 Webpack WasmHash failure is environmental and not retried", futureCommand: "npm run build" } },
    "readiness-report.json": { schemaVersion: "smartphone-p-owner-review-readiness/v1", INFORMATION_READY: true, P_READY: true, Y_READY: false, ownerReviewEligibility: eligibility ? "PASS" : "FAIL", supportQuestionExcluded: true, exactCounts: { electronics: 121, smartphone: 34 }, approvalSentenceTr: eligibility ? "SMARTPHONE P-materiality owner-review paketindeki yalnız Türkiye/5G applicability, telefoto kullanım senaryosu ve en az 80 W şarj rutini sorularının, bağlı digest'ler değişmeden ve support longevity sorusu hariç tutularak, default-off feature flag ve fail-closed rollback planıyla production integration candidate olarak hazırlanmasını onaylıyorum; bu onay aktivasyon, push veya deployment yetkisi vermez." : null },
    "no-effect-proof.json": { schemaVersion: "smartphone-p-owner-review-no-effect/v1", bindings, currentCatalogOrderSha256: sha(stable(catalog.products.map((p: { exactProductId: string }) => p.exactProductId))), currentProductFingerprintsSha256: sha(stable(catalog.products.map((p: unknown) => sha(stable(p))))), activePointerMutation: false, runtimeMutation: false, uiCardDbDeploymentPushEffect: "NONE", closurePreviewDigest: closure.manifest.releaseDigest },
  };
  const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha(stable(value))]));
  const manifest = { schemaVersion: "smartphone-p-owner-review-manifest/v1", workUnit: "WU-XPY-SMARTPHONE-P-MATERIALITY-RUNTIME-OWNER-REVIEW-01", generatedAt: "2026-09-07T00:00:00.000Z", lifecycle: "OWNER_REVIEW_CANDIDATE", artifactDigests, packageDigest: sha(stable({ bindings, artifactDigests })) };
  const serialized: Record<string, string> = Object.fromEntries([...Object.entries(artifacts), ["manifest.json", manifest]].map(([name, value]) => [name, stable(value)]));
  return { artifacts, manifest, serialized };
}
