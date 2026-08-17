import type { CatalogSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { QuestionCandidate } from "./types";

const FIVE_DOOR_EXPRESSION = /\b(?:5|beş)\s*kap(?:ı|ılı)\b/iu;

export function createConversationLocalSemanticRecoveryQuestion(input: {
  readonly userText: string;
  readonly memory: ConversationMemory;
  readonly snapshot: CatalogSnapshot;
  readonly candidateIds: readonly string[];
  readonly bodyStyleAlreadyInterpreted: boolean;
  readonly priceMeaningClarificationEligible?: boolean;
}): QuestionCandidate | null {
  const ambiguousEconomic = /\bekonomik(?:\s+(?:olsun|bir\s+(?:araç|araba)))?\b/iu.test(input.userText) && !/fiyat|ucuz|yakıt|tüketim|az\s+yakan/iu.test(input.userText);
  const economicMeaningAlreadyClosed = (input.memory.materialQuestionHistory ?? []).some((item) => item.stableSemanticKey === "semanticRecovery.economicMeaning" && item.answerStatus !== "OPEN");
  const fiveDoor = FIVE_DOOR_EXPRESSION.test(input.userText) && !input.bodyStyleAlreadyInterpreted;
  if (!fiveDoor && !(ambiguousEconomic && !economicMeaningAlreadyClosed && input.priceMeaningClarificationEligible)) return null;

  const candidateIds = Object.freeze([...new Set(input.candidateIds)].sort());
  if (!candidateIds.length) return null;
  const provenance = Object.freeze({
    source: "CURRENT_CANDIDATE_POOL" as const,
    candidatePoolFingerprint: input.memory.decisionFingerprint,
    supportingCandidateIds: candidateIds,
    authorityReference: input.snapshot.authority.catalogFingerprint,
  });

  if (ambiguousEconomic) return Object.freeze({
    question: Object.freeze({ id: `v2q.semanticRecovery.economicMeaning.${input.memory.turn + 1}`, stableSemanticKey: "semanticRecovery.economicMeaning", field: "relativePriceMeaning", promptIntent: "CLARIFY_REQUIREMENT", selectionMode: "SINGLE", minimumSelections: 1, maximumSelections: 1, options: Object.freeze([
      Object.freeze({ id: "v2q.semanticRecovery.economic.purchase", semanticValue: "PURCHASE_PRICE", userFacingLabel: "Satın alma fiyatı erişilebilir olsun", provenance }),
      Object.freeze({ id: "v2q.semanticRecovery.economic.running", semanticValue: "RUNNING_COST", userFacingLabel: "Kullanım ve yakıt maliyeti düşük olsun", provenance }),
    ]), answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: "Ekonomik ifadesinin satın alma fiyatını mı kullanım maliyetini mi anlattığını netleştirir." }),
    stage: "BUDGET", eligible: true, blockedUntilStagesComplete: Object.freeze(["USAGE_CONTEXT", "VEHICLE_ARCHITECTURE", "FUNCTIONAL_NEEDS", "ENERGY_FIT", "TECHNICAL_PREFERENCES"] as const), materiality: 10, informationGain: 0, conversationalRelevance: 10, reasonCodes: Object.freeze(["AMBIGUOUS_ECONOMIC_MEANING_REQUIRES_CLARIFICATION"]), decisionChangeProbability: 1, conflictResolutionValue: 0, candidateReductionValue: 0, contextualRelevance: 10, answerability: 1, cognitiveLoad: 0.1, repetitionRisk: 0, timingPenalty: 0, technicalMismatchPenalty: 0, compatibleCandidateIds: candidateIds,
  });
  return Object.freeze({
    question: Object.freeze({
      id: `v2q.semanticRecovery.fiveDoor.${input.memory.turn + 1}`,
      stableSemanticKey: "semanticRecovery.fiveDoorBodyStyle",
      field: "bodyStyle",
      promptIntent: "CLARIFY_REQUIREMENT",
      options: Object.freeze([
        Object.freeze({ id: "v2q.semanticRecovery.fiveDoor.hatchback", semanticValue: "Hatchback", userFacingLabel: "Özellikle hatchback", provenance }),
        Object.freeze({ id: "v2q.semanticRecovery.fiveDoor.suv", semanticValue: "SUV", userFacingLabel: "Beş kapılı SUV/crossover da olabilir", provenance }),
      ]),
      answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const),
      materialityReason: "Kullanıcının beş kapı ifadesinin kastettiği gövde tipini konuşma içinde netleştirir.",
    }),
    stage: "VEHICLE_ARCHITECTURE",
    eligible: true,
    blockedUntilStagesComplete: Object.freeze(["USAGE_CONTEXT"] as const),
    materiality: 10,
    informationGain: 0,
    conversationalRelevance: 10,
    reasonCodes: Object.freeze(["CONVERSATION_LOCAL_SEMANTIC_RECOVERY", "UNSUPPORTED_EXPRESSION_REQUIRES_CLARIFICATION"]),
    decisionChangeProbability: 1,
    conflictResolutionValue: 0,
    candidateReductionValue: 0,
    contextualRelevance: 10,
    answerability: 1,
    cognitiveLoad: 0.1,
    repetitionRisk: 0,
    timingPenalty: 0,
    technicalMismatchPenalty: 0,
    compatibleCandidateIds: candidateIds,
  });
}
