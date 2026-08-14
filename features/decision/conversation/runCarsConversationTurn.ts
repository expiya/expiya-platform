import { randomUUID } from "node:crypto";

import { runCarsRuntime } from "@/features/decision/runtime/runCarsRuntime";
import {
  deriveCarsEvidenceBackedRequirementsFromQuery,
  runCarsEvidenceBackedDecision,
  type CarsEvidenceBackedDecisionResult,
} from "@/features/decision/runtime/runCarsEvidenceBackedDecision";
import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import type {
  CarsConversationRequest,
  CarsConversationResponse,
} from "@/types/carsConversation";

import { buildCarsConversationQuery } from "./buildCarsConversationQuery";
import {
  createCarsClarificationRepair,
  suppressRepeatedCarsResponse,
} from "./carsConversationRepair";
import { createCarsConversationGuidance } from "./createCarsConversationGuidance";
import { createCarsFollowUp } from "./createCarsFollowUp";
import {
  hasExplicitBudget,
  hasUsageOrPreference,
  isCandidateComparisonConversation,
} from "./hasActionableCarsContext";

const MAX_USER_TURNS = 20;

function evidenceDecision(result: CarsEvidenceBackedDecisionResult) {
  return {
    conversationState: result.status === "DECISION_READY" ? "DECISION_READY" as const
      : result.status === "INSUFFICIENT_VEHICLE_EVIDENCE" ? "EVIDENCE_INSUFFICIENT" as const
        : result.status === "NO_ELIGIBLE_CANDIDATE" ? "NO_ELIGIBLE_CANDIDATE" as const : "FOLLOW_UP" as const,
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
  };
}

function missingEvidenceDimensionQuestion(hasSeats: boolean, isTurkish: boolean): string {
  if (hasSeats) return isTurkish
    ? "Bagaj için zorunlu bir minimum hacim beklentiniz var mı? Varsa litre olarak belirtir misiniz?"
    : "Do you have a required minimum cargo volume? If so, please give it in litres.";
  return isTurkish
    ? "En az kaç koltuk olmasını istiyorsunuz?"
    : "What is the minimum number of seats you require?";
}

