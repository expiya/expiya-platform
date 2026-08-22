import { z } from "zod";
import { after } from "next/server";

import { runCarsConversationTurn } from "@/features/decision/conversation/runCarsConversationTurn";
import { planAutomotiveKnowledgeResponse, planSimplifiedAutomotiveKnowledgeFollowUp, planSupportiveAutomotiveKnowledgeResponse } from "@/features/automotive-knowledge";
import { isOfferDeclineText } from "@/features/decision/conversation/carsSocialIntent";
import { evaluateCarsDecisionV2ShadowAfterResponse } from "@/features/decision/v2/integration/routeShadow.server";
import { tryRunCarsDecisionV2Public } from "@/features/decision/v2/integration/publicRoute.server";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";
import type { CarsConversationRequest } from "@/types/carsConversation";
import { RECOMMENDATION_TERMS_VERSION } from "@/lib/legal/recommendationTerms";
import {
  CARS_CONVERSATION_AVAILABILITY,
  isPublicCarsConversationEnabled,
} from "@/features/decision/conversation/carsConversationAvailability";
import { pilotSessionFromRequest } from "@/features/pilot/pilotSession.server";

const builtInQuestionPurposeSchema = z.enum([
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
  "TRANSMISSION",
  "FUEL",
  "SIZE",
  "REJECTION_DIAGNOSTIC",
  "OFF_TOPIC_REDIRECT",
  "FINAL_PRIORITY",
  "ACQUISITION_MARKET",
  "PERSONA",
]);
const questionPurposeSchema = z.union([
  builtInQuestionPurposeSchema,
  z.string().regex(/^CATALOG_FACET:[A-Za-z0-9_]+$/).max(80),
]);

const optionSetSchema = z.object({
  id: z.string().min(1).max(80),
  purpose: questionPurposeSchema,
  options: z.array(z.object({
    id: z.string().min(1).max(40),
    label: z.string().min(1).max(80),
    semanticValue: z.string().min(1).max(80),
  })).max(6),
  sourceAssistantTurn: z.number().int().nonnegative(),
  active: z.boolean(),
  selectedOptionId: z.string().max(40).optional(),
  selectionSource: z.enum(["button", "text", "paraphrase", "confirmation", "ordinal"]).optional(),
});

