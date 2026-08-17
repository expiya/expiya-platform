import { selectMaterialQuestion } from "./questions";
import type { ConversationActionDecision, DecideActionInput, ShortlistIntent } from "./types";

function shortlist(input: DecideActionInput): ShortlistIntent | null { const ids = input.rankedShortlist.candidateIds.slice(0, 3); if (!ids.length) return null; const tuple = ids as [string, ...string[]]; const approximate = input.candidateAvailability === "READY_WITH_APPROXIMATE_BUDGET"; return Object.freeze({ candidateIds: tuple, mode: input.explicitSingleRequested ? "SINGLE_REQUESTED" : input.explicitTrimComparisonRequested ? "TRIM_COMPARISON" : approximate ? "APPROXIMATE_BUDGET" : "FAMILY_DIVERSE", requiresIdentityFreeConsent: true, requiredCaveatFactIds: approximate ? [...(input.approximateBudgetCaveatFactIds ?? [])] : [] }); }
export function decideConversationAction(input: DecideActionInput): ConversationActionDecision {
  const question = selectMaterialQuestion({ memory: input.memory, candidates: input.questionCandidates, currentCandidateIds: input.ranking.rankedCandidateIds, policy: input.policy }); let nextState: ConversationActionDecision["nextState"] = input.memory.state; let nextAction: ConversationActionDecision["nextAction"] = { type: "ANSWER_DIRECTLY" }; let materialQuestion = question.question; let shortlistIntent: ShortlistIntent | null = null; let rule = "INFORMATION"; const facts = [...(input.directAnswerObligation?.authorizedExplanationFactIds ?? [])]; const prohibited = ["UNAUTHORIZED_CANDIDATE_REVEAL", "INTERNAL_ESTIMATE_EXACT_PRICE", "UNSUPPORTED_AFFORDABILITY_CLAIM"];
  if (input.normalizedUserAct === "ABUSE" && !input.systemCorrectionRequired) { if (input.memory.abuseState.strikeCount >= 3 || input.memory.abuseState.level === "ENDED") { nextState = "LIMITED_OR_ENDED"; nextAction = { type: "END_POLITELY" }; rule = "ABUSE_END"; } else { nextState = "ABUSE_WARNING"; nextAction = { type: "ANSWER_DIRECTLY" }; rule = input.memory.abuseState.strikeCount >= 2 ? "ABUSE_WARN" : "ABUSE_BOUNDARY"; } facts.push("direct-answer"); materialQuestion = null; }
  else if (input.catalogSnapshotAvailable === false) { nextState = "CONFLICT"; nextAction = { type: "ANSWER_DIRECTLY" }; rule = "CATALOG_SNAPSHOT_UNAVAILABLE"; materialQuestion = null; }
  else if (input.normalizedUserAct === "CORRECTION" || input.normalizedUserAct === "REJECTION" || input.systemCorrectionRequired) { nextState = "FILTERING"; nextAction = materialQuestion ? { type: "ASK_MATERIAL_QUESTION" } : { type: "ANSWER_DIRECTLY" }; rule = "EXPLICIT_MUTATION_RECOMPUTE"; }
  else if (input.directAnswerObligation) {
    rule = "DIRECT_ANSWER";
    if (input.directAnswerObligation.kind === "RECOMMENDATION_REQUEST") {
      if (input.candidateAvailability === "HARD_CONFLICT") {
        nextAction = { type: "EXPLAIN_CONFLICT" }; nextState = "CONFLICT"; materialQuestion = null; rule = "RECOMMENDATION_HARD_CONFLICT"; facts.push(...(input.conflictAnalysis?.authorizedConflictFactIds ?? []));
      } else if (input.recommendationReadiness === "READY_FOR_OFFER") {
        nextAction = { type: "REQUEST_REVEAL_CONSENT" }; nextState = "AWAITING_CONSENT"; shortlistIntent = shortlist(input); materialQuestion = null; rule = "RECOMMENDATION_READY";
      } else if (materialQuestion) {
        nextAction = { type: "ASK_MATERIAL_QUESTION" }; nextState = "UNDERSTANDING_NEEDS"; rule = "RECOMMENDATION_NEEDS_DISCOVERY";
      } else {
        nextAction = { type: "ANSWER_DIRECTLY" }; nextState = "UNDERSTANDING_NEEDS"; rule = "RECOMMENDATION_INSUFFICIENT_EVIDENCE";
      }
    } else {
      nextAction = input.directAnswerObligation.kind === "MODEL_AVAILABILITY" ? { type: "ANSWER_MODEL_LOOKUP" } : input.directAnswerObligation.kind === "TECHNICAL_EXPLANATION" ? { type: "EXPLAIN_TECHNICAL_CONCEPT" } : { type: "ANSWER_DIRECTLY" };
      // A lookup or explanation is a direct user question, not implicit consent
      // to begin a generic discovery questionnaire.
      if (["TECHNICAL_EXPLANATION", "MODEL_AVAILABILITY"].includes(input.directAnswerObligation.kind)) materialQuestion = null;
    }
  }
  else if (input.normalizedUserAct === "TECHNICAL_EXPLANATION_REQUEST" || input.normalizedUserAct === "UNKNOWN_TECHNICAL_CONCEPT") { nextState = "TECHNICAL_GUIDANCE"; nextAction = { type: "EXPLAIN_TECHNICAL_CONCEPT" }; rule = "TECHNICAL_EXPLANATION"; materialQuestion = null; }
  else if (input.candidateAvailability === "HARD_CONFLICT") { nextState = "CONFLICT"; nextAction = { type: "EXPLAIN_CONFLICT" }; rule = "HARD_CONFLICT_RECOVERY"; materialQuestion = null; facts.push(...(input.conflictAnalysis?.authorizedConflictFactIds ?? [])); }
  else if (input.normalizedUserAct === "SOCIAL") { nextState = "SOCIAL"; nextAction = { type: "SOCIAL_REPLY" }; rule = input.memory.vehicleIntentEstablished && materialQuestion ? "SOCIAL_REPLY_WITH_DISCOVERY" : "SOCIAL_REPLY"; facts.push("direct-answer"); if (!input.memory.vehicleIntentEstablished) materialQuestion = null; }
  else if (input.normalizedUserAct === "OFF_TOPIC") { if (input.memory.offTopicState.consecutiveOffTopicTurns >= input.policy.offTopicEndThreshold) { nextState = "LIMITED_OR_ENDED"; nextAction = { type: "END_POLITELY" }; rule = "OFF_TOPIC_END"; } else { nextState = "OFF_TOPIC_RECOVERY"; nextAction = { type: "ANSWER_DIRECTLY" }; rule = input.memory.offTopicState.consecutiveOffTopicTurns <= 1 ? "FIRST_OFF_TOPIC" : "OFF_TOPIC_RECOVERY"; } facts.push("direct-answer"); materialQuestion = null; }
  else if ((input.normalizedUserAct === "RECOMMENDATION_REQUEST" || input.memory.directAnswerHistory.some((item) => item.obligation === "RECOMMENDATION_REQUEST")) && input.recommendationReadiness === "READY_FOR_OFFER") { nextState = "AWAITING_CONSENT"; nextAction = { type: "REQUEST_REVEAL_CONSENT" }; rule = "READY_SHORTLIST"; shortlistIntent = shortlist(input); materialQuestion = null; }
  else if (materialQuestion) { nextState = "UNDERSTANDING_NEEDS"; nextAction = { type: "ASK_MATERIAL_QUESTION" }; rule = "MATERIAL_QUESTION"; }
  else if (input.normalizedUserAct === "CLOSING") { nextState = "LIMITED_OR_ENDED"; nextAction = { type: "END_POLITELY" }; rule = "POLITE_CLOSING"; }
  return Object.freeze({ nextState, nextAction, directAnswerObligation: input.directAnswerObligation, materialQuestion, shortlistIntent, explanationFactIds: Object.freeze([...new Set(facts)]), prohibitedClaims: Object.freeze(prohibited), policyTrace: Object.freeze({ policyId: input.policy.policyId, policyVersion: input.policy.policyVersion, matchedRule: rule, questionUtilities: question.utilities, ...(input.directAnswerObligation ? { directAnswerPlacement: "BEFORE_MATERIAL_QUESTION" as const } : {}) }) });
}
