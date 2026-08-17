import type { ConversationMemory } from "../domain/conversationMemory";
import { QUESTION_STAGE_ORDER, type QuestionCandidate, type QuestionStage, type QuestionStageCompletion } from "./types";

const STAGE_FIELDS: Readonly<Record<QuestionStage, readonly string[]>> = Object.freeze({
  USAGE_CONTEXT: Object.freeze(["usageScenario"]),
  VEHICLE_ARCHITECTURE: Object.freeze(["bodyStyle", "usageArchitecture"]),
  FUNCTIONAL_NEEDS: Object.freeze(["seats", "drivenWheels", "rearSeatPreference", "luggageLitres", "cargoVolumeLitres", "payloadKg"]),
  ENERGY_FIT: Object.freeze(["fuelType"]),
  TECHNICAL_PREFERENCES: Object.freeze(["transmission", "powerKw", "electricRangeKm", "combinedLitresPer100Km", "combinedKwhPer100Km"]),
  BUDGET: Object.freeze(["budget"]),
  SOFT_DIFFERENTIATION: Object.freeze(["persona", "design", "comfort"]),
});

export function projectQuestionStageCompletion(input: {
  readonly memory: ConversationMemory;
  readonly activeFields: ReadonlySet<string>;
  readonly candidates: readonly QuestionCandidate[];
  readonly comparisonScope: boolean;
}): readonly QuestionStageCompletion[] {
  const history = input.memory.materialQuestionHistory;
  return Object.freeze(QUESTION_STAGE_ORDER.map((stage) => {
    if (stage === "USAGE_CONTEXT" && input.comparisonScope) return Object.freeze({ stage, status: "NOT_APPLICABLE" as const, reasonCodes: Object.freeze(["DIRECT_MODEL_SCOPE_SUPPLIES_DECISION_CONTEXT"]) });
    const fields = STAGE_FIELDS[stage];
    const supplied = fields.some((field) => input.activeFields.has(field));
    if (supplied) return Object.freeze({ stage, status: "COMPLETE" as const, reasonCodes: Object.freeze(["USER_PROVIDED_STAGE_FACT"]) });
    const dispositions = history.filter((entry) => fields.includes(entry.field));
    if (dispositions.some((entry) => ["DEFERRED", "DECLINED", "SUPERSEDED"].includes(entry.answerStatus))) return Object.freeze({ stage, status: "SKIPPED_OR_DEFERRED" as const, reasonCodes: Object.freeze(["USER_EXPLICITLY_SKIPPED_OR_REDIRECTED_STAGE"]) });
    if (dispositions.some((entry) => entry.answerStatus === "ANSWERED")) return Object.freeze({ stage, status: "COMPLETE" as const, reasonCodes: Object.freeze(["MATERIAL_QUESTION_ANSWERED"]) });
    if (input.candidates.some((candidate) => candidate.stage === stage)) return Object.freeze({ stage, status: "INCOMPLETE" as const, reasonCodes: Object.freeze(["ELIGIBLE_UNANSWERED_STAGE_QUESTION_EXISTS"]) });
    return Object.freeze({ stage, status: "NOT_APPLICABLE" as const, reasonCodes: Object.freeze(["NO_MATERIAL_QUESTION_FOR_CURRENT_SCENARIO_AND_POOL"]) });
  }));
}

export function stagePrerequisitesComplete(candidate: QuestionCandidate, completion: readonly QuestionStageCompletion[]): boolean {
  const byStage = new Map(completion.map((item) => [item.stage, item]));
  return candidate.blockedUntilStagesComplete.every((stage) => byStage.get(stage)?.status !== "INCOMPLETE");
}
