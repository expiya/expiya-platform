import { immutableDigest } from "./canonical";
import type { CandidateEffect, SemanticDecisionProjectionV2 } from "./contract";
import { validateSemanticDecisionProjection } from "./invariants";

export type QuestionAnswerOperation = "ANSWER" | "CORRECT" | "CLEAR" | "SUPERSEDE";

export interface QuestionAnswerEvent {
  readonly eventId: string;
  readonly questionId: string;
  readonly operation: QuestionAnswerOperation;
  readonly sequence: number;
  readonly answerId?: string;
  readonly supersedesEventId?: string;
}
export interface ActiveQuestionAnswer {
  readonly eventId: string;
  readonly questionId: string;
  readonly answerId: string;
  readonly operation: Exclude<QuestionAnswerOperation, "CLEAR">;
  readonly sequence: number;
}

export interface PMaterialityContext {
  readonly market: string;
  readonly configurationIds: readonly string[];
  readonly evaluatedAt: string;
  readonly satisfiedPrerequisiteIds: readonly string[];
  readonly relevantNeedIds: readonly string[];
  readonly questionsAskedThisSession: number;
  readonly userFatigue: number;
  readonly questionSignals?: Readonly<Record<string, {
    readonly answerability: number;
    readonly contextualRelevance: number;
  }>>;
}

export interface PMaterialityEvaluation {
  readonly projectionId: string;
  readonly questionId: string;
  readonly eligible: boolean;
  readonly suppressionReasons: readonly string[];
  readonly knownPartitions: Readonly<Record<string, readonly string[]>>;
  readonly knownCandidateCount: number;
  readonly unknownCandidateCount: number;
  readonly expectedKnownReduction: number;
  readonly decisionChangeProbability: number;
  readonly evidenceReliability: number;
  readonly answerability: number;
  readonly contextualRelevance: number;
  readonly novelty: number;
  readonly unknownPenalty: number;
  readonly fatiguePenalty: number;
  readonly score: number;
  readonly participatingEvidenceRefs: readonly string[];
}

export interface PMaterialityTrace {
  readonly schemaVersion: "p-materiality-shadow-trace/v2";
  readonly mode: "SHADOW_ONLY";
  readonly candidatePool: readonly string[];
  readonly activeAnswers: readonly ActiveQuestionAnswer[];
  readonly answerHistoryDisposition: readonly {
    readonly eventId: string;
    readonly questionId: string;
    readonly operation: QuestionAnswerOperation;
    readonly disposition: "ACTIVE" | "CLEARED" | "SUPERSEDED";
  }[];
  readonly evaluations: readonly PMaterialityEvaluation[];
  readonly selectedQuestionId: string | null;
  readonly maxQuestions: 1;
}

