import { immutableDigest } from "./canonical";
import { CATALOG_FACTORY_GATE_IDS, evaluateCatalogFactoryReadinessV2, type CatalogFactoryGateEvidence } from "./catalogFactoryReadiness";
import { buildRepresentativeQuestionFixtures, buildSmartphoneProjectionFixtures, REFERENCE_RUNTIME_CHARACTERIZATION, SMARTPHONE_SHADOW_PILOT_LINEAGE, SMARTPHONE_SUPPORT_CLOSURE_LINEAGE } from "./fixtures";
import { executePMaterialityShadow, type PMaterialityContext } from "./materialityExecutor";
import { runPMaterialityShadowAdapter } from "./shadowAdapter";

export const FOUNDATION_WORK_UNIT = "WU-XPY-SEMANTIC-DECISION-PROJECTION-V2-FOUNDATION-01" as const;

const lineage = Object.freeze({
  verifiedAt: "2026-09-07T00:00:00.000Z",
  sourceCheckout: Object.freeze({ commit: "f460c9f0e9833d278788289a3b00c62d4ddbb3c4", branchAtStart: "DETACHED_ORIGIN_MAIN", catalogPointer: "data/production/catalog/active.json", carsExactRecords: 549, carsCatalogRelease: "0.55.4" }),
  rootXpyProduction: Object.freeze({ ref: "codex/xpy-root-stage1-release-integration-01", commit: "3d8003149f40da244daf0f9aeb53c3d1f90b0aae", preservation: "READ_ONLY_NO_CHERRY_PICK" }),
  smartphoneV02: Object.freeze({ ref: "origin/codex/smartphone-v02-production-lineage", commit: "2ce640b7c6049cd2e8f69a7a7f933e48c4221d7a", totalElectronics: 121, smartphones: 34, runtimeRelease: "ELECTRONICS-RUNTIME-CATALOG-TR-v1.3-SMARTPHONE-V02-RECONCILED-R2", preservation: "READ_ONLY_NO_CHERRY_PICK" }),
  appliances: Object.freeze({ ref: "codex/appliances-stage2-unified-release-20260906", commit: "0b55b023abc9ab03c1cae1e95e09fcc9ecbaccaf", preservation: "READ_ONLY" }),
  babyStroller: Object.freeze({ ref: "codex/production-source-baseline-20260906", commit: "c2ac9150c43ef503f4a7b736f240454115447e4e", activeRelease: "BABY-STROLLER-TR-v0.2-approval-candidate", preservation: "READ_ONLY" }),
  mobility: Object.freeze({ ref: "codex/mobility-stage1-activation-20260906", commit: "381c4e7e6db109feceb515214bc6bdba26b657df", preservation: "READ_ONLY" }),
  tools: Object.freeze({ ref: "origin/codex/cordless-drill-production-integration-01", commit: "60af35d9521df161ea39cc14d7301893f7886a40", preservation: "READ_ONLY" }),
  universalPersona: Object.freeze({ ref: "codex/xpy-universal-persona-authority-01-20260906", commit: "d03b79d04c5f71108721d63ab5574b5461da47b0", cap: 0.75, preservation: "READ_ONLY" }),
  mitgoMetadata: Object.freeze({ ref: "codex/mitgo-adspace-meta-verification-01", commit: "f1ce8e61f76345aa10a1422bb511d2d9998dd954", preservation: "READ_ONLY" }),
  externalFixtureLineage: Object.freeze({ smartphoneShadowPilot: SMARTPHONE_SHADOW_PILOT_LINEAGE, smartphoneSupportClosure: SMARTPHONE_SUPPORT_CLOSURE_LINEAGE }),
  lineageGaps: Object.freeze([
    "Smartphone P-materiality and support-closure artifact directories are absent from the source checkout; only pinned commit/digest contract fixtures are used.",
    "The preceding daily-life-semantics analysis has no repository artifact or immutable digest in the supplied checkout; its approved causal chain is represented as a contract requirement, not claimed as imported evidence.",
    "Root XPY, Appliances, Electronics, Baby, Mobility, Tools and Catalog Factory live on separate source refs and are not copied or activated here.",
  ]),
});

