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
  latestMessageInterpretation: z.string().min(1).max(400),
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
  newFacts: z.array(z.object({
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
  corrections: z.array(z.string().max(200)).max(6),
  confirmedAnswers: z.array(z.string().max(200)).max(6),
  rejectedAssumptions: z.array(z.string().max(200)).max(6),
  answeredQuestionPurpose: z.enum([
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
  stillOpenQuestionPurposes: z.array(z.enum([
    "PRIMARY_USAGE", "USAGE_DETAIL", "BUDGET_MAX", "MIN_SEATS", "MIN_CARGO",
    "PARTY_CONFIRMATION", "DAILY_VS_OFFROAD", "EQUIPMENT_SCOPE", "BODY_TYPE",
    "DRIVETRAIN", "SIZE", "REJECTION_DIAGNOSTIC", "OFF_TOPIC_REDIRECT", "FINAL_PRIORITY",
  ])).max(8),
  conversationMove: z.enum([
    "ACKNOWLEDGE_AND_EXPLORE", "ACKNOWLEDGE_AND_CLARIFY", "REFLECT_TRADEOFF",
    "SUMMARIZE_AND_CONFIRM", "PROCEED_TO_EVALUATION", "EXPLAIN_DECISION_LIMIT",
    "REPAIR_MISUNDERSTANDING", "REDIRECT",
  ]),
  nextQuestionPurpose: z.enum([
    "PRIMARY_USAGE", "USAGE_DETAIL", "BUDGET_MAX", "MIN_SEATS", "MIN_CARGO",
    "PARTY_CONFIRMATION", "DAILY_VS_OFFROAD", "EQUIPMENT_SCOPE", "BODY_TYPE",
    "DRIVETRAIN", "SIZE", "REJECTION_DIAGNOSTIC", "OFF_TOPIC_REDIRECT", "FINAL_PRIORITY", "NONE",
  ]),
  whyThisQuestionNow: z.string().max(300),
  decisionReadiness: z.object({ ready: z.boolean(), reason: z.string().max(300) }),
  unsupportedButUnderstood: z.array(factKeySchema).max(12),
  options: z.array(z.object({
    id: z.string().min(1).max(40),
    label: z.string().min(1).max(80),
    semanticValue: z.string().min(1).max(80),
  })).max(4),
  assistantMessage: z.string().min(1).max(900),
});

export type CarsConversationTurnPlan = z.infer<typeof turnPlanSchema> & { readonly plannerModel: string };

const SYSTEM_INSTRUCTIONS = [
  "You are Expiya Cars, a warm, attentive Turkish automotive decision companion.",
  "Respond to the meaning of the latest user message first. Do not open with a canned acknowledgement.",
  "Never invent vehicle facts, prices, trims, scores, or a final winner. Governed code decides the car.",
  "Supported evaluation dimensions today are only numeric minimum seats and cargo litres. Keep this internal during discovery. Understand and store other facts, but do not pretend they were evaluated.",
  "The deterministic memory snapshot is authoritative. Your job is conversation strategy and the final natural realization, not database narration.",
  "Respond to the specific last message first; make at least one new concrete fact or conversational act perceptibly heard.",
  "A user may answer with useful information that does not answer the last question. Acknowledge it, keep that question open/deferred, and resume it only if it remains material.",
  "Do not mention unsupported data or evidence limitations during discovery unless the user directly requests evaluation on that criterion, a decision is imminent and it is material, or no honest next move remains.",
  "Ask about real life before schema-shaped numbers: cargo means camping equipment, stroller, suitcases, tools, or cargo with rear seats occupied. Do not demand litres unless the user already uses litres or evaluation truly requires it.",
  "Use the user's framing sparingly, expose a meaningful trade-off when one exists, and ask at most one focused question.",
  "Vary sentence openings. Avoid status-report language and generic acknowledgements. Never narrate internal memory or list every stored field.",
  "Keep Turkish conversational and automotive-advisor-like, not bureaucratic.",
  "Do not run a checklist. Choose at most one highest-value conversational move.",
  "Do not repeat a question purpose already answered unless the user corrected it or introduced a real new ambiguity.",
  "Never ask the generic final-priority question about a non-negotiable feature.",
  "Short answers such as evet, hayır, ilki, o olsun bind to the active question or option set.",
  "If the user is frustrated, repair: recall the specific stored facts, do not defend, do not repeat the question.",
  "If the user is off-topic, briefly redirect and keep car context.",
  "If the first message already contains evaluable seats and cargo, set conversationMove=PROCEED_TO_EVALUATION and do not ask a lifestyle question.",
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
      supportedDecisionDimensionsInternalOnly: ["MIN_SEATS", "MIN_CARGO_L"],
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
              prompt_cache_key: "expiya-cars-conversation-turn-v2",
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
        if (response.output_parsed) return { ...turnPlanSchema.parse(response.output_parsed), plannerModel: model };
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