export interface PMaterialityShadowResult {
  readonly outcome: "ASK_ONE_QUESTION" | "NO_MATERIAL_QUESTION";
  readonly outcomeMeaning: "QUESTION_SELECTED_WITHOUT_CONTEXT_MUTATION" | "NO_ELIGIBLE_MATERIAL_QUESTION_NOT_SUFFICIENT";
  readonly sufficiency: "NOT_EVALUATED";
  readonly selectedQuestion: SemanticDecisionProjectionV2["materialQuestion"] | null;
  readonly selectedProjectionId: string | null;
  readonly candidatePoolUnchanged: true;
  readonly productionMutation: false;
  readonly trace: PMaterialityTrace;
  readonly traceFingerprint: `sha256:${string}`;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Number(value.toFixed(6));

export function projectActiveQuestionAnswers(events: readonly QuestionAnswerEvent[]): {
  readonly active: readonly ActiveQuestionAnswer[];
  readonly dispositions: PMaterialityTrace["answerHistoryDisposition"];
} {
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence || left.eventId.localeCompare(right.eventId));
  const active = new Map<string, ActiveQuestionAnswer>();
  const disposition = new Map<string, "ACTIVE" | "CLEARED" | "SUPERSEDED">();
  for (const event of ordered) {
    const prior = active.get(event.questionId);
    if (prior) disposition.set(prior.eventId, event.operation === "CLEAR" ? "CLEARED" : "SUPERSEDED");
    if (event.supersedesEventId) disposition.set(event.supersedesEventId, event.operation === "CLEAR" ? "CLEARED" : "SUPERSEDED");
    if (event.operation === "CLEAR") {
      active.delete(event.questionId);
      disposition.set(event.eventId, "CLEARED");
      continue;
    }
    if (!event.answerId) throw new Error(`ANSWER_ID_REQUIRED:${event.eventId}`);
    const next: ActiveQuestionAnswer = { eventId: event.eventId, questionId: event.questionId, answerId: event.answerId, operation: event.operation, sequence: event.sequence };
    active.set(event.questionId, next);
    disposition.set(event.eventId, "ACTIVE");
  }
  const activeEvents = [...active.values()].sort((left, right) => left.questionId.localeCompare(right.questionId));
  const dispositions = ordered.map((event) => ({ eventId: event.eventId, questionId: event.questionId, operation: event.operation, disposition: disposition.get(event.eventId) ?? "SUPERSEDED" }));
  return Object.freeze({ active: Object.freeze(activeEvents), dispositions: Object.freeze(dispositions) });
}

function uniqueCandidateStates(projection: SemanticDecisionProjectionV2, candidatePool: ReadonlySet<string>): readonly CandidateEffect[] {
  const byCandidate = new Map<string, CandidateEffect>();
  for (const answer of projection.materialQuestion.answerDomain) {
    for (const effect of projection.materialQuestion.candidateEffectByAnswer[answer.answerId] ?? []) {
      if (candidatePool.has(effect.exactOfferingId) && !byCandidate.has(effect.exactOfferingId)) byCandidate.set(effect.exactOfferingId, effect);
    }
  }
  return [...byCandidate.values()].sort((left, right) => left.exactOfferingId.localeCompare(right.exactOfferingId));
}

function projectionIsApplicable(projection: SemanticDecisionProjectionV2, context: PMaterialityContext): boolean {
  if (projection.applicability.market !== context.market) return false;
  if (projection.applicability.effectiveFrom > context.evaluatedAt) return false;
  if (projection.applicability.effectiveThrough && projection.applicability.effectiveThrough < context.evaluatedAt) return false;
  return context.configurationIds.length === 0
    || projection.applicability.configurationIds.length === 0
    || context.configurationIds.some((configurationId) => projection.applicability.configurationIds.includes(configurationId));
}