function contextFor(projections: readonly ReturnType<typeof buildSmartphoneProjectionFixtures>[number][]): PMaterialityContext {
  return Object.freeze({
    market: "TR",
    configurationIds: Object.freeze(projections.flatMap((projection) => projection.applicability.configurationIds)),
    evaluatedAt: "2026-09-07T12:00:00.000Z",
    satisfiedPrerequisiteIds: Object.freeze(projections.flatMap((projection) => projection.materialQuestion.prerequisites.map((prerequisite) => prerequisite.prerequisiteId))),
    relevantNeedIds: Object.freeze(projections.map((projection) => projection.userNeed.needId)),
    questionsAskedThisSession: 0,
    userFatigue: 0,
  });
}
function exact14Readiness() {
  const pass = (gateId: CatalogFactoryGateEvidence["gateId"], evidenceKind: CatalogFactoryGateEvidence["evidenceKind"], reason: string, ...evidenceRefs: string[]): CatalogFactoryGateEvidence => ({ gateId, status: "PASS", evidenceKind, evidenceRefs, reason });
  const gates: CatalogFactoryGateEvidence[] = [
    pass("identity-exact", "IMMUTABLE_ARTIFACT", "Exact-14 identity supersession is bound by the source branch release chain.", "origin/codex/exact14-unified-runtime-preview:features/catalog-factory/runtime/effectiveCatalog.server.ts"),
    pass("primary-evidence-applicability", "IMMUTABLE_ARTIFACT", "Exact-14 information view requires exact TR facts and rejects superseded identity authority.", "origin/codex/exact14-unified-runtime-preview@bc812eea26780b8c559d3209a5dc8055a932ea55"),
    pass("decision-field-coverage", "IMMUTABLE_ARTIFACT", "Information fields are materialized; this does not establish P or Y readiness.", "CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01"),
    { gateId: "semantic-causal-lineage", status: "FAIL", evidenceKind: "IMMUTABLE_ARTIFACT", evidenceRefs: [], reason: "No exact-14 Technical Fact → Daily-Life Consequence → User Need → Material Question → Candidate Effect → Honest Outcome chain is materialized in this checkout." },
    { gateId: "exact-projection-materialization", status: "FAIL", evidenceKind: "IMMUTABLE_ARTIFACT", evidenceRefs: [], reason: "The exact-14 source consumer explicitly reports P_READY false and an empty candidateEffectByAnswer." },
    { gateId: "candidate-effect-completeness", status: "FAIL", evidenceKind: "EXECUTABLE_TEST", evidenceRefs: ["origin/codex/exact14-unified-runtime-preview:features/catalog-factory/runtime/effectiveCatalog.test.ts"], reason: "No two-known-partition candidate effect matrix exists for exact-14." },
    pass("P-zero-effect-suppression", "EXECUTABLE_TEST", "Foundation executor suppresses questions with no candidate membership effect.", "features/semantic-decision-projection/v2/materialityExecutor.test.ts"),
    pass("unknown-conflict-neutrality", "EXECUTABLE_TEST", "UNKNOWN and CONFLICTED never become false, exclusion, advantage, or winner.", "features/semantic-decision-projection/v2/foundation.test.ts"),
    pass("no-false-single-winner", "EXECUTABLE_TEST", "Simulation and no-effect adapter expose winner only as null.", "features/semantic-decision-projection/v2/foundation.test.ts"),
    pass("price-commerce-isolation", "EXECUTABLE_TEST", "Price is disabled without explicit fresh exact budget authority and stays outside technical semantics.", "features/semantic-decision-projection/v2/foundation.test.ts"),
    pass("persona-or-neutral", "EXECUTABLE_TEST", "Persona is capped at 0.75 with no membership, sufficiency, or single-winner effect.", "features/semantic-decision-projection/v2/foundation.test.ts"),
    pass("public-language", "EXECUTABLE_TEST", "Representative material questions are public Turkish and contextual.", "features/semantic-decision-projection/v2/fixtures.test.ts"),
    pass("runtime-fixtures", "EXECUTABLE_TEST", "Synthetic fixtures cover eight categories plus Smartphone lineage-bound fixtures.", "features/semantic-decision-projection/v2/fixtures.test.ts"),
    pass("pointer-manifest-approval-consistency", "IMMUTABLE_ARTIFACT", "Existing exact-14 catalog pointer chain is read-only and unchanged; no SDP-v2 pointer is proposed.", "origin/codex/exact14-unified-runtime-preview@bc812eea26780b8c559d3209a5dc8055a932ea55"),
    { gateId: "owner-approval", status: "PENDING", evidenceKind: "SIGNED_APPROVAL", evidenceRefs: [], reason: "No owner approval exists for exact-14 SemanticDecisionProjection/v2 P or Y participation." },
  ];
  if (gates.length !== CATALOG_FACTORY_GATE_IDS.length) throw new Error("READINESS_GATE_FIXTURE_INCOMPLETE");
  return evaluateCatalogFactoryReadinessV2({ subjectId: "CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01", evaluationScope: "PRODUCTION_EXACT_CATALOG", gates, declarativeCapabilityRecordsObserved: 16 });
}

