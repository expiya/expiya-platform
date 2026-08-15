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
} from "@/types/carsConversation";

import { assessCarsConversationSufficiency } from "./assessCarsConversationSufficiency";
import { buildCarsConversationQuery } from "./buildCarsConversationQuery";
import {
  createCarsClarificationRepair,
  isCarsClarificationRepair,
} from "./carsConversationRepair";
import {
  applyAssistantMove,
  hydrateCarsConversationMemory,
} from "./carsConversationMemory";
import {
  conversationStateFromPhase,
  extractDeterministicFacts,
  isFrustration,
  isOffTopic,
  upsertRequirement,
} from "./carsRequirementLedger";
import { cannotRepeatQuestion, isSemanticLoop } from "./carsSemanticLoopGuard";
import { createCarsBoundedRecovery, discoveryUsageOptions } from "./createCarsBoundedRecovery";
import { createCarsFollowUp } from "./createCarsFollowUp";
import { isCandidateComparisonConversation } from "./hasActionableCarsContext";
import {
  planCarsConversationTurn,
  type CarsConversationTurnPlan,
} from "./planCarsConversationTurn";

const MAX_USER_TURNS = 20;

function evidenceDecision(result: CarsEvidenceBackedDecisionResult) {
  return {
    conversationState: result.status === "DECISION_READY" ? "DECISION_READY" as const
      : result.status === "INSUFFICIENT_VEHICLE_EVIDENCE" ? "EVIDENCE_INSUFFICIENT" as const
        : result.status === "NO_ELIGIBLE_CANDIDATE" ? "NO_ELIGIBLE_CANDIDATE" as const
          : result.discriminatorChoices ? "FINAL_DISCRIMINATOR_REQUIRED" as const : "FOLLOW_UP" as const,
    decisionStatus: result.status,
    evidenceBacked: result.status === "DECISION_READY",
    selectedRuntimeVehicleCandidateId: result.selectedRuntimeVehicleCandidateId,
    selectedVehicle: result.selectedVehicle,
    requirements: result.materialRequirements.map(({ factKey, predicate, value }) => ({ factKey, predicate, value })),
    candidateDispositions: result.candidateEvaluations.map(({ runtimeVehicleCandidateId, disposition }) => ({ runtimeVehicleCandidateId, disposition })),
    evidenceTrace: { candidateIds: result.evidenceTrace.candidateIds, artifactVersion: result.evidenceTrace.authority.artifactVersion },
    followUpQuestion: result.followUpQuestion,
    limitations: result.status === "INSUFFICIENT_VEHICLE_EVIDENCE"
      ? ["Bu araç için gerekli doğrulanmış veri yeterli değil."] : undefined,
    discriminatorChoices: result.discriminatorChoices,
  };
}