function evaluateProjection(input: {
  readonly projection: SemanticDecisionProjectionV2;
  readonly candidatePool: ReadonlySet<string>;
  readonly context: PMaterialityContext;
  readonly activeQuestionIds: ReadonlySet<string>;
  readonly eventHistoryQuestionIds: ReadonlySet<string>;
}): PMaterialityEvaluation {
  const { projection, candidatePool, context } = input;
  const question = projection.materialQuestion;
  const suppression = validateSemanticDecisionProjection(projection).map((issue) => `INVALID_PROJECTION:${issue.code}`);
  if (!projectionIsApplicable(projection, context)) suppression.push("OUTSIDE_MARKET_CONFIGURATION_OR_EFFECTIVE_DATE");
  if (input.activeQuestionIds.has(question.questionId)) suppression.push("ALREADY_ANSWERED_OR_SUPERSEDED");
  if (projection.inheritance.blockedByConflict || projection.uncertainty === "CONFLICTED") suppression.push("BLOCKED_BY_CONFLICT");
  const missingPrerequisites = question.prerequisites.filter((prerequisite) => prerequisite.required && !context.satisfiedPrerequisiteIds.includes(prerequisite.prerequisiteId));
  if (missingPrerequisites.length) suppression.push("MISSING_PREREQUISITE");

  const states = uniqueCandidateStates(projection, candidatePool);
  const known = states.filter((effect) => effect.uncertainty === "KNOWN");
  const unknown = states.filter((effect) => effect.uncertainty !== "KNOWN");
  const partitions = new Map<string, string[]>();
  for (const effect of known) {
    if (effect.partition !== null) partitions.set(effect.partition, [...(partitions.get(effect.partition) ?? []), effect.exactOfferingId]);
  }
  const knownPartitions = Object.freeze(Object.fromEntries([...partitions.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([partition, ids]) => [partition, Object.freeze(ids.sort())])));
  if (partitions.size < 2) suppression.push("FEWER_THAN_TWO_KNOWN_PARTITIONS");

  const explicitAnswers = question.answerDomain.filter((answer) => answer.establishesExplicitRequirement);
  const splitAnswers = explicitAnswers.map((answer) => {
    const effects = (question.candidateEffectByAnswer[answer.answerId] ?? []).filter((effect) => candidatePool.has(effect.exactOfferingId) && effect.uncertainty === "KNOWN");
    return {
      excluded: effects.filter((effect) => effect.effect === "knownExclude" && effect.exactKnownMismatch).length,
      retained: effects.filter((effect) => effect.effect === "knownRetain").length,
      preferred: effects.filter((effect) => effect.effect === "softOnly").length,
      neutral: effects.filter((effect) => effect.effect === "none").length,
    };
  });
  const materialSplits = splitAnswers.filter((answer) => (answer.excluded > 0 && answer.retained > 0) || (answer.preferred > 0 && answer.neutral > 0));
  if (!materialSplits.length) suppression.push("ZERO_CANDIDATE_EFFECT");
  if (!states.length || known.some((effect) => effect.evidenceRefs.length === 0) || projection.sources.length === 0) suppression.push("UNSUPPORTED_QUESTION");
  if (unknown.length > known.length) suppression.push(question.predominantlyUnknownSuppressionCode ?? "SUPPRESSED_PREDOMINANTLY_UNKNOWN");

  const knownCount = known.length;
  const candidateCount = states.length || candidatePool.size;
  const expectedKnownReduction = knownCount && materialSplits.length
    ? materialSplits.reduce((sum, answer) => sum + (answer.excluded || Math.min(answer.preferred, answer.neutral)) / knownCount, 0) / materialSplits.length
    : 0;
  const decisionChangeProbability = candidateCount && materialSplits.length
    ? Math.max(...materialSplits.map((answer) => (answer.excluded || answer.preferred) / candidateCount))
    : 0;
  const rawParticipatingEvidenceRefs = [...new Set(Object.values(question.candidateEffectByAnswer).flat()
    .filter((effect) => candidatePool.has(effect.exactOfferingId) && effect.uncertainty === "KNOWN" && ["knownRetain", "knownExclude", "softOnly"].includes(effect.effect))
    .flatMap((effect) => effect.evidenceRefs))].sort();
  const participatingEvidenceRefs = [...new Set(rawParticipatingEvidenceRefs.flatMap((reference) => projection.factCapabilityRefs.find((item) => item.factId === reference)?.sourceRefs ?? [reference]))].sort();
  const evidence = projection.sources.filter((source) => participatingEvidenceRefs.includes(source.sourceId));
  const evidenceReliability = evidence.length ? evidence.reduce((sum, source) => sum + source.reliability, 0) / evidence.length : 0;
  const signals = context.questionSignals?.[question.questionId];
  const answerability = clamp(signals?.answerability ?? 1);
  const contextualRelevance = clamp(signals?.contextualRelevance ?? (context.relevantNeedIds.includes(projection.userNeed.needId) ? 1 : 0.5));
  const novelty = input.eventHistoryQuestionIds.has(question.questionId) ? 0.75 : 1;
  const unknownPenalty = candidateCount ? unknown.length / candidateCount : 1;
  const fatiguePenalty = clamp(context.questionsAskedThisSession * 0.1 + context.userFatigue);
  const score = round(expectedKnownReduction * 3 + decisionChangeProbability * 3 + evidenceReliability * 2 + answerability + contextualRelevance + novelty - unknownPenalty * 2 - fatiguePenalty);
  const suppressionReasons = Object.freeze([...new Set(suppression)].sort());
  return Object.freeze({
    projectionId: projection.identity.projectionId,
    questionId: question.questionId,
    eligible: suppressionReasons.length === 0 && score > 0,
    suppressionReasons,
    knownPartitions,
    knownCandidateCount: known.length,
    unknownCandidateCount: unknown.length,
    expectedKnownReduction: round(expectedKnownReduction),
    decisionChangeProbability: round(decisionChangeProbability),
    evidenceReliability: round(evidenceReliability),
    answerability: round(answerability),
    contextualRelevance: round(contextualRelevance),
    novelty: round(novelty),
    unknownPenalty: round(unknownPenalty),
    fatiguePenalty: round(fatiguePenalty),
    score,
    participatingEvidenceRefs: Object.freeze(participatingEvidenceRefs),
  });
}

