import { randomUUID } from "node:crypto";

import { runCarsRuntime } from "@/features/decision/runtime/runCarsRuntime";
import {
  deriveCarsEvidenceBackedRequirementsFromQuery,
  runCarsEvidenceBackedDecision,
  type CarsEvidenceBackedDecisionResult,
} from "@/features/decision/runtime/runCarsEvidenceBackedDecision";
import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import type {
  CarsActiveOptionSet,
  CarsConversationRequest,
  CarsConversationResponse,
  CarsConversationTrace,
  CarsQuestionPurpose,
  CarsRequirementKey,
  CarsTurnProvenance,
} from "@/types/carsConversation";

import { assessCarsConversationSufficiency } from "./assessCarsConversationSufficiency";
import { conversationStateFromPhase, withAdvisorStage } from "./carsAdvisorState";
import { buildCarsConversationQuery } from "./buildCarsConversationQuery";
import {
  createCarsClarificationRepair,
  isCarsClarificationRepair,
} from "./carsConversationRepair";
import {
  applyAssistantMove,
  closeDeferredQuestions,
  hydrateCarsConversationMemory,
} from "./carsConversationMemory";
import { extractDeterministicFacts, isFrustration, upsertRequirement } from "./carsRequirementLedger";
import { cannotRepeatQuestion, isSemanticLoop } from "./carsSemanticLoopGuard";
import {
  createCarsBoundedRecovery,
  discoveryUsageOptions,
  FALLBACK_OFFER,
} from "./createCarsBoundedRecovery";
import { createCarsFollowUp } from "./createCarsFollowUp";
import { isCandidateComparisonConversation } from "./hasActionableCarsContext";
import {
  heldAuthorizationIsUsable,
  openHeldAuthorization,
  requirementFingerprint,
  resealHeldAuthorization,
  sealHeldAuthorization,
} from "./carsHeldAuthorization";
import { resolveCarsConversationModel } from "./carsConversationModelConfig";
import {
  planCarsConversationTurn,
  type CarsConversationTurnPlan,
  type PlanCarsConversationTurnInput,
  type PlanCarsConversationTurnResult,
} from "./planCarsConversationTurn";
import {
  presentGovernedRecommendation,
  unsupportedHardRequirementBlocksRecommendation,
  unverifiedPreferenceNote,
} from "./presentGovernedRecommendation";
import { evidenceDecisionProjection, messageRevealsCandidateIdentity } from "./publicCarsDecision";
import { interpretLatestUserAct, textHasVehicleIntent } from "./carsSocialIntent";
import { validateCarsConversationPlan } from "./validateCarsConversationPlan";

const MAX_USER_TURNS = 20;

async function planTurn(input: PlanCarsConversationTurnInput): Promise<PlanCarsConversationTurnResult> {
  const result = await planCarsConversationTurn(input);
  if (!result || typeof result !== "object" || !("requestedModel" in result)) {
    return {
      requestedModel: resolveCarsConversationModel().requestedModel,
      parseOutcome: "UNAVAILABLE",
      fallbackUsed: false,
    };
  }
  return result;
}

function applyPlanFacts(trace: CarsConversationTrace, plan: CarsConversationTurnPlan, sourceTurn: number, sourceText: string): CarsConversationTrace {
  const entries = new Map(trace.requirements.map((entry) => [entry.key, entry] as const));
  const captured = [...trace.capturedOnLatestTurn];
  for (const fact of plan.proposedMemoryChanges.newFacts) {
    const deterministicKeys = new Set(extractDeterministicFacts(sourceText).map((item) => item.key));
    if (deterministicKeys.has(fact.key) && (fact.key === "MIN_SEATS" || fact.key === "MIN_CARGO_L" || fact.key === "BUDGET_MAX_TRY")) {
      continue;
    }
    const value = fact.numericValue ?? fact.valueText;
    if (value === "" || value === null) continue;
    if (upsertRequirement(entries, {
      key: fact.key as CarsRequirementKey,
      value,
      sourceTurn,
      sourceText,
      category: fact.category,
      evaluability: fact.evaluability,
    })) captured.push(fact.key as CarsRequirementKey);
  }
  return {
    ...trace,
    requirements: [...entries.values()],
    capturedOnLatestTurn: [...new Set(captured)],
    didConversationProgress: captured.length > 0 || trace.didConversationProgress,
  };
}

