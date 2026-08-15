import { createHash } from "node:crypto";

import { zodTextFormat } from "openai/helpers/zod";

import { getOpenAIClient } from "@/lib/openai";
import type { CarsConversationMessage, CarsConversationTrace } from "@/types/carsConversation";

import { carsConversationModelAttempts } from "./carsConversationModelConfig";
import {
  CARS_ADVISOR_PRODUCTION_PROMPT,
  carsConversationTurnPlanSchema,
  type CarsConversationTurnPlan,
} from "./carsConversationPlanSchema";
import type { CarsLatestAct } from "./carsSocialIntent";

export type { CarsConversationTurnPlan } from "./carsConversationPlanSchema";

export interface PlanCarsConversationTurnInput {
  readonly conversationId: string;
  readonly messages: readonly CarsConversationMessage[];
  readonly memory: CarsConversationTrace;
  readonly remainingUserTurns: number;
  readonly latestAct: CarsLatestAct;
  readonly recommendationMayBeOffered: boolean;
  readonly candidateMayBeRevealed: boolean;
  readonly userFacingDecisionBasis?: readonly string[];
  readonly userFacingUnverifiedPreferences?: readonly string[];
}

export interface PlanCarsConversationTurnResult {
  readonly plan?: CarsConversationTurnPlan;
  readonly requestedModel: string;
  readonly selectedModel?: string;
  readonly parseOutcome: NonNullable<CarsConversationTrace["turnProvenance"]>["parseOutcome"];
  readonly fallbackUsed: boolean;
}

function logPlannerFailure(
  model: string,
  attempt: number,
  details: { readonly status?: number | string; readonly code?: string },
): void {
  console.warn(JSON.stringify({
    type: "cars_conversation_llm",
    event: "turn_plan_failed",
    model,
    attempt,
    status: details.status ?? null,
    code: details.code ?? null,
  }));
}

function plannerPayload(input: PlanCarsConversationTurnInput) {
  const transcript = input.messages.slice(-12).map((message) => ({ role: message.role, content: message.content }));
  const latestUser = [...input.messages].reverse().find((message) => message.role === "user");
  return {
    latestUserMessage: latestUser?.content ?? "",
    remainingUserTurns: input.remainingUserTurns,
    latestAct: input.latestAct,
    socialVehicleState: {
      advisorStage: input.memory.advisorStage,
      vehicleIntentEstablished: input.memory.vehicleIntentEstablished,
      humanReady: input.memory.humanReady,
      governedReady: input.memory.governedReady,
      recommendationOfferStatus: input.memory.recommendationOfferStatus,
    },
    recommendationMayBeOffered: input.recommendationMayBeOffered,
    candidateMayBeRevealed: input.candidateMayBeRevealed,
    userFacingDecisionBasis: input.userFacingDecisionBasis ?? [],
    userFacingUnverifiedPreferences: input.userFacingUnverifiedPreferences ?? [],
    memory: {
      requirements: input.memory.requirements.map((entry) => ({
        key: entry.key,
        value: entry.value,
        understood: true,
        evaluableNow: entry.evaluability === "EVALUABLE_NOW",
        category: entry.category,
      })),
      activeQuestionPurpose: input.memory.lastAssistantQuestion?.purpose ?? null,
      deferredQuestionPurposes: (input.memory.questionMemory ?? [])
        .filter((entry) => entry.status === "DEFERRED")
        .map((entry) => entry.purpose),
      askedQuestionPurposes: input.memory.askedQuestionPurposes,
      answeredQuestionPurposes: input.memory.answeredQuestionPurposes,
      capturedOnLatestTurn: input.memory.capturedOnLatestTurn,
      rejectedShownRecommendations: input.memory.rejectedRecommendationIds.length > 0,
    },
    transcript,
  };
}

export async function planCarsConversationTurn(
  input: PlanCarsConversationTurnInput,
): Promise<PlanCarsConversationTurnResult> {
  const models = carsConversationModelAttempts();
  const requestedModel = models[0];
  try {
    for (const [attempt, model] of models.entries()) {
      try {
        const response = await getOpenAIClient().responses.parse({
          model,
          store: false,
          max_output_tokens: 1_600,
          safety_identifier: createHash("sha256").update(input.conversationId).digest("hex"),
          prompt_cache_key: "expiya-cars-natural-advisor-v1",
          input: [
            { role: "system", content: CARS_ADVISOR_PRODUCTION_PROMPT },
            { role: "user", content: JSON.stringify(plannerPayload(input)) },
          ],
          text: {
            format: zodTextFormat(carsConversationTurnPlanSchema, "cars_natural_advisor_turn"),
          },
        }, { timeout: 20_000 });
        if (response.output_parsed) {
          const parsed = carsConversationTurnPlanSchema.parse(response.output_parsed);
          return {
            plan: { ...parsed, plannerModel: model, requestedModel },
            requestedModel,
            selectedModel: model,
            parseOutcome: "SUCCESS",
            fallbackUsed: attempt > 0,
          };
        }
        logPlannerFailure(model, attempt, { status: response.status, code: response.incomplete_details?.reason });
      } catch (error) {
        const failed = error as { status?: number; error?: { code?: string } };
        logPlannerFailure(model, attempt, { status: failed.status, code: failed.error?.code });
        if (attempt < models.length - 1) continue;
        return { plan: undefined, requestedModel, parseOutcome: "UNAVAILABLE", fallbackUsed: false };
      }
    }
    return { plan: undefined, requestedModel, parseOutcome: "EMPTY", fallbackUsed: false };
  } catch {
    return { plan: undefined, requestedModel, parseOutcome: "UNAVAILABLE", fallbackUsed: false };
  }
}