export function executePMaterialityShadow(input: {
  readonly candidatePool: readonly string[];
  readonly currentContext: PMaterialityContext;
  readonly projections: readonly SemanticDecisionProjectionV2[];
  readonly answerLedger?: readonly QuestionAnswerEvent[];
}): PMaterialityShadowResult {
  const candidatePool = Object.freeze([...new Set(input.candidatePool)].sort((left, right) => left.localeCompare(right)));
  const candidateSet = new Set(candidatePool);
  const answers = projectActiveQuestionAnswers(input.answerLedger ?? []);
  const activeQuestionIds = new Set(answers.active.map((answer) => answer.questionId));
  const eventHistoryQuestionIds = new Set((input.answerLedger ?? []).map((event) => event.questionId));
  const projections = [...input.projections].sort((left, right) => left.identity.projectionId.localeCompare(right.identity.projectionId));
  const evaluations = projections.map((projection) => evaluateProjection({ projection, candidatePool: candidateSet, context: input.currentContext, activeQuestionIds, eventHistoryQuestionIds }));
  const selectedEvaluation = [...evaluations]
    .filter((evaluation) => evaluation.eligible)
    .sort((left, right) => right.score - left.score || right.expectedKnownReduction - left.expectedKnownReduction || left.questionId.localeCompare(right.questionId))[0];
  const selectedProjection = selectedEvaluation ? projections.find((projection) => projection.identity.projectionId === selectedEvaluation.projectionId) : undefined;
  const trace: PMaterialityTrace = Object.freeze({
    schemaVersion: "p-materiality-shadow-trace/v2",
    mode: "SHADOW_ONLY",
    candidatePool,
    activeAnswers: answers.active,
    answerHistoryDisposition: answers.dispositions,
    evaluations: Object.freeze(evaluations),
    selectedQuestionId: selectedProjection?.materialQuestion.questionId ?? null,
    maxQuestions: 1,
  });
  const hasQuestion = Boolean(selectedProjection);
  return Object.freeze({
    outcome: hasQuestion ? "ASK_ONE_QUESTION" : "NO_MATERIAL_QUESTION",
    outcomeMeaning: hasQuestion ? "QUESTION_SELECTED_WITHOUT_CONTEXT_MUTATION" : "NO_ELIGIBLE_MATERIAL_QUESTION_NOT_SUFFICIENT",
    sufficiency: "NOT_EVALUATED",
    selectedQuestion: selectedProjection?.materialQuestion ?? null,
    selectedProjectionId: selectedProjection?.identity.projectionId ?? null,
    candidatePoolUnchanged: true,
    productionMutation: false,
    trace,
    traceFingerprint: immutableDigest(trace),
  });
}