const requestSchema = z.object({
  conversationId: z.string().min(1).max(100),
  recommendationTermsAcceptance: z.object({
    version: z.literal(RECOMMENDATION_TERMS_VERSION),
    acceptedAt: z.string().datetime(),
  }).optional(),
  choiceId: z.enum(["MAX_SEATS", "MAX_CARGO"]).optional(),
  selectedOptionId: z.string().min(1).max(80).optional(),
  selectedOptionIds: z.array(z.string().min(1).max(80)).min(1).max(5).optional(),
  v2OfferToken: z.string().min(1).max(8_000).optional(),
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
    acquisitionMarket: z.enum(["UNRESOLVED", "NEW_ONLY", "USED_ONLY", "NEW_OR_USED"]).optional(),
    affordabilityState: z.enum([
      "AFFORDABILITY_NOT_REQUESTED",
      "AFFORDABILITY_MARKET_UNRESOLVED",
      "AFFORDABILITY_EVALUATION_UNAVAILABLE",
      "AFFORDABILITY_PASS",
      "AFFORDABILITY_FAIL",
      "AFFORDABILITY_UNKNOWN",
    ]).optional(),
    recommendationLevel: z.enum([
      "MODEL_FIT_GUIDANCE",
      "NEW_CONFIGURATION_RECOMMENDATION",
      "USED_MODEL_GUIDANCE",
      "LISTING_ANALYSIS_ONLY",
      "PURCHASABLE_UNIT_RECOMMENDATION",
    ]).optional(),
    offerPurpose: z.enum(["MODEL_FIT_OFFER", "NEW_CONFIGURATION_OFFER", "PURCHASE_OPTION_OFFER", "NO_AFFORDABLE_MATCH"]).optional(),
    shownCandidate: z.object({
      runtimeVehicleCandidateId: z.string().max(80),
      vehicleVariantId: z.string().max(80),
      revealedOnUserTurn: z.number().int().nonnegative(),
    }).optional(),
    usedPurchaseRequestDetected: z.boolean().optional(),
    usedScopeBoundaryStated: z.boolean().optional(),
    noAffordableMatchStatus: z.enum([
      "NO_AFFORDABLE_EXACT_MATCH",
      "NEAREST_OVER_BUDGET_AVAILABLE",
      "PRICE_UNKNOWN_FOR_TECHNICAL_MATCH",
    ]).optional(),
    priceEvaluations: z.array(z.object({
      candidateId: z.string().max(80),
      catalogVariantId: z.string().max(80),
      priceObservationId: z.string().max(80).optional(),
      amountTry: z.number().optional(),
      priceType: z.enum(["LIST", "CAMPAIGN", "ASKING", "TRANSACTION", "VALUATION", "ESTIMATE"]).optional(),
      validityStatus: z.enum(["CURRENT", "EXPIRED", "NOT_YET_VALID", "ABSENT", "NOT_EVALUATED"]),
      sourceAuthorityResult: z.enum(["AUTHORITATIVE", "INSUFFICIENT"]),
      campaignApplicabilityResult: z.enum(["NOT_CAMPAIGN", "GENERALLY_APPLICABLE", "CONDITIONAL", "UNKNOWN"]),
      feeInclusionUncertainty: z.boolean(),
      budgetCeilingTry: z.number().optional(),
      result: z.enum(["PASS", "FAIL", "UNKNOWN", "NOT_REQUESTED"]),
      reasonCode: z.string().max(80),
    })).max(12).optional(),
    personaPreference: z.object({
      activated: z.boolean(),
      activationSource: z.enum(["USER_EXPLICIT", "ADVISOR_PROMPT_RESPONSE"]).optional(),
      requestedTraits: z.array(z.enum(["DESIGN", "DRIVING_ENGAGEMENT", "COMFORT", "PRACTICALITY", "TECHNOLOGY", "PRESTIGE", "VALUE", "ADVENTURE", "FAMILY", "URBAN", "COMMERCIAL", "SUSTAINABILITY", "MINIMALISM"])).max(13),
      sourceTurn: z.number().int().positive().optional(),
    }).optional(),
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
      acquisitionMarket: z.enum(["UNRESOLVED", "NEW_ONLY", "USED_ONLY", "NEW_OR_USED"]).optional(),
      recommendationLevel: z.enum([
        "MODEL_FIT_GUIDANCE",
        "NEW_CONFIGURATION_RECOMMENDATION",
        "USED_MODEL_GUIDANCE",
        "LISTING_ANALYSIS_ONLY",
        "PURCHASABLE_UNIT_RECOMMENDATION",
      ]).optional(),
      affordabilityState: z.enum([
        "AFFORDABILITY_NOT_REQUESTED",
        "AFFORDABILITY_MARKET_UNRESOLVED",
        "AFFORDABILITY_EVALUATION_UNAVAILABLE",
        "AFFORDABILITY_PASS",
        "AFFORDABILITY_FAIL",
        "AFFORDABILITY_UNKNOWN",
      ]).optional(),
      offerPurpose: z.enum(["MODEL_FIT_OFFER", "NEW_CONFIGURATION_OFFER", "PURCHASE_OPTION_OFFER", "NO_AFFORDABLE_MATCH"]).optional(),
      decisionKind: z.enum(["VEHICLE_FIT", "ACQUISITION_FIT"]).optional(),
      affordabilityClaimAuthorized: z.boolean().optional(),
      purchasableUnitAuthorized: z.boolean().optional(),
      modelFitAuthorized: z.boolean().optional(),
      listingClaimDetected: z.boolean().optional(),
      usedPurchaseRequestDetected: z.boolean().optional(),
      listingUrlSubmissionDetected: z.boolean().optional(),
      directAffordabilityQuestionDetected: z.boolean().optional(),
      priceEvaluationRequested: z.boolean().optional(),
      budgetCeilingTry: z.number().optional(),
      candidateSetBeforePriceFilter: z.array(z.string().max(80)).max(12).optional(),
      candidateSetAfterPriceFilter: z.array(z.string().max(80)).max(12).optional(),
      selectedDeterministicCandidate: z.string().max(80).optional(),
      noAffordableMatchStatus: z.enum([
        "NO_AFFORDABLE_EXACT_MATCH",
        "NEAREST_OVER_BUDGET_AVAILABLE",
        "PRICE_UNKNOWN_FOR_TECHNICAL_MATCH",
      ]).optional(),
      nearestVerifiedPriceGapTry: z.number().optional(),
      nearestVerifiedPriceGapPercent: z.number().optional(),
      shownCandidateKnown: z.boolean().optional(),
      activePhase1Market: z.enum(["UNRESOLVED", "NEW_ONLY", "USED_ONLY", "NEW_OR_USED"]).optional(),
      personaActivated: z.boolean().optional(),
      activationSource: z.enum(["USER_EXPLICIT", "ADVISOR_PROMPT_RESPONSE"]).optional(),
      requestedPersonaTraits: z.array(z.enum(["DESIGN", "DRIVING_ENGAGEMENT", "COMFORT", "PRACTICALITY", "TECHNOLOGY", "PRESTIGE", "VALUE", "ADVENTURE", "FAMILY", "URBAN", "COMMERCIAL", "SUSTAINABILITY", "MINIMALISM"])).max(13).optional(),
      matchedPersonaTraits: z.array(z.enum(["DESIGN", "DRIVING_ENGAGEMENT", "COMFORT", "PRACTICALITY", "TECHNOLOGY", "PRESTIGE", "VALUE", "ADVENTURE", "FAMILY", "URBAN", "COMMERCIAL", "SUSTAINABILITY", "MINIMALISM"])).max(13).optional(),
      personaScore: z.number().int().nonnegative().optional(),
      affectedRanking: z.boolean().optional(),
      sourceAuthority: z.literal("OWNER_EDITORIAL").optional(),
      decisionUse: z.literal("SOFT_PREFERENCE_ONLY").optional(),
    }).optional(),
  }).optional(),
  messages: z.array(z.object({
    id: z.string().min(1).max(100),
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
    recommendationTermsAcceptance: z.object({
      version: z.literal(RECOMMENDATION_TERMS_VERSION),
      acceptedAt: z.string().datetime(),
    }).optional(),
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
  })).min(1).max(500),
});

