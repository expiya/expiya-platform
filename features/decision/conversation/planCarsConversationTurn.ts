import { createHash } from "node:crypto";

import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getOpenAIClient } from "@/lib/openai";
import type { CarsConversationMessage, CarsConversationTrace } from "@/types/carsConversation";

const factKeySchema = z.enum([
  "USAGE_CAMP",
  "USAGE_SERIOUS_OFF_ROAD",
  "USAGE_ROUGH_ROAD",
  "USAGE_STABILIZED_ROAD",
  "USAGE_CITY",
  "USAGE_HIGHWAY",
  "USAGE_FAMILY",
  "BUDGET_MAX_TRY",
  "DRIVETRAIN",
  "BODY_TYPE",
  "EQUIPMENT_LEVEL",
  "SIZE_PREFERENCE",
  "TRANSMISSION",
  "FUEL",
  "PARTY_SIZE",
  "MIN_SEATS",
  "MIN_CARGO_L",
]);

const turnPlanSchema = z.object({
  latestUserMeaning: z.string().min(1).max(400),
  replyKind: z.enum([
    "NEW_FACTS",
    "CONFIRMATION",
    "REJECTION",
    "CORRECTION",
    "OPTION_SELECTION",
    "FRUSTRATION",
    "OFF_TOPIC",
    "CLARIFICATION_REQUEST",
    "RECOMMENDATION_REJECTION",
    "SHORT_ANSWER",
  ]),
  bindsToActiveQuestion: z.boolean(),
  selectedOptionId: z.string().max(80).nullable(),
  facts: z.array(z.object({
    key: factKeySchema,
    category: z.enum([
      "HARD_CONSTRAINT",
      "SOFT_PREFERENCE",
      "USAGE_CONTEXT",
      "BUDGET_CONTEXT",
      "REJECTION",
      "CORRECTION",
      "UNRESOLVED",
      "CONVERSATIONAL_REPAIR",
    ]),
    evaluability: z.enum([
      "EVALUABLE_NOW",
      "UNDERSTOOD_NOT_EVALUABLE",
      "NEEDS_CLARIFICATION",
      "CONFLICTING",
      "SUPERSEDED",
    ]),
    valueText: z.string().max(200),
    numericValue: z.number().nullable(),
    isNew: z.boolean(),
  })).max(12),
  readyToEvaluate: z.boolean(),
  readyToEvaluateReason: z.string().max(300),
  nextAction: z.enum(["ASK", "EVALUATE", "REPAIR", "REDIRECT", "LIMIT"]),
  questionPurpose: z.enum([
    "PRIMARY_USAGE",
    "USAGE_DETAIL",
    "BUDGET_MAX",
    "MIN_SEATS",
    "MIN_CARGO",
    "PARTY_CONFIRMATION",
    "DAILY_VS_OFFROAD",
    "EQUIPMENT_SCOPE",
    "BODY_TYPE",
    "DRIVETRAIN",
    "SIZE",
    "REJECTION_DIAGNOSTIC",
    "OFF_TOPIC_REDIRECT",
    "FINAL_PRIORITY",
    "NONE",
  ]),
  options: z.array(z.object({
    id: z.string().min(1).max(40),
    label: z.string().min(1).max(80),
    semanticValue: z.string().min(1).max(80),
  })).max(4),
  assistantMessage: z.string().min(1).max(900),
});

export type CarsConversationTurnPlan = z.infer<typeof turnPlanSchema>;

const SYSTEM_INSTRUCTIONS = [
  "You are Expiya Cars, a warm, attentive Turkish automotive decision companion.",
  "Respond to the meaning of the latest user message first. Do not open with a canned acknowledgement.",
  "Never invent vehicle facts, prices, trims, scores, or a final winner. Governed code decides the car.",
  "Supported evaluation dimensions today are only numeric minimum seats and cargo litres. Understand and store other facts, but do not pretend they were evaluated.",
  "Do not run a checklist. Choose at most one highest-value conversational move.",
  "Do not repeat a question purpose already answered unless the user corrected it or introduced a real new ambiguity.",
  "Never ask the generic final-priority question about a non-negotiable feature.",
  "Short answers such as evet, hayır, ilki, o olsun bind to the active question or option set.",
  "If the user is frustrated, repair: recall the specific stored facts, do not defend, do not repeat the question.",
  "If the user is off-topic, briefly redirect and keep car context.",
  "If the first message already contains evaluable seats and cargo, set nextAction=EVALUATE and do not ask a lifestyle question.",
  "Sound human: specific, curious when useful, lightly witty only when it fits, never robotic.",
  "Forbidden as default templates: Anladım. Not ettim. Kararı gerçekten değiştirecek son noktayı netleştirelim. Sizin için vazgeçilmez özellik nedir? Aynı soruyu tekrarlamayayım. Günlük hayatınızdan bir örnek verir misiniz?",
  "Reply only in Turkish. The assistantMessage is the user-visible reply.",
  "options are optional discovery quick replies, not a final discriminator.",
].join("\n");

export interface PlanCarsConversationTurnInput {
  readonly conversationId: string;
  readonly messages: readonly CarsConversationMessage[];
  readonly memory: CarsConversationTrace;
  readonly remainingUserTurns: number;
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

export async function planCarsConversationTurn(
  input: PlanCarsConversationTurnInput,
): Promise<CarsConversationTurnPlan | undefined> {
  try {
    const transcript = input.messages.map((message) => ({ role: message.role, content: message.content }));
    const payload = {
      remainingUserTurns: input.remainingUserTurns,
      memory: {
        phase: input.memory.phase,
        requirements: input.memory.requirements,
        askedQuestionPurposes: input.memory.askedQuestionPurposes,
        answeredQuestionPurposes: input.memory.answeredQuestionPurposes,
        lastAssistantQuestion: input.memory.lastAssistantQuestion,
        activeOptionSet: input.memory.activeOptionSet,
        capturedOnLatestTurn: input.memory.capturedOnLatestTurn,
      },
      supportedDecisionDimensions: ["MIN_SEATS", "MIN_CARGO_L"],
      transcript,
    };

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const model = attempt === 0 ? "gpt-5.6" : "gpt-5.5";
      try {
        const response = await getOpenAIClient().responses.parse({
          model,
          store: false,
          max_output_tokens: attempt === 0 ? 2_500 : 1_200,
          ...(attempt === 0
            ? {
              reasoning: { effort: "low" as const },
              prompt_cache_key: "expiya-cars-conversation-turn-v1",
            }
            : {}),
          safety_identifier: createHash("sha256").update(input.conversationId).digest("hex"),
          input: [
            { role: "system", content: SYSTEM_INSTRUCTIONS },
            { role: "user", content: JSON.stringify(payload) },
          ],
          text: {
            format: zodTextFormat(turnPlanSchema, "cars_conversation_turn_plan"),
            ...(attempt === 0 ? { verbosity: "medium" as const } : {}),
          },
        }, { timeout: 20_000 });
        if (response.output_parsed) return turnPlanSchema.parse(response.output_parsed);
        logPlannerFailure(model, attempt, { status: response.status, code: response.incomplete_details?.reason });
      } catch (error) {
        const failed = error as { status?: number; error?: { code?: string } };
        logPlannerFailure(model, attempt, { status: failed.status, code: failed.error?.code });
        if (attempt === 0) continue;
        return undefined;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}
