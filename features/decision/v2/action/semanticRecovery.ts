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
}): QuestionCandidate | null {
  if (!FIVE_DOOR_EXPRESSION.test(input.userText) || input.bodyStyleAlreadyInterpreted) return null;

  const candidateIds = Object.freeze([...new Set(input.candidateIds)].sort());
  if (!candidateIds.length) return null;
  const provenance = Object.freeze({
    source: "CURRENT_CANDIDATE_POOL" as const,
    candidatePoolFingerprint: input.memory.decisionFingerprint,
    supportingCandidateIds: candidateIds,
    authorityReference: input.snapshot.authority.catalogFingerprint,
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