export function buildSemanticDecisionProjectionV2Artifacts(): {
  readonly artifacts: Readonly<Record<string, unknown>>;
  readonly manifest: Readonly<Record<string, unknown>>;
  readonly serialized: Readonly<Record<string, string>>;
} {
  const smartphone = buildSmartphoneProjectionFixtures();
  const representative = buildRepresentativeQuestionFixtures();
  const smartphoneContext = contextFor(smartphone);
  const smartphoneCandidates = smartphone[0]!.offerings.map((offering) => offering.exactOfferingId);
  const smartphoneShadow = executePMaterialityShadow({ candidatePool: smartphoneCandidates, currentContext: smartphoneContext, projections: smartphone });
  const representativeTraces = representative.map((fixture) => {
    const projections = [fixture.good, fixture.bad];
    const context = contextFor(projections);
    const candidatePool = fixture.good.offerings.map((offering) => offering.exactOfferingId);
    return Object.freeze({ categoryId: fixture.categoryId, classification: fixture.classification, result: executePMaterialityShadow({ candidatePool, currentContext: context, projections }) });
  });
  const productionFixture = Object.freeze({
    candidateIds: smartphoneCandidates,
    candidateOrder: smartphoneCandidates,
    card: Object.freeze({ status: "EXTERNAL_RUNTIME_CARD_NOT_IMPORTED", fixture: true }),
    authorization: Object.freeze({ status: "EXTERNAL_AUTHORIZATION_NOT_IMPORTED", fixture: true }),
    activePointer: Object.freeze({ status: "PINNED_EXTERNAL_LINEAGE_ONLY", commit: SMARTPHONE_SHADOW_PILOT_LINEAGE.commit, digest: SMARTPHONE_SHADOW_PILOT_LINEAGE.digest }),
  });
  const adapter = runPMaterialityShadowAdapter({ production: productionFixture, currentContext: smartphoneContext, projections: smartphone });
  const artifacts: Record<string, unknown> = {
    "lineage.json": { schemaVersion: "semantic-decision-projection-lineage/v2", workUnit: FOUNDATION_WORK_UNIT, ...lineage },
    "contract-fixtures.json": { schemaVersion: "semantic-decision-projection-fixtures/v2", classification: "CONTRACT_FIXTURES_NOT_PRODUCTION_FACTS", smartphone, representative },
    "p-materiality-trace.json": { schemaVersion: "p-materiality-shadow-acceptance/v2", smartphone: smartphoneShadow, representative: representativeTraces },
    "current-vs-shadow.json": { schemaVersion: "current-vs-shadow/v2", current: { execution: "NOT_EXECUTED_EXTERNAL_LINEAGE_GAP", behaviorCharacterization: REFERENCE_RUNTIME_CHARACTERIZATION, productionMutation: false }, shadow: { execution: "CONTRACT_FIXTURE_ONLY", traceFingerprint: smartphoneShadow.traceFingerprint, selectedQuestionId: smartphoneShadow.trace.selectedQuestionId, supportDuration: smartphoneShadow.trace.evaluations.find((evaluation) => evaluation.questionId === "shadow.smartphone.support-duration"), outcome: smartphoneShadow.outcome }, comparisonLimit: "No equivalence or rollout claim is made because the current Electronics runtime artifacts are absent from this checkout." },
    "catalog-factory-readiness-v2.json": exact14Readiness(),
    "shadow-no-effect-proof.json": adapter.noEffectProof,
    "integration-plan.json": { schemaVersion: "semantic-decision-projection-integration-plan/v2", mode: "NO_INTEGRATION_EXECUTED", boundaries: [{ consumer: "Cars", seam: "post-candidate-evaluation/pre-question-selection trace adapter", behaviorChange: "NONE" }, { consumer: "Washing Machine", seam: "post-evaluation/planner observation before sufficiency", behaviorChange: "NONE" }, { consumer: "Electronics", seam: "policy questionPlan plus exact facts mirrored into shadow", behaviorChange: "NONE" }, { consumer: "Catalog Factory exact-14", seam: "map EffectiveCatalogProduct exact identities into projections only after executable P evidence exists", behaviorChange: "NONE" }], concurrentBranches: [{ ref: "origin/codex/exact14-unified-runtime-preview", commit: "bc812eea26780b8c559d3209a5dc8055a932ea55", action: "DO_NOT_CHERRY_PICK_OR_OVERWRITE" }, { ref: "codex/xpy-root-stage1-ux-revision-01", commit: "bc86ee5d37540e94236303bb8a0704f46509fd52", action: "DO_NOT_CHERRY_PICK_OR_OVERWRITE" }], expectedFileOverlap: [], nextBoundedPilot: "Materialize SemanticDecisionProjection/v2 for one exact-14 category with at least two exact known partitions, keep UNKNOWN neutral, run the shadow adapter for a bounded replay corpus, and seek owner approval only after INFORMATION_READY and P_READY pass independently." },
  };
  const artifactDigests = Object.freeze(Object.fromEntries(Object.entries(artifacts).sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) => [name, immutableDigest(value)])));
  const manifest = Object.freeze({
    schemaVersion: "semantic-decision-projection-foundation-manifest/v2",
    workUnit: FOUNDATION_WORK_UNIT,
    generatedAt: "2026-09-07T00:00:00.000Z",
    mode: "SHADOW_ONLY",
    artifactDigests,
    lineageBindings: Object.freeze({ smartphoneShadowPilot: SMARTPHONE_SHADOW_PILOT_LINEAGE, smartphoneSupportClosure: SMARTPHONE_SUPPORT_CLOSURE_LINEAGE }),
    forbiddenMutations: Object.freeze(["ACTIVE_POINTER", "PRODUCTION_RUNTIME", "CATALOG_MEMBERSHIP", "CATALOG_ORDER", "DATABASE", "UI_OR_CARD", "AUTHORIZATION", "DEPLOYMENT", "PUSH"]),
    releaseDigest: immutableDigest({ workUnit: FOUNDATION_WORK_UNIT, artifactDigests, lineageBindings: { smartphoneShadowPilot: SMARTPHONE_SHADOW_PILOT_LINEAGE, smartphoneSupportClosure: SMARTPHONE_SUPPORT_CLOSURE_LINEAGE } }),
  });
  const serialized = Object.freeze(Object.fromEntries([...Object.entries(artifacts), ["manifest.json", manifest]].map(([name, value]) => [name, `${JSON.stringify(value, null, 2)}\n`])));
  return Object.freeze({ artifacts: Object.freeze(artifacts), manifest, serialized });
}