function latestUserRejectedRecommendations(input: CarsConversationRequest): boolean {
  const latest = [...input.messages].reverse().find((message) => message.role === "user");
  return Boolean(latest && /(?:beğenmedim|hoşuma gitmedi|istemiyorum|başka seçenek|bunlar olmaz|not like|don'?t like|different options)/iu.test(latest.content));
}

function applyPlanFacts(trace: CarsConversationTrace, plan: CarsConversationTurnPlan, sourceTurn: number, sourceText: string): CarsConversationTrace {
  const entries = new Map(trace.requirements.map((entry) => [entry.key, entry] as const));
  const captured = [...trace.capturedOnLatestTurn];
  for (const fact of plan.facts) {
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
  const requirements = [...entries.values()];
  return {
    ...trace,
    requirements,
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
  return {
    id: `opt-${purpose}-${sourceAssistantTurn}`,
    purpose,
    options: plan.options,
    sourceAssistantTurn,
    active: true,
  };
}

function phaseForAction(plan: CarsConversationTurnPlan, ready: boolean): CarsConversationTrace["phase"] {
  if (plan.nextAction === "LIMIT") return "LIMITED_BY_EVIDENCE";
  if (plan.nextAction === "REPAIR") return "RECOVERING";
  if (plan.nextAction === "REDIRECT") return "DISCOVERING";
  if (plan.nextAction === "EVALUATE" && ready) return "READY_TO_EVALUATE";
  if (plan.nextAction === "ASK") return "CLARIFYING";
  return "DISCOVERING";
}

function respondWithEvidence(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
  messageOverride?: string,
): CarsConversationResponse {
  const query = buildCarsConversationQuery(input.messages);
  const result = runCarsEvidenceBackedDecision({
    query,
    vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
    discriminatorChoiceId: input.choiceId,
  });
  const structured = evidenceDecision(result);
  if (result.status === "NO_ELIGIBLE_CANDIDATE") {
    const conversation = applyAssistantMove(memory, {
      phase: "LIMITED_BY_EVIDENCE",
      prompt: result.followUpQuestion ?? "Zorunlu şartlarınızı karşılayan doğrulanmış aday yok.",
    });
    return {
      kind: "QUESTION",
      message: "Şu anda doğrulanmış verileriyle değerlendirdiğim araçların hiçbiri zorunlu şartınızı karşılmıyor. Şartlardan hangisinin esneyebileceğini konuşabiliriz.",
      decision: structured,
      conversation: { ...conversation, state: "NO_SUPPORTED_CANDIDATE" },
    };
  }
  if (result.status === "INSUFFICIENT_VEHICLE_EVIDENCE") {
    const message = "Güvenilir bir seçim için gereken doğrulanmış araç verisi şu anda yeterli değil. Bu nedenle bir araç önermeyeceğim.";
    const conversation = applyAssistantMove(memory, { phase: "LIMITED_BY_EVIDENCE", prompt: message });
    return { kind: "QUESTION", message, decision: structured, conversation: { ...conversation, state: "INSUFFICIENT_SUPPORTED_EVIDENCE" } };
  }
  if (result.status === "DECISION_READY") {
    const message = messageOverride && !/öner|tavsiye ettiğim model/iu.test(messageOverride)
      ? `${messageOverride}\n\n${result.userFacingExplanation}`
      : result.userFacingExplanation ?? "Güvenilir seçim hazır.";
    const conversation = applyAssistantMove(memory, { phase: "DECISION_READY", prompt: message, progressEvent: "decision-ready" });
    return { kind: "QUESTION", message, decision: structured, conversation: { ...conversation, state: "DECISION_READY" } };
  }
  if (result.discriminatorChoices) {
    const message = result.followUpQuestion ?? "Kararı değiştirecek seçeneği seçin.";
    const conversation = applyAssistantMove(memory, {
      phase: "FINAL_TRADEOFF",
      purpose: "MIN_CARGO",
      prompt: message,
    });
    return {
      kind: "QUESTION",
      message,
      discriminatorChoices: result.discriminatorChoices,
      decision: { ...structured, conversationState: "FINAL_DISCRIMINATOR_REQUIRED" },
      conversation: { ...conversation, state: "FINAL_DISCRIMINATOR_REQUIRED", textInputAllowed: false },
    };
  }
  const message = result.followUpQuestion ?? "Birden fazla araç zorunlu şartlarınızı karşılıyor. Kararı ayırabilecek başka bir zorunlu tercihiniz var mı?";
  const conversation = applyAssistantMove(memory, { phase: "CLARIFYING", prompt: message });
  return { kind: "QUESTION", message, decision: structured, conversation };
}

function validatePurpose(trace: CarsConversationTrace, purpose: CarsQuestionPurpose | "NONE"): CarsQuestionPurpose | undefined {
  if (purpose === "NONE" || purpose === "FINAL_PRIORITY") return undefined;
  if (cannotRepeatQuestion(trace, purpose)) return undefined;
  return purpose;
}

function fallbackUsageOptions(purpose: CarsQuestionPurpose, turn: number): CarsActiveOptionSet | undefined {
  if (purpose !== "USAGE_DETAIL") return undefined;
  return {
    id: `opt-usage-detail-${turn}`,
    purpose,
    options: discoveryUsageOptions,
    sourceAssistantTurn: turn,
    active: true,
  };
}

async function createCarsConversationTurn(input: CarsConversationRequest): Promise<CarsConversationResponse> {
  const userTurnCount = input.messages.filter((message) => message.role === "user").length;
  const atTurnLimit = userTurnCount >= MAX_USER_TURNS;
  const latestUser = [...input.messages].reverse().find((message) => message.role === "user");
  const latestContent = latestUser?.content ?? "";
  const hasPriorRecommendations = input.messages.some((message) => (message.recommendationIds?.length ?? 0) > 0);
  const rejectedRecommendations = hasPriorRecommendations && latestUserRejectedRecommendations(input);

  let memory = hydrateCarsConversationMemory({
    messages: input.messages,
    conversation: input.conversation,
    selectedOptionId: input.selectedOptionId,
  });

  if (input.choiceId) memory = { ...memory, didConversationProgress: true, lastProgressEvent: `choice:${input.choiceId}` };

  const sufficiency = assessCarsConversationSufficiency(memory);
  const query = buildCarsConversationQuery(input.messages);
  const bridge = deriveCarsEvidenceBackedRequirementsFromQuery(query);
  const canEvaluateNow = sufficiency.readyToEvaluate
    || Boolean(input.choiceId && (bridge.requirements.length > 0));

  if (canEvaluateNow && !rejectedRecommendations) {
    return respondWithEvidence(input, { ...memory, phase: "EVALUATING" });
  }

  if (isCarsClarificationRepair(latestContent)) {
    const repair = createCarsClarificationRepair(input.messages);
    if (repair && repair.kind === "QUESTION") {
      const purpose = repair.options?.length ? "USAGE_DETAIL" as const : memory.lastAssistantQuestion?.purpose;
      const options = repair.options?.length
        ? fallbackUsageOptions("USAGE_DETAIL", userTurnCount)
        : undefined;
      const conversation = applyAssistantMove(memory, {
        phase: "CLARIFYING",
        purpose,
        prompt: repair.message,
        options,
        progressEvent: "clarification-repair",
      });
      return { ...repair, options: repair.options, conversation };
    }
  }

  if (isOffTopic(latestContent) && memory.requirements.length > 0) {
    const message = "Kısa cevap: bugünün havasına bakamam. Araç tarafında duran ihtiyaçlarınız yerinde; kaldığınız yerden devam edebiliriz.";
    const conversation = applyAssistantMove(memory, {
      phase: memory.phase,
      purpose: "OFF_TOPIC_REDIRECT",
      prompt: message,
      progressEvent: "off-topic-preserved",
    });
    return { kind: "QUESTION", message, conversation };
  }

  const plan = await planCarsConversationTurn({
    conversationId: input.conversationId,
    messages: input.messages,
    memory,
    remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
  });

  if (plan) {
    memory = applyPlanFacts(memory, plan, userTurnCount, latestContent);
    const afterPlan = assessCarsConversationSufficiency(memory);
    const purpose = validatePurpose(memory, plan.questionPurpose);
    if ((plan.nextAction === "EVALUATE" || afterPlan.readyToEvaluate) && afterPlan.readyToEvaluate && !rejectedRecommendations) {
      return respondWithEvidence(input, memory, plan.assistantMessage);
    }
    if (purpose && isSemanticLoop(memory, purpose)) {
      const recovery = createCarsBoundedRecovery({ ...memory, didConversationProgress: false }, latestContent);
      return { ...recovery.response, conversation: { ...recovery.conversation, loopCount: memory.loopCount + 1 } };
    }
    if (plan.replyKind === "FRUSTRATION" || isFrustration(latestContent)) {
      const recovery = createCarsBoundedRecovery(memory, latestContent);
      return {
        kind: "QUESTION",
        message: plan.assistantMessage || recovery.response.message,
        conversation: applyAssistantMove(memory, {
          phase: "LIMITED_BY_EVIDENCE",
          purpose: "OFF_TOPIC_REDIRECT",
          prompt: plan.assistantMessage,
          progressEvent: "frustration-repair",
        }),
      };
    }
    const options = purpose ? optionSetFromPlan(plan, purpose, userTurnCount) ?? fallbackUsageOptions(purpose, userTurnCount) : undefined;
    const conversation = applyAssistantMove(memory, {
      phase: phaseForAction(plan, afterPlan.readyToEvaluate),
      purpose,
      prompt: plan.assistantMessage,
      options,
      progressEvent: plan.replyKind.toLowerCase(),
    });
    return {
      kind: "QUESTION",
      message: plan.assistantMessage,
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
      const conversation = applyAssistantMove(memory, { phase: "DECISION_READY", prompt: "Karşılaştırma sonucu hazır." });
      return {
        kind: "RECOMMENDATIONS",
        message: result.recommendations.length > 0
          ? "Konuştuklarımıza göre ilk araç net seçimim; diğerleri yalnızca güçlü alternatifler. Kartları açarak gerekçeleri inceleyebilirsiniz."
          : "Konuştuklarımız yeterince net, fakat mevcut katalogda koşullarınızı dürüstçe karşılayan bir araç yok.",
        recommendations: result.recommendations,
        conversation: { ...conversation, state: "DECISION_READY" },
      };
    }
    if (result.status === "FAILED") {
      return { kind: "ERROR", message: createCarsFollowUp(result, "tr"), conversation: { ...memory, phase: "RECOVERING", state: "SYSTEM_FAILURE" } };
    }
  }

  if (atTurnLimit) {
    return {
      kind: "ERROR",
      message: "Bu görüşme için güvenli tur sınırına ulaştık; elimizdeki bilgiler hâlâ güvenilir bir karar için yeterli değil.",
      conversation: { ...memory, phase: "RECOVERING", state: "SYSTEM_FAILURE" },
    };
  }

  const recovery = createCarsBoundedRecovery(memory, latestContent);
  if (sufficiency.readyToEvaluate) return respondWithEvidence(input, memory);
  return recovery.response;
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
  return { ...response, conversation: { ...trace, state: conversationStateFromPhase(trace.phase) } };
}