function optionSetFromPlan(
  plan: CarsConversationTurnPlan,
  purpose: CarsQuestionPurpose,
  sourceAssistantTurn: number,
): CarsActiveOptionSet | undefined {
  if (plan.options.length === 0) return undefined;
  const mentioned = plan.options.filter((option) => plan.assistantMessage.includes(option.label));
  if (mentioned.length === 0) return undefined;
  return {
    id: `opt-${purpose}-${sourceAssistantTurn}`,
    purpose,
    options: mentioned,
    sourceAssistantTurn,
    active: true,
  };
}

function fallbackUsageOptions(purpose: CarsQuestionPurpose, turn: number, message?: string): CarsActiveOptionSet | undefined {
  if (purpose !== "USAGE_DETAIL") return undefined;
  if (message && !/kamp|stabilize|çamurlu|ciddi arazi|hangisine daha yakın/iu.test(message)) return undefined;
  return {
    id: `opt-usage-detail-${turn}`,
    purpose,
    options: discoveryUsageOptions,
    sourceAssistantTurn: turn,
    active: true,
  };
}

function withProvenance(trace: CarsConversationTrace, provenance: CarsTurnProvenance): CarsConversationTrace {
  return { ...trace, turnProvenance: provenance };
}

function evaluateGoverned(input: CarsConversationRequest): CarsEvidenceBackedDecisionResult {
  return runCarsEvidenceBackedDecision({
    query: buildCarsConversationQuery(input.messages),
    vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
    discriminatorChoiceId: input.choiceId,
  });
}

function invalidateHeld(memory: CarsConversationTrace): CarsConversationTrace {
  return {
    ...memory,
    heldAuthorization: resealHeldAuthorization(memory.heldAuthorization, "INVALIDATED") ?? memory.heldAuthorization,
    recommendationOfferStatus: memory.heldAuthorization ? "INVALIDATED" : "NONE",
    humanReady: false,
    governedReady: false,
    advisorStage: memory.vehicleIntentEstablished ? "CONTEXT_UNDERSTANDING" : memory.advisorStage,
  };
}

function holdAuthorizedCandidate(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
  result: CarsEvidenceBackedDecisionResult,
): CarsConversationTrace {
  const selected = result.candidateEvaluations.find((candidate) => (
    candidate.runtimeVehicleCandidateId === result.selectedRuntimeVehicleCandidateId
  ));
  if (!selected || !result.selectedRuntimeVehicleCandidateId) return memory;
  const token = sealHeldAuthorization({
    conversationId: input.conversationId,
    runtimeVehicleCandidateId: selected.runtimeVehicleCandidateId,
    vehicleVariantId: selected.vehicleVariantId,
    requirementFingerprint: requirementFingerprint(memory),
    discriminatorChoiceId: input.choiceId,
  });
  return closeDeferredQuestions({
    ...memory,
    heldAuthorization: token,
    recommendationOfferStatus: "AWAITING_CONSENT",
    governedReady: true,
    humanReady: true,
    advisorStage: "OFFER_AWAITING_CONSENT",
    phase: "OFFERING",
    state: "OFFER_AWAITING_CONSENT",
  }, "Governed authorization is ready; remaining discovery questions no longer change the winner.");
}

