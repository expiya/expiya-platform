import type {
  CandidateEffect,
  DecisionUse,
  SemanticDecisionProjectionV2,
  SourceReference,
} from "./contract";

export interface ProjectionInvariantIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}
const neutralEffects = new Set(["unknownRetain", "none"]);
const nonMutatingDecisionUses = new Set<DecisionUse>(["QUESTION_INPUT", "PLANNING_ONLY", "EXPLANATION_ONLY", "NONE"]);

function effectIssues(projection: SemanticDecisionProjectionV2, answerId: string, effect: CandidateEffect): ProjectionInvariantIssue[] {
  const path = `materialQuestion.candidateEffectByAnswer.${answerId}.${effect.exactOfferingId}`;
  const issues: ProjectionInvariantIssue[] = [];
  if (!projection.offerings.some((offering) => offering.exactOfferingId === effect.exactOfferingId)) {
    issues.push({ code: "EFFECT_UNKNOWN_EXACT_OFFERING", path, message: "Candidate effect must target an exact offering in this projection." });
  }
  if (["UNKNOWN", "CONFLICTED", "STALE", "NOT_APPLICABLE"].includes(effect.uncertainty) && !neutralEffects.has(effect.effect)) {
    issues.push({ code: "UNCERTAINTY_MUST_BE_NEUTRAL", path, message: `${effect.uncertainty} cannot exclude, advantage, or declare a winner.` });
  }
  if (effect.effect === "knownExclude" && (effect.uncertainty !== "KNOWN" || !effect.exactKnownMismatch)) {
    issues.push({ code: "EXCLUSION_REQUIRES_EXACT_KNOWN_MISMATCH", path, message: "Exclusion requires an exact, known mismatch." });
  }
  if (effect.evidenceRefs.some((reference) => !projection.sources.some((source) => source.sourceId === reference))) {
    issues.push({ code: "EFFECT_SOURCE_NOT_BOUND", path, message: "Every participating evidence reference must be bound by the projection." });
  }
  return issues;
}

