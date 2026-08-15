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
      "SOCIAL_OPEN",
      "COLLECTING_CONTEXT",
      "CLARIFICATION_REQUIRED",
      "FINAL_DISCRIMINATOR_REQUIRED",
      "OFFER_AWAITING_CONSENT",
      "DECISION_READY",
      "RECOMMENDATION_SHOWN",
      "SOCIAL_DETOUR",
      "INSUFFICIENT_SUPPORTED_EVIDENCE",
      "NO_SUPPORTED_CANDIDATE",
      "SYSTEM_FAILURE",
    ]),
    phase: z.enum([
      "SOCIAL_OPEN",
      "DISCOVERING",
      "CLARIFYING",
      "READY_TO_EVALUATE",
      "EVALUATING",
      "FINAL_TRADEOFF",
      "OFFERING",
      "DECISION_READY",
      "RECOMMENDATION_SHOWN",
      "RECOMMENDATION_DECLINED",
      "RECOMMENDATION_REJECTED",
      "SOCIAL_DETOUR",
      "PAUSED",
      "LIMITED_BY_EVIDENCE",
      "RECOVERING",
    ]),
    advisorStage: z.enum([
      "SOCIAL_OPEN", "VEHICLE_INTENT", "CONTEXT_UNDERSTANDING", "TRADEOFF_RESOLUTION",
      "HUMAN_READY", "NOT_RECOMMENDABLE", "AUTHORIZED_CANDIDATE_HELD", "OFFER_AWAITING_CONSENT",
      "RECOMMENDATION_SHOWN", "RECOMMENDATION_DECLINED", "RECOMMENDATION_REJECTED",
      "SOCIAL_DETOUR", "RECOVERY", "PAUSED", "SYSTEM_LIMITED",
    ]).optional(),
    vehicleIntentEstablished: z.boolean().optional(),
    humanReady: z.boolean().optional(),
    governedReady: z.boolean().optional(),
    recommendationOfferStatus: z.enum(["NONE", "AWAITING_CONSENT", "DECLINED", "REVEALED", "INVALIDATED"]).optional(),
    heldAuthorization: z.string().max(8_000).optional(),
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
        "HARD_UNEVALUATED_CONSTRAINT",
        "SOFT_PREFERENCE",
        "SOFT_CONTEXT",
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
    questionMemory: z.array(z.object({
      purpose: questionPurposeSchema,
      prompt: z.string().max(900),
      status: z.enum(["OPEN", "ANSWERED", "DEFERRED", "SUPERSEDED", "NO_LONGER_MATERIAL"]),
      sourceAssistantTurn: z.number().int().nonnegative(),
      updatedOnUserTurn: z.number().int().nonnegative().optional(),
      transitionReason: z.string().max(300).optional(),
    })).max(40).optional(),
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
    addressForm: z.enum(["SEN", "SIZ"]).optional(),
    turnProvenance: z.object({
      modelAttempted: z.boolean(),
      requestedModel: z.string().max(40).optional(),
      selectedModel: z.string().max(40).optional(),
      structuredPlan: z.boolean(),
      parseOutcome: z.enum(["SUCCESS", "EMPTY", "SCHEMA_FAILURE", "UNAVAILABLE", "NOT_ATTEMPTED"]).optional(),
      userFacingOrigin: z.enum(["MODEL", "DETERMINISTIC_EVIDENCE", "BOUNDED_FALLBACK", "DETERMINISTIC_REPAIR"]),
      deterministicOverride: z.boolean(),
      fallbackReason: z.string().max(120).optional(),
      conversationMove: z.string().max(80).optional(),
      nextQuestionPurpose: questionPurposeSchema.optional(),
      latestMessageAcknowledged: z.boolean(),
      latestPrimaryAct: z.string().max(80).optional(),
      advisorStage: z.string().max(40).optional(),
      forwardProgressType: z.string().max(80).optional(),
      newInformationComparedWithRecentTurns: z.boolean().optional(),
      directQuestionAnswered: z.boolean().optional(),
      semanticRepetitionDetected: z.boolean().optional(),
      repairApplied: z.boolean().optional(),
      directRecommendationCoverage: z.enum([
        "DIRECT_RECOMMENDATION_SUPPORTED",
        "DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE",
        "DIRECT_RECOMMENDATION_NEEDS_ONE_MATERIAL_FACT",
      ]).optional(),
      budgetEvaluated: z.boolean().optional(),
      unevaluatedBudgetPresent: z.boolean().optional(),
      heldDespiteUnevaluatedBudget: z.boolean().optional(),
      hardUnevaluatedConstraints: z.array(z.string().max(40)).max(12).optional(),
      recommendationBlockedByHardConstraint: z.boolean().optional(),
      blockedConstraintKinds: z.array(z.string().max(40)).max(8).optional(),
      candidateHeld: z.boolean().optional(),
      offerAuthorized: z.boolean().optional(),
      cardRevealAuthorized: z.boolean().optional(),
    }).optional(),
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
