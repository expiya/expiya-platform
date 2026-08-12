import { randomUUID } from "node:crypto";

import { runCarsRuntime } from "@/features/decision/runtime/runCarsRuntime";
import type {
  CarsConversationRequest,
  CarsConversationResponse,
} from "@/types/carsConversation";

import { buildCarsConversationQuery } from "./buildCarsConversationQuery";
import { createCarsConversationGuidance } from "./createCarsConversationGuidance";
import { createCarsFollowUp } from "./createCarsFollowUp";
import {
  hasExplicitBudget,
  hasUsageOrPreference,
  isCandidateComparisonConversation,
} from "./hasActionableCarsContext";

const MAX_USER_TURNS = 10;

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
        ? "Anladım. Bu ihtiyacı karşılamak için rahat edeceğiniz yaklaşık üst bütçe nedir? Bilmiyorsanız bunu da söyleyebilirsiniz."
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

export async function runCarsConversationTurn(
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

  const query = buildCarsConversationQuery(input.messages);
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
          ? "Konuştuklarımızı birlikte tartınca şu an en güçlü karar seçenekleri bunlar. Nedenlerini inceleyebilir veya bana itiraz edip sohbete devam edebilirsiniz."
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