export function validateSemanticDecisionProjection(projection: SemanticDecisionProjectionV2): readonly ProjectionInvariantIssue[] {
  const issues: ProjectionInvariantIssue[] = [];
  if (projection.schemaVersion !== "SemanticDecisionProjection/v2") {
    issues.push({ code: "SCHEMA_VERSION_MISMATCH", path: "schemaVersion", message: "Projection must use SemanticDecisionProjection/v2." });
  }
  if (!projection.offerings.length || new Set(projection.offerings.map((offering) => offering.exactOfferingId)).size !== projection.offerings.length) {
    issues.push({ code: "EXACT_OFFERING_IDENTITY_INVALID", path: "offerings", message: "At least one unique exact offering is required." });
  }
  if (projection.offerings.some((offering) => offering.categoryId !== projection.identity.categoryId)) {
    issues.push({ code: "CATEGORY_IDENTITY_MISMATCH", path: "offerings", message: "Projection and exact offering categories must match." });
  }
  if (projection.semanticAuthority.digest === "sha256:" || !/^sha256:[a-f0-9]{64}$/u.test(projection.semanticAuthority.digest)) {
    issues.push({ code: "SEMANTIC_AUTHORITY_DIGEST_INVALID", path: "semanticAuthority.digest", message: "A pinned sha256 semantic authority digest is required." });
  }
  if (projection.sources.some((source) => source.reliability < 0 || source.reliability > 1)) {
    issues.push({ code: "SOURCE_RELIABILITY_OUT_OF_RANGE", path: "sources", message: "Evidence reliability must be between zero and one." });
  }
  const answerIds = projection.materialQuestion.answerDomain.map((answer) => answer.answerId);
  if (!answerIds.length || new Set(answerIds).size !== answerIds.length || answerIds.some((answerId) => !projection.materialQuestion.candidateEffectByAnswer[answerId])) {
    issues.push({ code: "ANSWER_DOMAIN_EFFECTS_INCOMPLETE", path: "materialQuestion", message: "Every unique answer must have a candidate-effect projection." });
  }
  for (const [answerId, effects] of Object.entries(projection.materialQuestion.candidateEffectByAnswer)) {
    if (!answerIds.includes(answerId) || effects.length !== projection.offerings.length) {
      issues.push({ code: "CANDIDATE_EFFECT_COMPLETENESS_FAILURE", path: `materialQuestion.candidateEffectByAnswer.${answerId}`, message: "Every answer must cover every exact offering exactly once." });
    }
    if (new Set(effects.map((effect) => effect.exactOfferingId)).size !== effects.length) {
      issues.push({ code: "DUPLICATE_CANDIDATE_EFFECT", path: `materialQuestion.candidateEffectByAnswer.${answerId}`, message: "Candidate effects must be unique per exact offering." });
    }
    issues.push(...effects.flatMap((effect) => effectIssues(projection, answerId, effect)));
  }
  if (projection.userNeed.decisionUse === "HARD_FILTER" && !projection.materialQuestion.answerDomain.some((answer) => answer.establishesExplicitRequirement)) {
    issues.push({ code: "HARD_FILTER_REQUIRES_EXPLICIT_ANSWER", path: "userNeed.decisionUse", message: "A hard filter can only be established by an explicit user answer." });
  }
  if (projection.userNeed.decisionUse === "SOFT_PREFERENCE" && !projection.governedComparison) {
    issues.push({ code: "SOFT_PREFERENCE_REQUIRES_GOVERNED_COMPARISON", path: "governedComparison", message: "Soft preference use requires a governed comparison." });
  }
  if (nonMutatingDecisionUses.has(projection.userNeed.decisionUse)) {
    const hasMembershipEffect = Object.values(projection.materialQuestion.candidateEffectByAnswer).flat().some((effect) => effect.effect === "knownExclude");
    if (hasMembershipEffect) issues.push({ code: "NON_MUTATING_DECISION_USE_HAS_EXCLUSION", path: "userNeed.decisionUse", message: `${projection.userNeed.decisionUse} cannot mutate candidate membership.` });
  }
  if (projection.technicalPredicate.field.startsWith("price.") && !projection.priceDecisionPolicy) {
    issues.push({ code: "PRICE_POLICY_REQUIRED", path: "priceDecisionPolicy", message: "Price requires explicit-budget, fresh-exact, commerce-isolated policy." });
  }
  if (projection.priceDecisionPolicy && (!projection.priceDecisionPolicy.commerceIsolated || !projection.priceDecisionPolicy.requiresExplicitBudget || !projection.priceDecisionPolicy.requiresFreshExactPrice)) {
    issues.push({ code: "PRICE_POLICY_NOT_ISOLATED", path: "priceDecisionPolicy", message: "Price authority must stay isolated from technical semantics." });
  }
  if (projection.personaDecisionPolicy.maximumAggregateScore !== 0.75
    || projection.personaDecisionPolicy.membershipEffect !== "NONE"
    || projection.personaDecisionPolicy.sufficiencyEffect !== "NONE"
    || projection.personaDecisionPolicy.singleWinnerEffect !== "NONE") {
    issues.push({ code: "PERSONA_BOUNDARY_INVALID", path: "personaDecisionPolicy", message: "Persona is capped at 0.75 and cannot affect membership, sufficiency, or a single winner." });
  }
  return Object.freeze(issues);
}

export interface AcceptedAnswerContext {
  readonly explicitRequirementQuestionIds: readonly string[];
  readonly explicitBudgetMaximumTry?: number;
  readonly evaluatedAt: string;
  readonly personaScores?: Readonly<Record<string, number>>;
}

export interface CandidateEffectSimulation {
  readonly mode: "SHADOW_SIMULATION_ONLY";
  readonly retainedCandidateIds: readonly string[];
  readonly excludedCandidateIds: readonly string[];
  readonly softCandidateIds: readonly string[];
  readonly uncertaintyRetainedCandidateIds: readonly string[];
  readonly participatingEvidence: readonly SourceReference[];
  readonly winner: null;
  readonly productionMutation: false;
  readonly reasonCodes: readonly string[];
}