function revealAuthorizedCard(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
  message: string,
  provenance: CarsTurnProvenance,
): CarsConversationResponse {
  const opened = heldAuthorizationIsUsable({
    token: memory.heldAuthorization,
    conversationId: input.conversationId,
    memory,
    requireActiveOffer: true,
  });
  if (!opened) {
    const recovery = createCarsBoundedRecovery(memory, [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "");
    return {
      ...recovery.response,
      conversation: withProvenance(recovery.conversation, {
        ...provenance,
        userFacingOrigin: "BOUNDED_FALLBACK",
        fallbackReason: "OFFER_EXPIRED_OR_INVALID",
        deterministicOverride: false,
      }),
    };
  }
  const result = runCarsEvidenceBackedDecision({
    query: buildCarsConversationQuery(input.messages),
    vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
    discriminatorChoiceId: opened.discriminatorChoiceId ?? input.choiceId,
  });
  if (result.selectedRuntimeVehicleCandidateId !== opened.runtimeVehicleCandidateId) {
    const conversation = withProvenance(invalidateHeld(memory), {
      ...provenance,
      userFacingOrigin: "BOUNDED_FALLBACK",
      fallbackReason: "HELD_CANDIDATE_MISMATCH",
    });
    return { kind: "QUESTION", message: "Şartlar değiştiği için önceki öneriyi göstermiyorum. Güncel ihtiyaçlarınıza göre yeniden bakabiliriz.", conversation };
  }
  const recommendation = presentGovernedRecommendation({ result, authorization: opened, memory });
  const identity = `${recommendation.car.brand} ${recommendation.car.model}`.trim();
  const note = unverifiedPreferenceNote(memory);
  const reasons = recommendation.decision.reasons.slice(0, 3);
  const body = [
    identity ? `${message} ${identity}.` : message,
    reasons.join(" "),
    note,
  ].filter(Boolean).join("\n\n");
  const conversation = withProvenance(applyAssistantMove(memory, {
    phase: "RECOMMENDATION_SHOWN",
    prompt: body,
    progressEvent: "recommendation-revealed",
    advisorStage: "RECOMMENDATION_SHOWN",
    recommendationOfferStatus: "REVEALED",
    heldAuthorization: resealHeldAuthorization(memory.heldAuthorization, "REVEALED"),
    clearPendingQuestion: true,
    humanReady: true,
    governedReady: true,
  }), provenance);
  return {
    kind: "RECOMMENDATIONS",
    message: body,
    recommendations: [recommendation],
    decision: {
      ...evidenceDecisionProjection(result, { revealIdentity: true, recommendationOfferStatus: "REVEALED" }),
      governedReasons: reasons,
      unverifiedPreferenceNote: note,
    },
    conversation: { ...conversation, state: "RECOMMENDATION_SHOWN", textInputAllowed: true },
  };
}

async function offerAuthorizedCandidate(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
  result: CarsEvidenceBackedDecisionResult,
  userTurnCount: number,
): Promise<CarsConversationResponse> {
  const held = holdAuthorizedCandidate(input, memory, result);
  const requestedModel = resolveCarsConversationModel().requestedModel;
  const planned = await planTurn({
    conversationId: input.conversationId,
    messages: input.messages,
    memory: held,
    remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
    latestAct: interpretLatestUserAct(input.messages, held),
    recommendationMayBeOffered: true,
    candidateMayBeRevealed: false,
    userFacingDecisionBasis: ["Doğrulanmış koltuk ve bagaj eşiği"],
    userFacingUnverifiedPreferences: held.requirements
      .filter((entry) => entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE")
      .map((entry) => entry.key),
  });
  const plan = planned.plan;
  const valid = plan && !validateCarsConversationPlan({
    plan,
    memory: held,
    latestAct: interpretLatestUserAct(input.messages, held),
    latestUserText: [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "",
    recommendationMayBeOffered: true,
    candidateMayBeRevealed: false,
  }) && plan.recommendationAction === "OFFER_ONLY" && !messageRevealsCandidateIdentity(plan.assistantMessage);
  const message = valid ? plan.assistantMessage : FALLBACK_OFFER;
  const conversation = withProvenance(applyAssistantMove(held, {
    phase: "OFFERING",
    prompt: message,
    progressEvent: "recommendation-offered",
    advisorStage: "OFFER_AWAITING_CONSENT",
    recommendationOfferStatus: "AWAITING_CONSENT",
    heldAuthorization: held.heldAuthorization,
    clearPendingQuestion: true,
    humanReady: true,
    governedReady: true,
  }), {
    modelAttempted: true,
    requestedModel: planned.requestedModel,
    selectedModel: planned.selectedModel ?? requestedModel,
    structuredPlan: Boolean(valid),
    parseOutcome: planned.parseOutcome,
    userFacingOrigin: valid ? "MODEL" : "BOUNDED_FALLBACK",
    deterministicOverride: false,
    fallbackReason: valid ? undefined : "MODEL_RESPONSE_VALIDATION_FAILED",
    conversationMove: valid ? plan.move : "OFFER_RECOMMENDATION",
    latestMessageAcknowledged: true,
    latestPrimaryAct: interpretLatestUserAct(input.messages, held).primaryAct,
    advisorStage: "OFFER_AWAITING_CONSENT",
  });
  return {
    kind: "QUESTION",
    message,
    decision: evidenceDecisionProjection(result, { revealIdentity: false, recommendationOfferStatus: "AWAITING_CONSENT" }),
    conversation: { ...conversation, state: "OFFER_AWAITING_CONSENT", textInputAllowed: true },
  };
}

function respondWithEvidence(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
): CarsConversationResponse | Promise<CarsConversationResponse> {
  if (unsupportedHardRequirementBlocksRecommendation(memory)) {
    const message = "Bu tercihiniz seçimi gerçekten değiştirir ve şu anda güvenilir biçimde doğrulayamadığım için bir araç önermeyeceğim. Bunu esnetebilir miyiz, yoksa ayrı doğrulatmak mı istersiniz?";
    const conversation = applyAssistantMove(memory, {
      phase: "LIMITED_BY_EVIDENCE",
      prompt: message,
      advisorStage: "NOT_RECOMMENDABLE",
      clearPendingQuestion: true,
    });
    return { kind: "QUESTION", message, conversation: { ...conversation, state: "INSUFFICIENT_SUPPORTED_EVIDENCE" } };
  }
  const result = evaluateGoverned(input);
  const structuredFollowUp = evidenceDecisionProjection(result, { revealIdentity: false });
  if (result.status === "NO_ELIGIBLE_CANDIDATE") {
    const conversation = applyAssistantMove(memory, {
      phase: "LIMITED_BY_EVIDENCE",
      prompt: result.followUpQuestion ?? "Zorunlu şartlarınızı karşılayan doğrulanmış aday yok.",
      advisorStage: "NOT_RECOMMENDABLE",
    });
    return {
      kind: "QUESTION",
      message: "Şu anda doğrulanmış verileriyle değerlendirdiğim araçların hiçbiri zorunlu şartınızı karşılmıyor. Şartlardan hangisinin esneyebileceğini konuşabiliriz.",
      decision: structuredFollowUp,
      conversation: { ...conversation, state: "NO_SUPPORTED_CANDIDATE" },
    };
  }
  if (result.status === "INSUFFICIENT_VEHICLE_EVIDENCE") {
    const message = "Güvenilir bir seçim için gereken doğrulanmış araç verisi şu anda yeterli değil. Bu nedenle bir araç önermeyeceğim.";
    const conversation = applyAssistantMove(memory, { phase: "LIMITED_BY_EVIDENCE", prompt: message, advisorStage: "NOT_RECOMMENDABLE" });
    return { kind: "QUESTION", message, decision: structuredFollowUp, conversation: { ...conversation, state: "INSUFFICIENT_SUPPORTED_EVIDENCE" } };
  }
  if (result.status === "DECISION_READY") {
    const userTurnCount = input.messages.filter((message) => message.role === "user").length;
    return offerAuthorizedCandidate(input, memory, result, userTurnCount);
  }
  if (result.discriminatorChoices) {
    const message = result.followUpQuestion ?? "Kararı değiştirecek seçeneği seçin.";
    const conversation = applyAssistantMove(memory, {
      phase: "FINAL_TRADEOFF",
      purpose: "MIN_CARGO",
      prompt: message,
      advisorStage: "TRADEOFF_RESOLUTION",
    });
    return {
      kind: "QUESTION",
      message,
      discriminatorChoices: result.discriminatorChoices,
      decision: { ...structuredFollowUp, conversationState: "FINAL_DISCRIMINATOR_REQUIRED" },
      conversation: { ...conversation, state: "FINAL_DISCRIMINATOR_REQUIRED", textInputAllowed: false },
    };
  }
  const message = result.followUpQuestion ?? "Birden fazla araç zorunlu şartlarınızı karşılıyor. Kararı ayırabilecek başka bir zorunlu tercihiniz var mı?";
  const conversation = applyAssistantMove(memory, { phase: "CLARIFYING", prompt: message, advisorStage: "TRADEOFF_RESOLUTION" });
  return { kind: "QUESTION", message, decision: structuredFollowUp, conversation };
}

function validatePurpose(trace: CarsConversationTrace, purpose: CarsQuestionPurpose | undefined): CarsQuestionPurpose | undefined {
  if (!purpose || purpose === "FINAL_PRIORITY") return undefined;
  if (cannotRepeatQuestion(trace, purpose)) return undefined;
  return purpose;
}

function latestUserRejectedRecommendations(input: CarsConversationRequest, memory: CarsConversationTrace): boolean {
  const latest = [...input.messages].reverse().find((message) => message.role === "user");
  return Boolean(latest && /(?:beğenmedim|hoşuma gitmedi|istemiyorum|başka seçenek|bunlar olmaz|not like|don'?t like|different options)/iu.test(latest.content)
    && (memory.recommendationOfferStatus === "REVEALED" || input.messages.some((message) => (message.recommendationIds?.length ?? 0) > 0)));
}

async function createCarsConversationTurn(input: CarsConversationRequest): Promise<CarsConversationResponse> {
  const userTurnCount = input.messages.filter((message) => message.role === "user").length;
  const atTurnLimit = userTurnCount >= MAX_USER_TURNS;
  const latestUser = [...input.messages].reverse().find((message) => message.role === "user");
  const latestContent = latestUser?.content ?? "";
  const requestedModel = resolveCarsConversationModel().requestedModel;

  let memory = hydrateCarsConversationMemory({
    messages: input.messages,
    conversation: input.conversation,
    selectedOptionId: input.selectedOptionId,
  });
  const latestAct = interpretLatestUserAct(input.messages, memory);
  if (latestAct.hasVehicleIntent || latestAct.primaryAct === "VEHICLE_INTENT") {
    memory = { ...memory, vehicleIntentEstablished: true };
  }
  if (input.choiceId) memory = { ...memory, didConversationProgress: true, lastProgressEvent: `choice:${input.choiceId}` };

  if (atTurnLimit && !input.choiceId && !latestAct.isRecommendationAcceptance) {
    return {
      kind: "ERROR",
      message: "Bu görüşme için güvenli tur sınırına ulaştık; elimizdeki bilgiler hâlâ güvenilir bir karar için yeterli değil.",
      conversation: { ...memory, phase: "RECOVERING", state: "SYSTEM_FAILURE", advisorStage: "SYSTEM_LIMITED" },
    };
  }

  if (isCarsClarificationRepair(latestContent) && !latestAct.isPureGreeting) {
    const repair = createCarsClarificationRepair(input.messages);
    if (repair && repair.kind === "QUESTION") {
      const purpose = repair.options?.length ? "USAGE_DETAIL" as const : memory.lastAssistantQuestion?.purpose;
      const options = repair.options?.length ? fallbackUsageOptions("USAGE_DETAIL", userTurnCount) : undefined;
      const conversation = applyAssistantMove(memory, {
        phase: "CLARIFYING",
        purpose,
        prompt: repair.message,
        options,
        progressEvent: "clarification-repair",
        advisorStage: "RECOVERY",
        vehicleIntentEstablished: memory.vehicleIntentEstablished,
      });
      return { ...repair, options: repair.options, conversation: withProvenance(conversation, {
        modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
        userFacingOrigin: "DETERMINISTIC_REPAIR", deterministicOverride: false, latestMessageAcknowledged: true,
        latestPrimaryAct: "MISUNDERSTANDING", advisorStage: "RECOVERY",
      }) };
    }
  }

  const materialCorrection = latestAct.isCorrection && memory.capturedOnLatestTurn.some((key) => key === "MIN_SEATS" || key === "MIN_CARGO_L");
  if ((materialCorrection || memory.capturedOnLatestTurn.some((key) => key === "MIN_SEATS" || key === "MIN_CARGO_L"))
    && memory.heldAuthorization && memory.recommendationOfferStatus === "AWAITING_CONSENT") {
    const opened = openHeldAuthorization(memory.heldAuthorization);
    if (opened && opened.requirementFingerprint !== requirementFingerprint(memory)) {
      memory = invalidateHeld(memory);
    }
  }

  if (latestAct.isRecommendationAcceptance) {
    return revealAuthorizedCard(input, memory, "İşte konuştuklarımızdan çıkan önerim.", {
      modelAttempted: false,
      requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE",
      deterministicOverride: false,
      conversationMove: "ACKNOWLEDGE",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: "RECOMMENDATION_SHOWN",
    });
  }

  if (latestAct.isRecommendationDecline) {
    const conversation = withProvenance(applyAssistantMove({
      ...memory,
      heldAuthorization: resealHeldAuthorization(memory.heldAuthorization, "DECLINED") ?? memory.heldAuthorization,
    }, {
      phase: "RECOMMENDATION_DECLINED",
      prompt: "Tabii. İsterseniz konuşmaya devam ederiz, isterseniz burada durabiliriz.",
      progressEvent: "recommendation-declined",
      advisorStage: "RECOMMENDATION_DECLINED",
      recommendationOfferStatus: "DECLINED",
      clearPendingQuestion: true,
    }), {
      modelAttempted: false,
      requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: false,
      conversationMove: "RESPECT_DECLINE",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: "RECOMMENDATION_DECLINED",
    });
    return { kind: "QUESTION", message: conversation.lastProgressEvent ? "Tabii. İsterseniz konuşmaya devam ederiz, isterseniz burada durabiliriz." : "Tabii.", conversation };
  }

  const rejectedRecommendations = latestUserRejectedRecommendations(input, memory);
  if (rejectedRecommendations) {
    const shownIds = [...input.messages].reverse().find((message) => message.role === "assistant" && message.recommendationIds?.length)?.recommendationIds ?? [];
    memory = {
      ...memory,
      rejectedRecommendationIds: [...new Set([...memory.rejectedRecommendationIds, ...shownIds])],
      recommendationOfferStatus: "NONE",
      heldAuthorization: resealHeldAuthorization(memory.heldAuthorization, "INVALIDATED"),
      advisorStage: "RECOMMENDATION_REJECTED",
    };
  }

  const sufficiency = assessCarsConversationSufficiency(memory);
  memory = { ...memory, governedReady: sufficiency.governedReady, humanReady: sufficiency.humanReady || memory.humanReady };
  const query = buildCarsConversationQuery(input.messages);
  const bridge = deriveCarsEvidenceBackedRequirementsFromQuery(query);
  const canEvaluateNow = (sufficiency.governedReady || Boolean(input.choiceId && bridge.requirements.length > 0))
    && !latestAct.isPureSocial
    && latestAct.primaryAct !== "GREETING"
    && latestAct.primaryAct !== "THANKS"
    && !latestAct.isRecommendationDecline;

  if (input.choiceId && canEvaluateNow && !rejectedRecommendations) {
    return respondWithEvidence(input, { ...memory, phase: "EVALUATING" });
  }

  const socialOnlyTurn = (latestAct.isPureGreeting || latestAct.primaryAct === "THANKS"
    || latestAct.primaryAct === "CASUAL" || latestAct.primaryAct === "HUMOUR")
    && !latestAct.hasVehicleIntent
    && !textHasVehicleIntent(latestContent);
  if (socialOnlyTurn) {
    const planned = await planTurn({
      conversationId: input.conversationId,
      messages: input.messages,
      memory,
      remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
      latestAct,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    const failure = planned.plan ? validateCarsConversationPlan({
      plan: planned.plan,
      memory,
      latestAct,
      latestUserText: latestContent,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    }) : "GREETING_THEN_DISCOVERY";
    if (planned.plan && !failure) {
      const conversation = withProvenance(applyAssistantMove(memory, {
        phase: memory.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
        prompt: planned.plan.assistantMessage,
        progressEvent: latestAct.primaryAct.toLowerCase(),
        advisorStage: memory.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
        clearPendingQuestion: true,
      }), {
        modelAttempted: true,
        requestedModel: planned.requestedModel,
        selectedModel: planned.selectedModel,
        structuredPlan: true,
        parseOutcome: planned.parseOutcome,
        userFacingOrigin: "MODEL",
        deterministicOverride: false,
        conversationMove: planned.plan.move,
        latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct,
        advisorStage: latestAct.isSocialDetour ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
      });
      return { kind: "QUESTION", message: planned.plan.assistantMessage, conversation };
    }
    const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
    return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
      modelAttempted: true,
      requestedModel: planned.requestedModel,
      selectedModel: planned.selectedModel,
      structuredPlan: Boolean(planned.plan),
      parseOutcome: planned.parseOutcome,
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: Boolean(planned.plan),
      fallbackReason: failure ?? "MODEL_UNAVAILABLE_OR_SCHEMA_FAILURE",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: recovery.conversation.advisorStage,
    }) };
  }

  if (latestAct.isSocialDetour) {
    const planned = await planTurn({
      conversationId: input.conversationId,
      messages: input.messages,
      memory,
      remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
      latestAct,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    const message = planned.plan && !validateCarsConversationPlan({
      plan: planned.plan, memory, latestAct, latestUserText: latestContent,
      recommendationMayBeOffered: false, candidateMayBeRevealed: false,
    }) ? planned.plan.assistantMessage : undefined;
    if (message) {
      const conversation = withProvenance(applyAssistantMove(memory, {
        phase: "SOCIAL_DETOUR",
        prompt: message,
        advisorStage: "SOCIAL_DETOUR",
        clearPendingQuestion: true,
        progressEvent: "social-detour",
      }), {
        modelAttempted: true,
        requestedModel: planned.requestedModel,
        selectedModel: planned.selectedModel,
        structuredPlan: true,
        parseOutcome: planned.parseOutcome,
        userFacingOrigin: "MODEL",
        deterministicOverride: false,
        conversationMove: planned.plan?.move,
        latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct,
        advisorStage: "SOCIAL_DETOUR",
      });
      return { kind: "QUESTION", message, conversation };
    }
    const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
    return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
      modelAttempted: true, requestedModel: planned.requestedModel, selectedModel: planned.selectedModel,
      structuredPlan: false, parseOutcome: planned.parseOutcome, userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: false, fallbackReason: "MODEL_UNAVAILABLE_OR_SCHEMA_FAILURE",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "SOCIAL_DETOUR",
    }) };
  }

  if (canEvaluateNow && !rejectedRecommendations && memory.recommendationOfferStatus !== "DECLINED") {
    memory = closeDeferredQuestions(memory, "Supported constraints now authorize governed evaluation; this discovery question no longer changes the decision.");
    return respondWithEvidence(input, { ...memory, phase: "EVALUATING" });
  }

  if ((isFrustration(latestContent) || latestAct.isFrustration) && !latestAct.hasVehicleIntent) {
    const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
    return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
      modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "BOUNDED_FALLBACK", deterministicOverride: false, latestMessageAcknowledged: true,
      latestPrimaryAct: "FRUSTRATION", advisorStage: "RECOVERY",
    }) };
  }

  const planned = await planTurn({
    conversationId: input.conversationId,
    messages: input.messages,
    memory,
    remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
    latestAct,
    recommendationMayBeOffered: false,
    candidateMayBeRevealed: false,
    userFacingUnverifiedPreferences: memory.requirements
      .filter((entry) => entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE")
      .map((entry) => entry.key),
  });

  if (planned.plan) {
    memory = applyPlanFacts(memory, planned.plan, userTurnCount, latestContent);
    const afterPlan = assessCarsConversationSufficiency(memory);
    memory = { ...memory, humanReady: planned.plan.readiness.humanReady || afterPlan.humanReady, governedReady: afterPlan.governedReady };
    const purpose = validatePurpose(memory, planned.plan.question?.purpose);
    if (afterPlan.governedReady && !rejectedRecommendations) {
      return respondWithEvidence(input, memory);
    }
    const failure = validateCarsConversationPlan({
      plan: planned.plan,
      memory,
      latestAct,
      latestUserText: latestContent,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    if (failure) {
      const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
      return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
        modelAttempted: true, requestedModel: planned.requestedModel, selectedModel: planned.selectedModel,
        structuredPlan: true, parseOutcome: planned.parseOutcome, userFacingOrigin: "BOUNDED_FALLBACK",
        deterministicOverride: true, fallbackReason: failure, latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct, advisorStage: recovery.conversation.advisorStage,
      }) };
    }
    if (purpose && isSemanticLoop(memory, purpose)) {
      const recovery = createCarsBoundedRecovery({ ...memory, didConversationProgress: false }, latestContent, latestAct);
      return { ...recovery.response, conversation: { ...recovery.conversation, loopCount: memory.loopCount + 1 } };
    }
    if (planned.plan.latestMessage.primaryAct === "FRUSTRATION" || isFrustration(latestContent) || latestAct.isFrustration) {
      const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
      const message = planned.plan.assistantMessage || recovery.response.message;
      return {
        kind: "QUESTION",
        message,
        conversation: withProvenance(applyAssistantMove(memory, {
          phase: "RECOVERING",
          prompt: message,
          progressEvent: "frustration-repair",
          advisorStage: "RECOVERY",
          clearPendingQuestion: true,
        }), {
          modelAttempted: true, requestedModel: planned.requestedModel, selectedModel: planned.selectedModel,
          structuredPlan: true, parseOutcome: planned.parseOutcome, userFacingOrigin: "MODEL",
          deterministicOverride: false, conversationMove: "REPAIR", latestMessageAcknowledged: true,
          latestPrimaryAct: "FRUSTRATION", advisorStage: "RECOVERY",
        }),
      };
    }
    const options = purpose ? optionSetFromPlan(planned.plan, purpose, userTurnCount) ?? fallbackUsageOptions(purpose, userTurnCount, planned.plan.assistantMessage) : undefined;
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: planned.plan.move === "PAUSE" ? "PAUSED" : purpose ? "CLARIFYING" : "DISCOVERING",
      purpose,
      prompt: planned.plan.assistantMessage,
      options,
      progressEvent: planned.plan.latestMessage.primaryAct.toLowerCase(),
      advisorStage: latestAct.primaryAct === "VEHICLE_INTENT" ? "VEHICLE_INTENT" : "CONTEXT_UNDERSTANDING",
      vehicleIntentEstablished: true,
      humanReady: planned.plan.readiness.humanReady,
      clearPendingQuestion: !purpose,
    }), {
      modelAttempted: true, requestedModel: planned.requestedModel, selectedModel: planned.selectedModel,
      structuredPlan: true, parseOutcome: planned.parseOutcome, userFacingOrigin: "MODEL",
      deterministicOverride: false, conversationMove: planned.plan.move, nextQuestionPurpose: purpose,
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct,
      advisorStage: latestAct.primaryAct === "VEHICLE_INTENT" ? "VEHICLE_INTENT" : "CONTEXT_UNDERSTANDING",
    });
    return {
      kind: "QUESTION",
      message: planned.plan.assistantMessage,
      options: options?.options.map((option) => option.label),
      conversation,
    };
  }

  if (isCandidateComparisonConversation(input.messages) && userTurnCount >= 2 && !rejectedRecommendations) {
    const result = await runCarsRuntime({
      requestId: `${input.conversationId}:turn:${randomUUID()}`,
      contextReference: `${input.conversationId}:context`,
      query,
    });
    if (result.status === "SUCCEEDED") {
      const conversation = applyAssistantMove(memory, { phase: "DECISION_READY", prompt: "Karşılaştırma sonucu hazır.", advisorStage: "NOT_RECOMMENDABLE" });
      return {
        kind: "QUESTION",
        message: "Karşılaştırma için konuştuklarımız duruyor; nihai kart ancak doğrulanmış bir aday yetkisi ve sizin onayınızla açılır.",
        conversation: { ...conversation, state: "COLLECTING_CONTEXT" },
      };
    }
    if (result.status === "FAILED") {
      return { kind: "ERROR", message: createCarsFollowUp(result, "tr"), conversation: { ...memory, phase: "RECOVERING", state: "SYSTEM_FAILURE", advisorStage: "SYSTEM_LIMITED" } };
    }
  }

  if (atTurnLimit) {
    return {
      kind: "ERROR",
      message: "Bu görüşme için güvenli tur sınırına ulaştık; elimizdeki bilgiler hâlâ güvenilir bir karar için yeterli değil.",
      conversation: { ...memory, phase: "RECOVERING", state: "SYSTEM_FAILURE", advisorStage: "SYSTEM_LIMITED" },
    };
  }

  const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
  return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
    modelAttempted: true, requestedModel, selectedModel: requestedModel, structuredPlan: false,
    parseOutcome: planned.parseOutcome ?? "UNAVAILABLE",
    userFacingOrigin: "BOUNDED_FALLBACK", deterministicOverride: false,
    fallbackReason: "MODEL_UNAVAILABLE_OR_SCHEMA_FAILURE",
    nextQuestionPurpose: recovery.conversation.lastAssistantQuestion?.purpose,
    latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct,
    advisorStage: recovery.conversation.advisorStage,
  }) };
}

export async function runCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  const response = await createCarsConversationTurn(input);
  if (response.conversation) {
    return {
      ...response,
      conversation: {
        ...response.conversation,
        state: response.conversation.state,
        textInputAllowed: response.conversation.phase !== "FINAL_TRADEOFF"
          && response.conversation.state !== "FINAL_DISCRIMINATOR_REQUIRED",
        semanticFingerprint: response.conversation.semanticFingerprint,
      },
    };
  }
  const trace = hydrateCarsConversationMemory({ messages: input.messages, conversation: input.conversation });
  return { ...response, conversation: withAdvisorStage(trace, trace.advisorStage, { state: conversationStateFromPhase(trace.phase) }) };
}
