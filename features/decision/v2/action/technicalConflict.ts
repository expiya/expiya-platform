import type { ConversationMemory } from "../domain/conversationMemory";
import type { ActiveConstraintProjection } from "../filter/types";
import type { TechnicalCandidatePool } from "../filter/types";
import type { QuestionCandidate, QuestionStage } from "./types";

const RECOVERABLE_FIELDS = new Set(["seats", "bodyStyle", "fuelType", "transmission", "drivenWheels"]);
const stage = (field: string): QuestionStage => field === "bodyStyle" ? "VEHICLE_ARCHITECTURE" : field === "seats" ? "FUNCTIONAL_NEEDS" : field === "fuelType" ? "ENERGY_FIT" : "TECHNICAL_PREFERENCES";

export function createTechnicalHardConflictRecovery(input: {
  readonly memory: ConversationMemory;
  readonly constraints: ActiveConstraintProjection;
  readonly technical: TechnicalCandidatePool;
}): QuestionCandidate | null {
  if (input.technical.eligibleCandidateIds.length > 0) return null;
  const order = new Map(input.memory.events.map((event, index) => [event.id, index]));
  const target = [...input.constraints.activeHardConstraints]
    .filter((constraint) => RECOVERABLE_FIELDS.has(constraint.fieldId))
    .sort((left, right) => (order.get(right.sourceEventId) ?? -1) - (order.get(left.sourceEventId) ?? -1))[0];
  if (!target) return null;
  const body = [...input.constraints.activeHardConstraints, ...input.constraints.activeNonHardConstraints]
    .find((constraint) => constraint.fieldId === "bodyStyle");
  const bodyValue = body && "value" in body
    ? body.value
    : body && typeof body.normalizedValue === "object" && body.normalizedValue !== null && !Array.isArray(body.normalizedValue)
      ? (body.normalizedValue as { value?: unknown }).value
      : undefined;
  const value = typeof target.value === "string" || typeof target.value === "number" ? String(target.value) : "belirtilen";
  const stableSemanticKey = `technicalConflict.${target.fieldId}.${encodeURIComponent(value)}.${encodeURIComponent(typeof bodyValue === "string" ? bodyValue : "")}`;
  return Object.freeze({
    question: Object.freeze({
      id: `v2q.technical-conflict.${target.fieldId}.${input.memory.turn + 1}`,
      stableSemanticKey,
      field: `${target.fieldId}Tradeoff`,
      promptIntent: "RESOLVE_CONFLICT",
      options: Object.freeze([]),
      answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const),
      materialityReason: "Son eklenen hard teknik gereksinim aday havuzunu sıfıra indirdi; tekliften önce bu gereksinim veya ilişkili araç mimarisi esnetilmelidir.",
    }),
    stage: stage(target.fieldId), eligible: true, blockedUntilStagesComplete: Object.freeze([]), materiality: 5,
    informationGain: 1, conversationalRelevance: 5, reasonCodes: Object.freeze(["ZERO_TECHNICAL_CANDIDATES_AFTER_HARD_CONSTRAINT"]),
    decisionChangeProbability: 5, conflictResolutionValue: 5, candidateReductionValue: 0, contextualRelevance: 5,
    answerability: 4, cognitiveLoad: 0.5, repetitionRisk: 0, timingPenalty: 0, technicalMismatchPenalty: 0,
    compatibleCandidateIds: Object.freeze([]),
  });
}
