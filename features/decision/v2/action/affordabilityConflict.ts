import type { CatalogSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { ActiveConstraintProjection } from "../filter/types";
import type { AffordabilityCandidatePool } from "../affordability/types";
import type { TechnicalCandidatePool } from "../filter/types";
import type { QuestionCandidate } from "./types";

const MATERIAL_FIELDS = new Set(["bodyStyle", "fuelType", "transmission"]);

function selectedValue(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return typeof value === "string" ? value : undefined;
  const normalized = value as { operator?: unknown; value?: unknown };
  return normalized.operator === "EQUALS" && typeof normalized.value === "string" ? normalized.value : undefined;
}

export function createAffordabilityConflictRecovery(input: {
  readonly snapshot: CatalogSnapshot;
  readonly memory: ConversationMemory;
  readonly constraints: ActiveConstraintProjection;
  readonly technical: TechnicalCandidatePool;
  readonly affordability: AffordabilityCandidatePool;
  readonly selectableCandidateIds: readonly string[];
}): QuestionCandidate | null {
  const budget = !input.memory.budget.budgetExcluded
    ? input.memory.budget.maximumHardCeiling?.amount ?? input.memory.budget.preferredBudget?.amount
    : undefined;
  const order = new Map(input.memory.events.map((event, index) => [event.id, index]));
  const hardFields = new Set(input.constraints.activeHardConstraints.map((constraint) => constraint.fieldId));
  const preferences = input.constraints.activeNonHardConstraints
    .filter((constraint) => constraint.decisionEffect === "STRONG_RANK" && MATERIAL_FIELDS.has(constraint.fieldId) && !hardFields.has(constraint.fieldId))
    .flatMap((constraint) => {
      const value = selectedValue(constraint.normalizedValue);
      return value ? [{ field: constraint.fieldId, value, order: order.get(constraint.sourceEventId) ?? -1 }] : [];
    })
    .concat(input.constraints.activeHardConstraints
      .filter((constraint) => MATERIAL_FIELDS.has(constraint.fieldId) && constraint.operator === "EQUALS" && typeof constraint.value === "string")
      .map((constraint) => ({ field: constraint.fieldId, value: constraint.value as string, order: order.get(constraint.sourceEventId) ?? -1 })))
    .sort((left, right) => right.order - left.order);
  if (budget === undefined || input.technical.eligibleCandidateIds.length === 0 || preferences.length === 0) return null;

  const matchesPreference = (candidateId: string): boolean => {
    const variant = input.snapshot.variantById.get(candidateId);
    if (!variant) return false;
    return preferences.every(({ field, value }) => field === "bodyStyle"
      ? variant.decisionFacts.bodyStyle.value === value
      : field === "fuelType"
        ? variant.decisionFacts.powertrain.fuelType.value === value
        : (/manual/iu.test(variant.decisionFacts.powertrain.transmission.value) ? "MANUAL" : "AUTOMATIC") === value);
  };
  const matchingTechnicalIds = input.technical.eligibleCandidateIds.filter(matchesPreference);
  if (matchingTechnicalIds.length === 0 || input.selectableCandidateIds.some(matchesPreference)) return null;
  const matching = new Set(matchingTechnicalIds);
  const hasKnownDecisionPrice = input.affordability.candidates.some((candidate) =>
    matching.has(candidate.exactVariantId) && candidate.affordabilityTier !== "PRICE_UNRESOLVED");
  if (!hasKnownDecisionPrice) return null;
  const encodedPreferences = preferences.map(({ field, value }) => `${field}=${encodeURIComponent(value)}`).join("&");
  const stableSemanticKey = `affordabilityConflict.${budget}.${encodedPreferences || "none"}`;

  return Object.freeze({
    question: Object.freeze({
      id: `v2q.affordability-conflict.${input.memory.turn + 1}`,
      stableSemanticKey,
      field: "budgetTradeoff",
      promptIntent: "RESOLVE_CONFLICT",
      options: Object.freeze([]),
      answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const),
      materialityReason: "Teknik olarak uygun adaylar var; ancak doğrulanmış veya kontrollü karar fiyatıyla bütçeye uyan aday yok. Tekliften önce son tercihten geriye doğru esnetme gerekir.",
    }),
    stage: "BUDGET", eligible: true, blockedUntilStagesComplete: Object.freeze([]), materiality: 5,
    informationGain: 1, conversationalRelevance: 5, reasonCodes: Object.freeze(["ZERO_AFFORDABLE_TECHNICAL_CANDIDATES"]),
    decisionChangeProbability: 5, conflictResolutionValue: 5, candidateReductionValue: 0, contextualRelevance: 5,
    answerability: 4, cognitiveLoad: 0.5, repetitionRisk: 0, timingPenalty: 0, technicalMismatchPenalty: 0,
    compatibleCandidateIds: Object.freeze([]),
  });
}
