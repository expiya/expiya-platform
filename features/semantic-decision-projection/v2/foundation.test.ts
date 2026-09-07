import { describe, expect, it } from "vitest";
import { CATALOG_FACTORY_GATE_IDS, evaluateCatalogFactoryReadinessV2, type CatalogFactoryGateEvidence } from "./catalogFactoryReadiness";
import { buildRepresentativeQuestionFixtures } from "./fixtures";
import { resolveProjectionInheritance, type InheritanceAssertion } from "./inheritance";
import { validateSemanticDecisionProjection } from "./invariants";
import { runPMaterialityShadowAdapter } from "./shadowAdapter";

const fixture = buildRepresentativeQuestionFixtures()[0]!.good;
const target = fixture.offerings[0]!;
const context = {
  market: "TR",
  configurationIds: fixture.applicability.configurationIds,
  evaluatedAt: "2026-09-07T12:00:00.000Z",
  satisfiedPrerequisiteIds: fixture.materialQuestion.prerequisites.map((item) => item.prerequisiteId),
  relevantNeedIds: [fixture.userNeed.needId],
  questionsAskedThisSession: 0,
  userFatigue: 0,
};

describe("SemanticDecisionProjection/v2 foundation invariants", () => {
  it("accepts the typed causal chain and rejects non-exact hard mismatch or mutating QUESTION_INPUT", () => {
    expect(validateSemanticDecisionProjection(fixture)).toEqual([]);
    const effects = fixture.materialQuestion.candidateEffectByAnswer.YES;
    const brokenMismatch = { ...fixture, materialQuestion: { ...fixture.materialQuestion, candidateEffectByAnswer: { ...fixture.materialQuestion.candidateEffectByAnswer, YES: effects.map((effect) => effect.effect === "knownExclude" ? { ...effect, exactKnownMismatch: false } : effect) } } };
    expect(validateSemanticDecisionProjection(brokenMismatch).map((issue) => issue.code)).toContain("EXCLUSION_REQUIRES_EXACT_KNOWN_MISMATCH");
    const mutatingQuestionInput = { ...fixture, userNeed: { ...fixture.userNeed, decisionUse: "QUESTION_INPUT" as const } };
    expect(validateSemanticDecisionProjection(mutatingQuestionInput).map((issue) => issue.code)).toContain("NON_MUTATING_DECISION_USE_HAS_EXCLUSION");
  });

  it("allows CLASS only for vocabulary/template/explanation and requires a bridge for FAMILY/MODEL", () => {
    const classAssertion: InheritanceAssertion = { assertionId: "class", factId: "weight", scope: "CLASS", scopeIdentityId: target.classId!, market: "TR", value: "portable-device", uncertainty: "KNOWN", explicitlyAppliesToExactOfferingIds: [] };
    expect(resolveProjectionInheritance({ target, factId: "weight", purpose: "EXPLANATION", assertions: [classAssertion] })).toMatchObject({ status: "EXPLANATION_TEMPLATE_ONLY", decisionAuthority: "NONE" });
    expect(resolveProjectionInheritance({ target, factId: "weight", purpose: "TECHNICAL_DECISION", assertions: [classAssertion] })).toMatchObject({ status: "UNKNOWN", decisionAuthority: "NONE", reasonCodes: expect.arrayContaining(["CLASS_ONLY_VOCABULARY_TEMPLATE_EXPLANATION"]) });
    const family: InheritanceAssertion = { assertionId: "family", factId: "weight", scope: "FAMILY", scopeIdentityId: target.familyId!, market: "TR", value: 1.4, uncertainty: "KNOWN", explicitlyAppliesToExactOfferingIds: [target.exactOfferingId] };
    expect(resolveProjectionInheritance({ target, factId: "weight", purpose: "TECHNICAL_DECISION", assertions: [family] }).reasonCodes).toContain("VERIFIED_IDENTITY_BRIDGE_MISSING");
    const bridged = { ...family, identityBridge: { bridgeId: "bridge", exactOfferingId: target.exactOfferingId, verified: true } };
    expect(resolveProjectionInheritance({ target, factId: "weight", purpose: "TECHNICAL_DECISION", assertions: [bridged] })).toMatchObject({ status: "RESOLVED", decisionAuthority: "NONE", value: 1.4 });
  });

  it("lets a more specific conflict block parent inheritance and rejects foreign-market exact truth", () => {
    const family: InheritanceAssertion = { assertionId: "family", factId: "weight", scope: "FAMILY", scopeIdentityId: target.familyId!, market: "TR", value: 1.4, uncertainty: "KNOWN", explicitlyAppliesToExactOfferingIds: [target.exactOfferingId], identityBridge: { bridgeId: "bridge", exactOfferingId: target.exactOfferingId, verified: true } };
    const conflict: InheritanceAssertion = { assertionId: "variant-conflict", factId: "weight", scope: "VARIANT", scopeIdentityId: target.variantId!, market: "TR", value: 1.6, uncertainty: "CONFLICTED", explicitlyAppliesToExactOfferingIds: [target.exactOfferingId] };
    expect(resolveProjectionInheritance({ target, factId: "weight", purpose: "Y_FINAL", assertions: [family, conflict] })).toMatchObject({ status: "BLOCKED_BY_CONFLICT", blockedAssertionIds: ["family"], decisionAuthority: "NONE" });
    const foreign: InheritanceAssertion = { assertionId: "foreign", factId: "weight", scope: "EXACT_OFFERING", scopeIdentityId: target.exactOfferingId, market: "DE", value: 1.2, uncertainty: "KNOWN", explicitlyAppliesToExactOfferingIds: [target.exactOfferingId] };
    expect(resolveProjectionInheritance({ target, factId: "weight", purpose: "TECHNICAL_DECISION", assertions: [foreign] })).toMatchObject({ status: "UNKNOWN", reasonCodes: expect.arrayContaining(["FOREIGN_MARKET_NOT_TARGET_TECHNICAL_TRUTH"]) });
  });

  it("separates INFORMATION, P, and Y readiness and never accepts 16 declarations as executable evidence", () => {
    const gates: CatalogFactoryGateEvidence[] = CATALOG_FACTORY_GATE_IDS.map((gateId) => ({ gateId, status: "PASS", evidenceKind: gateId === "owner-approval" ? "SIGNED_APPROVAL" : "EXECUTABLE_TEST", evidenceRefs: ["fixture"], reason: "fixture" }));
    const ready = evaluateCatalogFactoryReadinessV2({ subjectId: "fixture", evaluationScope: "SYNTHETIC_CONTRACT_FIXTURES", gates, declarativeCapabilityRecordsObserved: 16 });
    expect(ready.levels).toMatchObject({ INFORMATION_READY: { ready: true }, P_READY: { ready: true }, Y_READY: { ready: true } });
    expect(ready.declarativeCapabilityRecordsAcceptedAsExecutableEvidence).toBe(false);
    const declarationsOnly = evaluateCatalogFactoryReadinessV2({ subjectId: "declarative", evaluationScope: "PRODUCTION_EXACT_CATALOG", gates: gates.map((gate) => ({ ...gate, evidenceKind: "DECLARATIVE_RECORD" })), declarativeCapabilityRecordsObserved: 16 });
    expect(declarationsOnly.levels.INFORMATION_READY.ready).toBe(false);
    expect(declarationsOnly.levels.P_READY.ready).toBe(false);
    expect(declarationsOnly.levels.Y_READY.ready).toBe(false);
  });

  it("runs through an adapter without membership, order, card, authorization, pointer, DB, or UI effect", () => {
    const production = Object.freeze({ candidateIds: Object.freeze(fixture.offerings.map((offering) => offering.exactOfferingId)), candidateOrder: Object.freeze(fixture.offerings.map((offering) => offering.exactOfferingId).reverse()), card: Object.freeze({ id: "card" }), authorization: Object.freeze({ id: "auth" }), activePointer: Object.freeze({ id: "pointer" }) });
    const result = runPMaterialityShadowAdapter({ production, currentContext: context, projections: [fixture] });
    expect(result.production).toBe(production);
    expect(result.noEffectProof.before).toEqual(result.noEffectProof.after);
    expect(Object.values(result.noEffectProof.assertions).every(Boolean)).toBe(true);
  });
});
