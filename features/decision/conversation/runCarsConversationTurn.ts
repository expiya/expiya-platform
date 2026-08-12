import { randomUUID } from "node:crypto";

import { runCarsRuntime } from "@/features/decision/runtime/runCarsRuntime";
import type {
  CarsConversationRequest,
  CarsConversationResponse,
} from "@/types/carsConversation";

import { buildCarsConversationQuery } from "./buildCarsConversationQuery";
import { createCarsFollowUp } from "./createCarsFollowUp";
import {
  hasActionableCarsContext,
  hasExplicitBudget,
  hasUsageOrPreference,
  isCandidateComparisonConversation,
  resolveCarsConversationLocale,
} from "./hasActionableCarsContext";

export async function runCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  const locale = resolveCarsConversationLocale(input.messages);
  const isTurkish = locale === "tr";

  if (!hasActionableCarsContext(input.messages)) {
    return {
      kind: "QUESTION",
      message: isTurkish
        ? "Aracı en çok nasıl kullanacaksınız? Örneğin işe gidip gelme, şehir içi, uzun yol veya aile kullanımı olabilir."
        : "How will you use the car most—for commuting, city driving, long trips, or family use?",
    };
  }

  if (!isCandidateComparisonConversation(input.messages)) {
    if (!hasUsageOrPreference(input.messages)) {
      return {
        kind: "QUESTION",
        message: isTurkish
          ? "Aracı en çok nasıl kullanacaksınız ve sizin için hangi özellik önemli?"
          : "How will you use the car, and which feature matters most to you?",
      };
    }
    if (!hasExplicitBudget(input.messages)) {
      return {
        kind: "QUESTION",
        message: isTurkish
          ? "Yaklaşık bütçeniz veya çıkmak istemediğiniz üst fiyat sınırı nedir?"
          : "What is your approximate budget or maximum price?",
      };
    }
  }

  const query = buildCarsConversationQuery(input.messages);
  const turnId = randomUUID();
  const result = await runCarsRuntime({
    requestId: `${input.conversationId}:turn:${turnId}`,
    contextReference: `${input.conversationId}:context`,
    query,
  });

  if (result.status === "SUCCEEDED") {
    return {
      kind: "RECOMMENDATIONS",
      message: result.recommendations.length > 0
        ? isTurkish
          ? "Paylaştığınız bilgilere göre en güçlü eşleşmeler bunlar. Tercihlerinizi değiştirirseniz yeniden değerlendirebilirim."
          : "Based on everything you've told me, these are the strongest matches. You can still change any preference or ask me to compare them."
        : isTurkish
          ? "Yeterli bilgi var ancak mevcut katalogda koşullarınıza uyan araç bulunamadı. Bir koşulu değiştirirseniz yeniden bakabilirim."
          : "I have enough context, but there are no matching cars in the current catalog. You can relax or change a requirement and I'll check again.",
      recommendations: result.recommendations,
    };
  }

  if (result.status === "FAILED") {
    return { kind: "ERROR", message: createCarsFollowUp(result, locale) };
  }

  return { kind: "QUESTION", message: createCarsFollowUp(result, locale) };
}