export function simulateAcceptedAnswer(input: {
  readonly projection: SemanticDecisionProjectionV2;
  readonly answerId: string;
  readonly candidatePool: readonly string[];
  readonly context: AcceptedAnswerContext;
}): CandidateEffectSimulation {
  const issues = validateSemanticDecisionProjection(input.projection);
  if (issues.length) throw new Error(`INVALID_SEMANTIC_DECISION_PROJECTION:${issues.map((issue) => issue.code).join(",")}`);
  const answer = input.projection.materialQuestion.answerDomain.find((option) => option.answerId === input.answerId);
  if (!answer) throw new Error("ANSWER_OUTSIDE_DOMAIN");
  const pool = [...new Set(input.candidatePool)].sort((left, right) => left.localeCompare(right));
  const effects = new Map((input.projection.materialQuestion.candidateEffectByAnswer[input.answerId] ?? []).map((effect) => [effect.exactOfferingId, effect]));
  const hardAuthorized = input.projection.userNeed.decisionUse === "HARD_FILTER"
    && answer.establishesExplicitRequirement
    && input.context.explicitRequirementQuestionIds.includes(input.projection.materialQuestion.questionId);
  const priceField = input.projection.technicalPredicate.field.startsWith("price.");
  const priceAuthorized = !priceField || Boolean(
    input.projection.priceDecisionPolicy
    && input.context.explicitBudgetMaximumTry
    && input.projection.priceDecisionPolicy.freshThrough
    && input.projection.priceDecisionPolicy.freshThrough >= input.context.evaluatedAt,
  );
  const retained: string[] = [], excluded: string[] = [], soft: string[] = [], uncertain: string[] = [];
  const evidenceIds = new Set<string>();
  for (const candidateId of pool) {
    const effect = effects.get(candidateId);
    if (!effect) {
      retained.push(candidateId);
      uncertain.push(candidateId);
      continue;
    }
    const neutralUncertainty = effect.uncertainty !== "KNOWN";
    const canExclude = hardAuthorized && priceAuthorized && effect.effect === "knownExclude" && effect.exactKnownMismatch && !neutralUncertainty;
    if (canExclude) excluded.push(candidateId); else retained.push(candidateId);
    if (neutralUncertainty) uncertain.push(candidateId);
    if (input.projection.userNeed.decisionUse === "SOFT_PREFERENCE" && effect.effect === "softOnly") soft.push(candidateId);
    if (effect.uncertainty === "KNOWN" && ["knownRetain", "knownExclude", "softOnly"].includes(effect.effect)) {
      for (const evidenceRef of effect.evidenceRefs) evidenceIds.add(evidenceRef);
    }
  }
  const personaOutOfBounds = Object.values(input.context.personaScores ?? {}).some((score) => score < 0 || score > 0.75);
  if (personaOutOfBounds) throw new Error("PERSONA_SCORE_OUT_OF_BOUNDS");
  const reasonCodes = [
    ...(input.projection.userNeed.decisionUse === "HARD_FILTER" && !hardAuthorized ? ["HARD_FILTER_NOT_AUTHORIZED_WITHOUT_EXPLICIT_REQUIREMENT"] : []),
    ...(priceField && !priceAuthorized ? ["PRICE_NOT_AUTHORIZED_WITHOUT_EXPLICIT_FRESH_EXACT_BUDGET"] : []),
    ...(uncertain.length ? ["UNKNOWN_CONFLICTED_STALE_OR_NOT_APPLICABLE_RETAINED"] : []),
    "NO_SINGLE_WINNER_AUTHORITY",
  ];
  return Object.freeze({
    mode: "SHADOW_SIMULATION_ONLY",
    retainedCandidateIds: Object.freeze(retained),
    excludedCandidateIds: Object.freeze(excluded),
    softCandidateIds: Object.freeze(soft),
    uncertaintyRetainedCandidateIds: Object.freeze(uncertain),
    participatingEvidence: Object.freeze(input.projection.sources.filter((source) => evidenceIds.has(source.sourceId)).sort((left, right) => left.sourceId.localeCompare(right.sourceId))),
    winner: null,
    productionMutation: false,
    reasonCodes: Object.freeze(reasonCodes),
  });
}
