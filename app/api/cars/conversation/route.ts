import { z } from "zod";

import { runCarsConversationTurn } from "@/features/decision/conversation/runCarsConversationTurn";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";
import type { CarsConversationRequest } from "@/types/carsConversation";

const questionPurposeSchema = z.enum([
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
]);

const optionSetSchema = z.object({
  id: z.string().min(1).max(80),
  purpose: questionPurposeSchema,
  options: z.array(z.object({
    id: z.string().min(1).max(40),
    label: z.string().min(1).max(80),
    semanticValue: z.string().min(1).max(80),
  })).max(4),
  sourceAssistantTurn: z.number().int().nonnegative(),
  active: z.boolean(),
  selectedOptionId: z.string().max(40).optional(),
  selectionSource: z.enum(["button", "text", "paraphrase", "confirmation", "ordinal"]).optional(),
});

const requestSchema = z.object({
  conversationId: z.string().min(1).max(100),
  choiceId: z.enum(["MAX_SEATS", "MAX_CARGO"]).optional(),
  selectedOptionId: z.string().min(1).max(80).optional(),
  conversation: z.object({
    version: z.literal(1),
    state: z.enum([
      "COLLECTING_CONTEXT",
      "CLARIFICATION_REQUIRED",
      "FINAL_DISCRIMINATOR_REQUIRED",
      "DECISION_READY",
      "INSUFFICIENT_SUPPORTED_EVIDENCE",
      "NO_SUPPORTED_CANDIDATE",
      "SYSTEM_FAILURE",
    ]),
    phase: z.enum([
      "DISCOVERING",
      "CLARIFYING",
      "READY_TO_EVALUATE",
      "EVALUATING",
      "FINAL_TRADEOFF",
      "DECISION_READY",
      "LIMITED_BY_EVIDENCE",
      "RECOVERING",
    ]),
    requirements: z.array(z.object({
      key: z.string().min(1).max(40),
      value: z.union([z.string().max(80), z.number()]),
      status: z.enum([
        "SUPPORTED_EVALUABLE",
        "SUPPORTED_NOT_YET_EVALUABLE",
        "UNDERSTOOD_BUT_UNSUPPORTED",
        "NEEDS_CLARIFICATION",
      ]),
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
      sourceTurn: z.number().int().positive(),
      sourceText: z.string().max(4_000),
      previousValue: z.union([z.string().max(80), z.number()]).optional(),
      usedInDecision: z.boolean(),
      confirmedFromAssistantTurn: z.number().int().nonnegative().optional(),
    })).max(40),
    askedQuestionPurposes: z.array(questionPurposeSchema).max(20),
    answeredQuestionPurposes: z.array(questionPurposeSchema).max(20),
    latestUserTurn: z.number().int().nonnegative(),
    capturedOnLatestTurn: z.array(z.string().max(40)).max(20),
    didConversationProgress: z.boolean(),
    textInputAllowed: z.boolean(),
    lastAssistantQuestion: z.object({
      purpose: questionPurposeSchema,
      prompt: z.string().max(900),
      pendingValue: z.union([z.string().max(80), z.number()]).optional(),
      yesImplies: z.object({ key: z.string().max(40), value: z.union([z.string().max(80), z.number()]) }).optional(),
      noImplies: z.object({ key: z.string().max(40), value: z.union([z.string().max(80), z.number()]) }).optional(),
    }).optional(),
    activeOptionSet: optionSetSchema.optional(),
    optionHistory: z.array(optionSetSchema).max(20),
    rejectedRecommendationIds: z.array(z.string().max(100)).max(12),
    lastProgressEvent: z.string().max(80).optional(),
    semanticFingerprint: z.string().max(4_000),
    loopCount: z.number().int().nonnegative(),
  }).optional(),
  messages: z.array(z.object({
    id: z.string().min(1).max(100),
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
    optionSet: optionSetSchema.optional(),
    discriminatorChoices: z.array(z.object({
      id: z.enum(["MAX_SEATS", "MAX_CARGO"]),
      label: z.string().trim().min(1).max(100),
    })).max(3).optional(),
    recommendationIds: z.array(z.string().min(1).max(100)).max(3).optional(),
    satisfaction: z.enum(["HELPFUL", "NOT_HELPFUL"]).optional(),
    sellerResearchRequest: z.object({
      province: z.string().min(1).max(100),
      district: z.string().min(1).max(100),
      status: z.literal("PLANNED_V0_2"),
    }).optional(),
  })).min(1).max(80),
});

export async function POST(request: Request): Promise<Response> {
  const originRejected = verifySameOrigin(request);
  if (originRejected) return originRejected;
  const rejected = await enforceRateLimit(request, { scope: "cars-conversation", limit: 20, windowMs: 10 * 60_000 });
  if (rejected) return rejected;
  try {
    const input = requestSchema.parse(await readJsonWithLimit(request, 150_000));
    const latestAssistant = [...input.messages].reverse().find((message) => message.role === "assistant");
    const activeChoices = latestAssistant?.discriminatorChoices;
    if (activeChoices?.length) {
      if (!input.choiceId || !activeChoices.some((choice) => choice.id === input.choiceId)) {
        return Response.json(
          { message: "Bu adımda yalnızca sunulan karar seçeneklerinden biri kullanılabilir." },
          { status: 409 },
        );
      }
    } else if (input.choiceId) {
      return Response.json(
        { message: "Bu karar seçeneği mevcut conversation state için geçerli değil." },
        { status: 409 },
      );
    }
    const conversationRejected = await enforceRateLimit(request, { scope: "cars-conversation-id", subject: input.conversationId, limit: 24, windowMs: 60 * 60_000 });
    if (conversationRejected) return conversationRejected;
    const response = await runCarsConversationTurn(input as CarsConversationRequest);
    return Response.json(response);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
      return Response.json(
        { message: "Please send a non-empty message to continue." },
        { status: 400 },
      );
    }

    return Response.json(
      { message: "The conversation could not be processed. Please try again." },
      { status: 500 },
    );
  }
}
