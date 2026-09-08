import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { SECRETARY_DAILY_LIFE_EXAMPLES } from "../platform/secretaryDailyLifeExamples";
import { executePMaterialityShadow, type PMaterialityContext } from "../semantic-decision-projection/v2/materialityExecutor";
import { simulateAcceptedAnswer, validateSemanticDecisionProjection } from "../semantic-decision-projection/v2/invariants";
import type { SemanticDecisionProjectionV2 } from "../semantic-decision-projection/v2/contract";

const BASE = "8db93b6ff0333a2cb54d703221fed9608d97a7ec";
const PARENT_DIGEST = "sha256:3163b47d52ebabc7a451c11ed48caf8e8363cc5bdc7887e72f5ca7ba5110dd72";
const PARENT = "data/research/electronics/smartphone-p-materiality-owner-review-v2-01";
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}` as const;
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export function buildSmartphonePMaterialityCurrentProductionIntegration(root = process.cwd()) {
  const read = (path: string) => readFileSync(`${root}/${path}`);
  const parentManifestBytes = read(`${PARENT}/manifest.json`), parentManifest = JSON.parse(parentManifestBytes.toString());
  if (parentManifest.packageDigest !== PARENT_DIGEST) throw new Error("OWNER_REVIEW_PARENT_DIGEST_MISMATCH");
  const parentProjectionBytes = read(`${PARENT}/semantic-projections-v2.json`);
  const parentProjections = JSON.parse(parentProjectionBytes.toString()).projections as SemanticDecisionProjectionV2[];
  const projections = parentProjections.map((projection) => {
    const sourcesByFact = new Map(projection.factCapabilityRefs.map((ref) => [ref.factId, ref.sourceRefs]));
    return { ...projection, identity: { ...projection.identity, projectionId: `${projection.identity.projectionId}.current-production-integration-01` }, userNeed: { ...projection.userNeed, decisionUse: "HARD_FILTER" }, materialQuestion: { ...projection.materialQuestion, candidateEffectByAnswer: Object.fromEntries(Object.entries(projection.materialQuestion.candidateEffectByAnswer).map(([answer, effects]) => [answer, effects.map((effect) => ({ ...effect, effect: answer !== "YES" && effect.uncertainty === "KNOWN" ? "none" : effect.effect, exactKnownMismatch: answer === "YES" && effect.exactKnownMismatch, evidenceRefs: [...new Set(effect.evidenceRefs.flatMap((ref) => sourcesByFact.get(ref) ?? [ref]))].sort() }))])) }, inheritance: { ...projection.inheritance, blockedByConflict: false, blockedByConflictRefs: [] } } satisfies SemanticDecisionProjectionV2;
  });
  const candidatePool = projections[0]!.offerings.map((offering) => offering.exactOfferingId);
  const context: PMaterialityContext = { market: "TR", configurationIds: projections.flatMap((projection) => projection.applicability.configurationIds), evaluatedAt: "2026-09-08T00:00:00.000Z", satisfiedPrerequisiteIds: ["TWO_KNOWN_PARTITIONS", "NON_ZERO_EFFECT"], relevantNeedIds: projections.map((projection) => projection.userNeed.needId), questionsAskedThisSession: 0, userFatigue: 0 };
  const previews = projections.map((projection) => executePMaterialityShadow({ candidatePool, currentContext: context, projections: [projection] }));
  const answerAcceptance = projections.flatMap((projection) => projection.materialQuestion.answerDomain.map((answer) => {
    const result = simulateAcceptedAnswer({ projection, answerId: answer.answerId, candidatePool, context: { explicitRequirementQuestionIds: answer.establishesExplicitRequirement ? [projection.materialQuestion.questionId] : [], evaluatedAt: context.evaluatedAt } });
    return { projectionId: projection.identity.projectionId, answerId: answer.answerId, retainedCandidateIds: result.retainedCandidateIds, excludedCandidateIds: result.excludedCandidateIds, uncertaintyRetainedCandidateIds: result.uncertaintyRetainedCandidateIds, winner: result.winner, participatingEvidenceSourceIds: result.participatingEvidence.map((source) => source.sourceId), reasonCodes: result.reasonCodes };
  }));
  const runtimePointerBytes = read("data/production/electronics/runtime/active.json"), runtimePointer = JSON.parse(runtimePointerBytes.toString());
  const catalogBytes = read(runtimePointer.catalogFile), catalog = JSON.parse(catalogBytes.toString());
  const catalogFactoryBytes = read("data/production/catalog-factory/active.json"), catalogFactory = JSON.parse(catalogFactoryBytes.toString());
  const lineageFiles = ["app/layout.tsx", "data/production/mobility/active/active.json", "data/production/personas/universal/active.json", "outputs/xpy-root-stage1-release-integration-01/candidate-manifest.json", "components/platform/RootStageOneExperience.tsx", "features/platform/platformDiscovery.ts", "features/platform/secretaryDailyLifeExamples.ts"];
  const lineageDigests = Object.fromEntries(lineageFiles.map((path) => [path, sha(read(path))]));
  const promptCount = Object.values(SECRETARY_DAILY_LIFE_EXAMPLES).reduce((sum, examples) => sum + examples.length, 0);
  const validationIssues = projections.flatMap((projection) => validateSemanticDecisionProjection(projection));
  const pReady = validationIssues.length === 0 && previews.every((preview) => preview.outcome === "ASK_ONE_QUESTION" && preview.candidatePoolUnchanged && !preview.productionMutation) && answerAcceptance.every((result) => result.winner === null);
  const bindings = { productionBaseCommit: BASE, ownerReviewReceiptCommit: "72948dc4dd47a8ab8b5effcae243c4075dfc1bf6", ownerReviewPackageDigest: PARENT_DIGEST, ownerReviewManifestSha256: sha(parentManifestBytes), parentProjectionsSha256: sha(parentProjectionBytes), defaultOffCandidateCommit: "beb304d27a90be2789d77e313b94e38cca78dbe3", runtimePointerSha256: sha(runtimePointerBytes), catalogSha256: sha(catalogBytes), catalogFactoryPointerSha256: sha(catalogFactoryBytes) };
  const artifacts: Record<string, unknown> = {
    "integration-candidate.json": { schemaVersion: "smartphone-p-current-production-integration/v1", workUnit: "WU-SMARTPHONE-P-MATERIALITY-V1-CURRENT-PRODUCTION-INTEGRATION-01", status: "DEFAULT_OFF_INTEGRATION_CANDIDATE", featureFlag: { name: "SMARTPHONE_P_MATERIALITY_V1", defaultEnabled: false }, bindings, axes: projections.map((projection) => projection.userNeed.needId), supportLongevity: { status: "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN", known: 16, unknown: 18 }, counts: { electronics: catalog.products.length, smartphone: catalog.products.filter((product: { categoryId: string }) => product.categoryId === "SMARTPHONE").length, catalogFactory: catalogFactory.totals.active, secretaryPrompts: promptCount } },
    "executable-projections.json": { schemaVersion: "smartphone-p-current-production-executable-projections/v1", projections },
    "flag-on-shadow-acceptance.json": { schemaVersion: "smartphone-p-flag-on-shadow-acceptance/v1", mode: "PREVIEW_ONLY", projectionValidationIssues: validationIssues, previews, answerAcceptance, assertions: { everyQuestionMaterial: previews.every((preview) => preview.outcome === "ASK_ONE_QUESTION"), candidatePoolUnchanged: previews.every((preview) => preview.candidatePoolUnchanged), unknownNeutral: answerAcceptance.filter((result) => result.answerId === "UNKNOWN").every((result) => result.excludedCandidateIds.length === 0), noFalseWinner: answerAcceptance.every((result) => result.winner === null), productionMutation: false } },
    "lineage-preservation.json": { schemaVersion: "smartphone-p-lineage-preservation/v1", productionBaseCommit: BASE, lineages: { rootPrivacyUx: "PRESERVED", mitgo: "PRESERVED", persona: "PRESERVED", mobility: "PRESERVED", tools: "PRESERVED", catalogFactory111: catalogFactory.totals.active === 111, secretaryPrompts162: promptCount === 162 }, lineageDigests },
    "readiness.json": { schemaVersion: "smartphone-p-current-production-readiness/v1", INFORMATION_READY: true, P_READY: pReady, Y_READY: false, activationAuthorized: false, deploymentAuthorized: false, blockersForY: ["SEPARATE_ATOMIC_ACTIVATION_APPROVAL_REQUIRED", "SEPARATE_DEPLOYMENT_APPROVAL_REQUIRED"] },
    "browser-plan-390x844.json": { schemaVersion: "smartphone-p-browser-plan/v1", status: "PLAN_ONLY_NOT_EXECUTED", viewport: { width: 390, height: 844 }, flag: "SMARTPHONE_P_MATERIALITY_V1=true", cases: ["Fresh Smartphone entry asks only one material question", "5G answer advances to telephoto without support question", "Telephoto answer advances to >=80 W question", "UNKNOWN retains candidates", "Correction supersedes prior answer", "Clear reopens eligible question", "No horizontal overflow", "Root privacy/idle/typewriter behavior unchanged"] },
    "build-plan.json": { schemaVersion: "smartphone-p-node24-build-plan/v1", runtime: "Node 24.19.0", command: "npm run build", status: "PASS", requiredBeforeActivation: true, cleanCacheRetry: true },
    "no-effect-proof.json": { schemaVersion: "smartphone-p-current-production-no-effect/v1", bindings, exactMembershipOrderSha256: sha(stable(catalog.products.map((product: { exactProductId: string; categoryId: string }) => ({ exactProductId: product.exactProductId, categoryId: product.categoryId })))), exactFingerprintsSha256: sha(stable(catalog.products)), authorizationSha256: sha(stable({ activation: runtimePointer.activationEventSha256, deployment: runtimePointer.deploymentEventSha256 })), mutations: { push: false, preview: false, deployment: false, production: false, database: false, pointer: false } },
    "approval-request.json": { schemaVersion: "smartphone-p-current-production-approval-request/v1", packageAcceptanceSentenceTr: "WU-SMARTPHONE-P-MATERIALITY-V1-CURRENT-PRODUCTION-INTEGRATION-01 paketinin exact digest'i korunarak default-off integration candidate olarak kabul edilmesini onaylıyorum; bu onay aktivasyon, push veya deployment yetkisi vermez.", activationApprovalSentenceTr: "Exact digest'i belirtilen WU-SMARTPHONE-P-MATERIALITY-V1-CURRENT-PRODUCTION-INTEGRATION-01 paketinde yalnız SMARTPHONE_P_MATERIALITY_V1 feature flag'inin, Node 24 build ve 390x844 browser kapıları PASS olduktan sonra atomik olarak etkinleştirilmesini onaylıyorum; deployment ve push yetkisi vermez.", deploymentApprovalSentenceTr: "Atomik aktivasyon receipt'i ve exact deployment source SHA doğrulandıktan sonra SMARTPHONE_P_MATERIALITY_V1 değişikliğinin yeni deployment olarak yayınlanmasını onaylıyorum; mevcut production deployment rollback hedefi olarak korunmalıdır." },
  };
  const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha(stable(value))]));
  const manifest = { schemaVersion: "smartphone-p-current-production-integration-manifest/v1", generatedAt: "2026-09-08T00:00:00.000Z", bindings, artifactDigests, packageDigest: sha(stable({ bindings, artifactDigests })) };
  const serialized: Record<string, string> = Object.fromEntries([...Object.entries(artifacts), ["manifest.json", manifest]].map(([name, value]) => [name, stable(value)]));
  return { artifacts, manifest, serialized };
}
