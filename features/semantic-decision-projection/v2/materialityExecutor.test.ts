import { describe, expect, it } from "vitest";
import { buildRepresentativeQuestionFixtures, buildSmartphoneProjectionFixtures } from "./fixtures";
import { simulateAcceptedAnswer } from "./invariants";
import { executePMaterialityShadow, type PMaterialityContext, type QuestionAnswerEvent } from "./materialityExecutor";

const contextFor = (projections: readonly ReturnType<typeof buildSmartphoneProjectionFixtures>[number][]): PMaterialityContext => ({
  market: "TR",
  configurationIds: projections.flatMap((projection) => projection.applicability.configurationIds),
  evaluatedAt: "2026-09-07T12:00:00.000Z",
  satisfiedPrerequisiteIds: projections.flatMap((projection) => projection.materialQuestion.prerequisites.map((prerequisite) => prerequisite.prerequisiteId)),
  relevantNeedIds: projections.map((projection) => projection.userNeed.needId),
  questionsAskedThisSession: 0,
  userFatigue: 0,
});
const poolFor = (projection: ReturnType<typeof buildSmartphoneProjectionFixtures>[number]) => projection.offerings.map((offering) => offering.exactOfferingId);

describe("P materiality shadow executor", () => {
  it("admits evidenced soft direction without membership or winner authority", () => {
    const hard = buildRepresentativeQuestionFixtures()[0]!.good;
    const soft = {
      ...hard,
      userNeed: { ...hard.userNeed, decisionUse: "SOFT_PREFERENCE" as const },
      governedComparison: true,
      materialQuestion: {
        ...hard.materialQuestion,
        decisionUseOnExplicitAnswer: "SOFT_PREFERENCE" as const,
        candidateEffectByAnswer: Object.fromEntries(Object.entries(hard.materialQuestion.candidateEffectByAnswer).map(([answer, effects]) => [answer, effects.map((effect) => answer === "YES" && effect.effect === "knownRetain" ? { ...effect, effect: "softOnly" as const } : answer === "YES" && effect.effect === "knownExclude" ? { ...effect, effect: "none" as const, exactKnownMismatch: false } : effect)])),
      },
    };
    const candidatePool = poolFor(soft);
    expect(executePMaterialityShadow({ candidatePool, currentContext: contextFor([soft]), projections: [soft] }).outcome).toBe("ASK_ONE_QUESTION");
    const simulation = simulateAcceptedAnswer({ projection: soft, answerId: "YES", candidatePool, context: { explicitRequirementQuestionIds: [], evaluatedAt: "2026-09-07T12:00:00.000Z" } });
    expect(simulation.excludedCandidateIds).toEqual([]);
    expect(simulation.softCandidateIds.length).toBeGreaterThan(0);
    expect(simulation.winner).toBeNull();
  });
  it("suppresses zero-effect questions and never equates no material question with sufficiency", () => {
    const bad = buildRepresentativeQuestionFixtures()[0]!.bad;
    const result = executePMaterialityShadow({ candidatePool: poolFor(bad), currentContext: contextFor([bad]), projections: [bad] });
    expect(result).toMatchObject({ outcome: "NO_MATERIAL_QUESTION", outcomeMeaning: "NO_ELIGIBLE_MATERIAL_QUESTION_NOT_SUFFICIENT", sufficiency: "NOT_EVALUATED", selectedQuestion: null });
    expect(result.trace.evaluations[0]).toMatchObject({ eligible: false, suppressionReasons: expect.arrayContaining(["ZERO_CANDIDATE_EFFECT"]) });
  });

  it("requires two known partitions and suppresses predominantly unknown duration evidence", () => {
    const projections = buildSmartphoneProjectionFixtures();
    const result = executePMaterialityShadow({ candidatePool: poolFor(projections[0]!), currentContext: contextFor(projections), projections });
    expect(result.outcome).toBe("ASK_ONE_QUESTION");
    expect(result.selectedQuestion).not.toBeNull();
    expect(result.trace.maxQuestions).toBe(1);
    const support = result.trace.evaluations.find((evaluation) => evaluation.questionId === "shadow.smartphone.support-duration")!;
    expect(support.knownCandidateCount).toBe(16);
    expect(support.unknownCandidateCount).toBe(18);
    expect(Object.keys(support.knownPartitions)).toEqual(["BELOW_SEVEN_YEARS", "SEVEN_YEARS"]);
    expect(support.suppressionReasons).toContain("SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN");
  });

  it("keeps UNKNOWN neutral and permits hard exclusion only for explicit exact known mismatch", () => {
    const projection = buildRepresentativeQuestionFixtures()[0]!.good;
    const candidatePool = poolFor(projection);
    const withoutExplicit = simulateAcceptedAnswer({ projection, answerId: "YES", candidatePool, context: { explicitRequirementQuestionIds: [], evaluatedAt: "2026-09-07T12:00:00.000Z" } });
    expect(withoutExplicit.excludedCandidateIds).toEqual([]);
    expect(withoutExplicit.retainedCandidateIds).toEqual([...candidatePool].sort());
    const explicit = simulateAcceptedAnswer({ projection, answerId: "YES", candidatePool, context: { explicitRequirementQuestionIds: [projection.materialQuestion.questionId], evaluatedAt: "2026-09-07T12:00:00.000Z" } });
    expect(explicit.excludedCandidateIds).toEqual([candidatePool[1]]);
    expect(explicit.uncertaintyRetainedCandidateIds).toEqual([candidatePool[2]]);
    expect(explicit.retainedCandidateIds).toContain(candidatePool[2]);
    expect(explicit.winner).toBeNull();
  });

  it("suppresses answered, corrected, and superseded questions while clear reopens them", () => {
    const projection = buildRepresentativeQuestionFixtures()[1]!.good;
    const base = { candidatePool: poolFor(projection), currentContext: contextFor([projection]), projections: [projection] };
    const event = (operation: QuestionAnswerEvent["operation"], sequence: number, answerId?: string, supersedesEventId?: string): QuestionAnswerEvent => ({ eventId: `event-${sequence}`, questionId: projection.materialQuestion.questionId, operation, sequence, ...(answerId ? { answerId } : {}), ...(supersedesEventId ? { supersedesEventId } : {}) });
    expect(executePMaterialityShadow({ ...base, answerLedger: [event("ANSWER", 1, "YES")] }).outcome).toBe("NO_MATERIAL_QUESTION");
    expect(executePMaterialityShadow({ ...base, answerLedger: [event("ANSWER", 1, "YES"), event("CORRECT", 2, "NO", "event-1")] }).trace.activeAnswers[0]).toMatchObject({ answerId: "NO", operation: "CORRECT" });
    expect(executePMaterialityShadow({ ...base, answerLedger: [event("ANSWER", 1, "YES"), event("SUPERSEDE", 2, "UNKNOWN", "event-1")] }).trace.activeAnswers[0]).toMatchObject({ answerId: "UNKNOWN", operation: "SUPERSEDE" });
    const cleared = executePMaterialityShadow({ ...base, answerLedger: [event("ANSWER", 1, "YES"), event("CLEAR", 2, undefined, "event-1")] });
    expect(cleared.outcome).toBe("ASK_ONE_QUESTION");
    expect(cleared.trace.activeAnswers).toEqual([]);
    expect(cleared.trace.answerHistoryDisposition.map((entry) => entry.disposition)).toEqual(["CLEARED", "CLEARED"]);
  });

  it("is deterministic and catalog-order independent", () => {
    const projections = buildSmartphoneProjectionFixtures();
    const candidatePool = poolFor(projections[0]!);
    const first = executePMaterialityShadow({ candidatePool, currentContext: contextFor(projections), projections });
    const second = executePMaterialityShadow({ candidatePool: [...candidatePool].reverse(), currentContext: contextFor(projections), projections: [...projections].reverse() });
    expect(second).toEqual(first);
    expect(second.traceFingerprint).toBe(first.traceFingerprint);
  });

  it("isolates price behind an explicit fresh exact budget", () => {
    const base = buildRepresentativeQuestionFixtures()[2]!.good;
    const projection = { ...base, technicalPredicate: { ...base.technicalPredicate, field: "price.exactTry", operator: "LTE" as const, value: 40_000 }, priceDecisionPolicy: { requiresExplicitBudget: true as const, requiresFreshExactPrice: true as const, commerceIsolated: true as const, freshThrough: "2026-09-08T00:00:00.000Z" } };
    const candidatePool = poolFor(projection);
    const unauthorized = simulateAcceptedAnswer({ projection, answerId: "YES", candidatePool, context: { explicitRequirementQuestionIds: [projection.materialQuestion.questionId], evaluatedAt: "2026-09-07T12:00:00.000Z" } });
    expect(unauthorized.excludedCandidateIds).toEqual([]);
    expect(unauthorized.reasonCodes).toContain("PRICE_NOT_AUTHORIZED_WITHOUT_EXPLICIT_FRESH_EXACT_BUDGET");
    const authorized = simulateAcceptedAnswer({ projection, answerId: "YES", candidatePool, context: { explicitRequirementQuestionIds: [projection.materialQuestion.questionId], explicitBudgetMaximumTry: 40_000, evaluatedAt: "2026-09-07T12:00:00.000Z" } });
    expect(authorized.excludedCandidateIds).toHaveLength(1);
  });

  it("caps persona at 0.75, never creates a winner, and cites participating evidence only", () => {
    const base = buildRepresentativeQuestionFixtures()[3]!.good;
    const unrelated = { sourceId: "unrelated", authority: "CONTRACT_FIXTURE" as const, digest: `sha256:${"a".repeat(64)}` as const, market: "TR", capturedAt: "2026-09-07T00:00:00.000Z", reliability: 1 };
    const projection = { ...base, sources: [...base.sources, unrelated] };
    const candidatePool = poolFor(projection);
    const result = simulateAcceptedAnswer({ projection, answerId: "YES", candidatePool, context: { explicitRequirementQuestionIds: [projection.materialQuestion.questionId], evaluatedAt: "2026-09-07T12:00:00.000Z", personaScores: { [candidatePool[0]!]: 0.75 } } });
    expect(result.winner).toBeNull();
    expect(result.participatingEvidence.map((source) => source.sourceId)).not.toContain("unrelated");
    expect(() => simulateAcceptedAnswer({ projection, answerId: "YES", candidatePool, context: { explicitRequirementQuestionIds: [projection.materialQuestion.questionId], evaluatedAt: "2026-09-07T12:00:00.000Z", personaScores: { [candidatePool[0]!]: 0.751 } } })).toThrow("PERSONA_SCORE_OUT_OF_BOUNDS");
  });
});