function latestUserRejectedRecommendations(input: CarsConversationRequest): boolean {
  const latest = [...input.messages].reverse().find((message) => message.role === "user");
  return Boolean(latest && /(?:beğenmedim|hoşuma gitmedi|istemiyorum|başka seçenek|bunlar olmaz|not like|don'?t like|different options)/iu.test(latest.content));
}

function fallbackGuidance(
  input: CarsConversationRequest,
  locale: "tr" | "en",
): CarsConversationResponse {
  const isTurkish = locale === "tr";
  if (!hasUsageOrPreference(input.messages)) {
    return {
      kind: "QUESTION",
      message: isTurkish
        ? "Sizi doğru anladığımdan emin olmak istiyorum: Bu araç günlük hayatınızda en çok hangi işi kolaylaştırmalı?"
        : "I want to understand you correctly: what should this car make easier in your daily life?",
      options: isTurkish
        ? ["İşe gidip gelme", "Aile kullanımı", "Uzun yol", "Henüz bilmiyorum"]
        : ["Commuting", "Family use", "Long trips", "I am not sure yet"],
    };
  }
  if (!hasExplicitBudget(input.messages)) {
    return {
      kind: "QUESTION",
      message: isTurkish
        ? "Anladım. Bu ihtiyacı karşılamak için rahat edeceğiniz yaklaşık üst bütçe nedir? Henüz belli değilse bütçeyi şimdilik açık bırakabiliriz."
        : "Understood. What approximate maximum budget would feel comfortable? It is fine if you do not know yet.",
    };
  }
  return {
    kind: "QUESTION",
    message: isTurkish
      ? "Kararı gerçekten değiştirecek son noktayı netleştirelim: Sizin için vazgeçilmez olan özellik nedir?"
      : "Let's clarify the last decision-changing point: which quality is non-negotiable for you?",
  };
}

function runtimeGap(result: Awaited<ReturnType<typeof runCarsRuntime>>): string {
  const reason = result.reasons[0];
  return reason ? `${reason.stage}: ${reason.code}` : "The governed runtime needs more explicit context.";
}

async function createCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  const locale = "tr" as const;
  const isTurkish = locale === "tr";
  const userTurnCount = input.messages.filter((message) => message.role === "user").length;
  const comparison = isCandidateComparisonConversation(input.messages);
  const minimumTurns = comparison ? 2 : 3;
  const recommendationAllowed = userTurnCount >= minimumTurns;
  const atTurnLimit = userTurnCount >= MAX_USER_TURNS;
  const hasPriorRecommendations = input.messages.some(
    (message) => (message.recommendationIds?.length ?? 0) > 0,
  );
  const rejectedRecommendations = hasPriorRecommendations
    && latestUserRejectedRecommendations(input);
  const effectiveRecommendationAllowed = recommendationAllowed && !rejectedRecommendations;

  const latestUser = [...input.messages].reverse().find((message) => message.role === "user");
  if (userTurnCount === 1 && latestUser && /(?:arazi|off-road|off road|kötü yol|rough road)/iu.test(latestUser.content)) {
    return {
      kind: "QUESTION",
      message: "Evet, arazi ve kötü yol kullanımına uygun araçları değerlendirebiliriz. Daha çok kamp ve stabilize yol mu, çamurlu/kötü yollar mı, yoksa ciddi arazi kullanımı mı düşünüyorsunuz?",
      options: ["Kamp ve stabilize yol", "Çamurlu/kötü yol", "Ciddi arazi kullanımı"],
    };
  }

  const query = buildCarsConversationQuery(input.messages);
  const bridge = deriveCarsEvidenceBackedRequirementsFromQuery(query);
  const hasEvidenceConversation = bridge.requirements.length > 0
    || bridge.materialPreferencesWithoutThreshold.length > 0
    || bridge.partySize !== undefined;

  if (hasEvidenceConversation) {
    const result = runCarsEvidenceBackedDecision({ query, vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
    const structured = evidenceDecision(result);
    if (result.status === "NO_ELIGIBLE_CANDIDATE") {
      return { kind: "QUESTION", message: isTurkish
        ? "Şu anda doğrulanmış verileriyle değerlendirdiğim araçların hiçbiri zorunlu şartınızı karşılamıyor. Şartlardan hangisinin esneyebileceğini konuşabiliriz."
        : "None of the vehicles I can currently evaluate with verified data meets that requirement. We can discuss which constraint could flex.", decision: structured };
    }
    if (result.status === "INSUFFICIENT_VEHICLE_EVIDENCE") {
      return { kind: "QUESTION", message: isTurkish
        ? "Güvenilir bir seçim için gereken doğrulanmış araç verisi şu anda yeterli değil. Bu nedenle bir araç önermeyeceğim."
        : "The verified vehicle data needed for a reliable decision is not sufficient right now, so I will not recommend a vehicle.", decision: structured };
    }
    const hasSeats = bridge.requirements.some((item) => item.factKey === "seats");
    const hasCargo = bridge.requirements.some((item) => item.factKey === "cargo_volume_l");
    if (!hasSeats || !hasCargo) {
      const message = bridge.partySize !== undefined && !hasSeats
        ? isTurkish
          ? `${bridge.partySize} kişi olduğunuzu anladım. En az ${bridge.partySize} koltuk sizin için zorunlu mu?`
          : `I understand there are ${bridge.partySize} people. Is at least ${bridge.partySize} seats a firm requirement?`
        : bridge.materialPreferencesWithoutThreshold.includes("cargo_volume_l") && !hasCargo
          ? isTurkish ? "Bagajın önemli olduğunu anladım. Zorunlu bir minimum hacim beklentiniz var mı? Varsa litre olarak belirtir misiniz?" : "I understand cargo space matters. Do you have a required minimum volume in litres?"
          : missingEvidenceDimensionQuestion(hasSeats, isTurkish);
      return { kind: "QUESTION", message, decision: {
        ...structured,
        conversationState: "FOLLOW_UP",
        decisionStatus: "NEEDS_MORE_USER_CONTEXT",
        evidenceBacked: false,
        selectedRuntimeVehicleCandidateId: undefined,
        selectedVehicle: undefined,
        followUpQuestion: message,
      } };
    }
    if (result.status === "DECISION_READY") {
      return { kind: "QUESTION", message: result.userFacingExplanation ?? "Güvenilir seçim hazır.", decision: structured };
    }
    return { kind: "QUESTION", message: result.followUpQuestion ?? (isTurkish
      ? "Birden fazla araç zorunlu şartlarınızı karşılıyor. Kararı ayırabilecek başka bir zorunlu tercihiniz var mı?"
      : "More than one vehicle meets your requirements. Do you have another must-have that could separate them?"), decision: structured };
  }

  const clarificationRepair = createCarsClarificationRepair(input.messages);
  if (clarificationRepair) return clarificationRepair;

  const guidance = await createCarsConversationGuidance({
    messages: input.messages,
    locale,
    recommendationAllowed: effectiveRecommendationAllowed,
    remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
    hasPriorRecommendations,
    latestUserRejectedRecommendations: rejectedRecommendations,
  });

  if (!guidance) return fallbackGuidance(input, locale);
  if (guidance.action === "REDIRECT") {
    return { kind: "QUESTION", message: guidance.message, options: guidance.options };
  }
  if (!atTurnLimit && (guidance.action === "ASK" || !effectiveRecommendationAllowed)) {
    return { kind: "QUESTION", message: guidance.message, options: guidance.options };
  }

  const result = await runCarsRuntime({
    requestId: `${input.conversationId}:turn:${randomUUID()}`,
    contextReference: `${input.conversationId}:context`,
    query,
  });

  if (result.status === "SUCCEEDED") {
    return {
      kind: "RECOMMENDATIONS",
      message: result.recommendations.length > 0
        ? isTurkish
          ? result.recommendations.length === 1
            ? "Konuştuklarımıza göre net seçimim bu araç. Kartı açarak gerekçelerini inceleyebilir veya bana itiraz edip sohbete devam edebilirsiniz."
            : "Konuştuklarımıza göre ilk araç net seçimim; diğerleri yalnızca güçlü alternatifler. En fazla üç sonuç gösteriyorum. Kartları açarak gerekçeleri inceleyebilirsiniz."
          : "Weighing everything we discussed, these are the strongest decisions right now. You can inspect the reasoning, challenge it, or keep talking."
        : isTurkish
          ? "Konuştuklarımız yeterince net, fakat mevcut katalogda koşullarınızı dürüstçe karşılayan bir araç yok. İsterseniz hangi koşulun esneyebileceğini konuşalım."
          : "Our conversation is clear enough, but no current catalog car honestly meets it. We can discuss which constraint could flex.",
      recommendations: result.recommendations,
    };
  }

  if (result.status === "FAILED") {
    return { kind: "ERROR", message: createCarsFollowUp(result, locale) };
  }

  if (atTurnLimit) {
    return {
      kind: "ERROR",
      message: isTurkish
        ? "Bu görüşme için güvenli tur sınırına ulaştık; elimizdeki bilgiler hâlâ güvenilir bir karar için yeterli değil. Yeni bir görüşmede bütçe, kullanım ve vazgeçilmez ihtiyacınızı birlikte yazarak başlayabilirsiniz."
        : "We reached this conversation's safe turn limit without enough information for a reliable decision. Start a new conversation with your budget, usage, and one non-negotiable need.",
    };
  }

  const followUp = await createCarsConversationGuidance({
    messages: input.messages,
    locale,
    recommendationAllowed: false,
    remainingUserTurns: MAX_USER_TURNS - userTurnCount,
    runtimeGap: runtimeGap(result),
    hasPriorRecommendations,
    latestUserRejectedRecommendations: rejectedRecommendations,
  });
  return followUp
    ? { kind: "QUESTION", message: followUp.message, options: followUp.options }
    : { kind: "QUESTION", message: createCarsFollowUp(result, locale) };
}

export async function runCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  const response = await createCarsConversationTurn(input);
  return suppressRepeatedCarsResponse(input.messages, response);
}