export async function POST(request: Request): Promise<Response> {
  const originRejected = verifySameOrigin(request);
  if (originRejected) return originRejected;
  const pilotSession = pilotSessionFromRequest(request);
  if (!isPublicCarsConversationEnabled(process.env, Boolean(pilotSession))) {
    return Response.json({
      message: CARS_CONVERSATION_AVAILABILITY.message,
      reasonCode: CARS_CONVERSATION_AVAILABILITY.reasonCode,
      retryable: false,
    }, {
      status: 503,
      headers: { "Retry-After": "86400" },
    });
  }
  if (!pilotSession) {
    const rejected = await enforceRateLimit(request, { scope: "cars-conversation", limit: 20, windowMs: 10 * 60_000 });
    if (rejected) return rejected;
  }
  try {
    const input = requestSchema.parse(await readJsonWithLimit(request, pilotSession ? 1_500_000 : 150_000));
    const latestKnowledgeUser = [...input.messages].reverse().find((message) => message.role === "user");
    const priorKnowledgeUser = latestKnowledgeUser
      ? [...input.messages].slice(0, input.messages.lastIndexOf(latestKnowledgeUser)).reverse().find((message) => message.role === "user")
      : undefined;
    const knowledgeResponse = latestKnowledgeUser
      ? planSimplifiedAutomotiveKnowledgeFollowUp({ userText: latestKnowledgeUser.content, priorUserText: priorKnowledgeUser?.content })
        ?? planAutomotiveKnowledgeResponse(latestKnowledgeUser.content)
      : undefined;
    const supportiveKnowledge = latestKnowledgeUser
      ? planSupportiveAutomotiveKnowledgeResponse(latestKnowledgeUser.content)
      : undefined;
    if (knowledgeResponse) {
      return Response.json({
        kind: "QUESTION",
        message: knowledgeResponse.message,
        knowledge: knowledgeResponse,
        // An informational detour must preserve the exact decision state. The
        // client can therefore re-render an open option set without treating
        // the knowledge answer as a decision turn.
        conversation: input.conversation,
        informationalDetour: Boolean(input.conversation),
      });
    }
    const awaitingRecommendationTerms = input.conversation?.state === "OFFER_AWAITING_CONSENT";
    const latestUser = [...input.messages].reverse().find((message) => message.role === "user");
    if (awaitingRecommendationTerms
      && !latestUser?.recommendationTermsAcceptance
      && !isOfferDeclineText(latestUser?.content ?? "")) {
      return Response.json(
        { message: "Araç kartını görmek için güncel Araç Önerisi ve Katalog Kullanım Koşulları'nı ayrıca kabul etmeniz gerekir." },
        { status: 409 },
      );
    }
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
    if (!pilotSession) {
      const conversationRejected = await enforceRateLimit(request, { scope: "cars-conversation-id", subject: input.conversationId, limit: 24, windowMs: 60 * 60_000 });
      if (conversationRejected) return conversationRejected;
    }
    let v2Response = null;
    try {
      v2Response = await tryRunCarsDecisionV2Public(input, request.signal);
    } catch (v2Error) {
      const safeCode = v2Error instanceof Error && /^[A-Z0-9_:,-]{1,160}$/u.test(v2Error.message) ? v2Error.message : undefined;
      if (safeCode?.startsWith("V2_OPTION_SELECTION_")) return Response.json({ message: "Bu seçim artık geçerli değil; lütfen sunulan seçeneklerden yeniden seçim yapın." }, { status: 409 });
      console.info("cars_decision_v2_public_fallback", { errorClass: v2Error instanceof Error ? v2Error.name : "UNKNOWN", ...(safeCode ? { errorCode: safeCode } : {}) });
      if (process.env.CARS_DECISION_V2_PUBLIC === "true") {
        return Response.json({ message: "Araç danışmanı şu anda geçici olarak kullanılamıyor. Lütfen kısa bir süre sonra yeniden deneyin." }, { status: 503 });
      }
    }
    if (v2Response) return Response.json(supportiveKnowledge
      ? { ...v2Response, message: `${supportiveKnowledge.message}\n\nAraç seçimine devam edelim mi?`, options: [], cards: [], offer: undefined, knowledgeSupport: supportiveKnowledge }
      : v2Response);
    const response = await runCarsConversationTurn(input as CarsConversationRequest);
    try {
      after(() => evaluateCarsDecisionV2ShadowAfterResponse(input));
    } catch {
      // Unit and non-Next runtimes have no request work store; public V1 remains unaffected.
    }
    return Response.json(supportiveKnowledge
      ? { ...response, message: `${supportiveKnowledge.message}\n\nAraç seçimine devam edelim mi?`, options: [], recommendations: [], knowledgeSupport: supportiveKnowledge }
      : response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const emptyMessage = error.issues.some((issue) => issue.path.at(-1) === "content" && issue.code === "too_small");
      return Response.json(
        { message: emptyMessage
          ? "Lütfen devam etmek için boş olmayan bir mesaj gönderin."
          : "Konuşma durumu doğrulanamadı. Sayfayı yenileyip son mesajınızı yeniden gönderin." },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError || error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
      return Response.json({ message: "İstek okunamadı. Lütfen yeniden deneyin." }, { status: 400 });
    }

    return Response.json(
      { message: "The conversation could not be processed. Please try again." },
      { status: 500 },
    );
  }
}
