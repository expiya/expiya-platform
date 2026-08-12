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
  lastAssistantQuestionTopic,
  latestUserDoesNotKnow,
  resolveCarsConversationLocale,
} from "./hasActionableCarsContext";

export async function runCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  const locale = resolveCarsConversationLocale(input.messages);
  const isTurkish = locale === "tr";
  const previousQuestion = lastAssistantQuestionTopic(input.messages);
  const userDoesNotKnow = latestUserDoesNotKnow(input.messages);

  if (userDoesNotKnow && previousQuestion === "USAGE") {
    return {
      kind: "QUESTION",
      message: isTurkish
        ? "Sorun değil; kullanım şekli zamanla netleşebilir. Yaklaşık bütçenizi seçerek ilerleyelim."
        : "No problem; your usage can become clearer later. Let's continue with your approximate budget.",
      options: isTurkish
        ? ["1 milyon TL altı", "1–1,5 milyon TL", "1,5–2 milyon TL", "2 milyon TL üzeri", "Bütçemi de bilmiyorum"]
        : ["Under 1M TL", "1–1.5M TL", "1.5–2M TL", "Over 2M TL", "I don't know my budget"],
    };
  }

  if (userDoesNotKnow && previousQuestion === "BUDGET") {
    return {
      kind: "QUESTION",
      message: isTurkish
        ? "Sorun değil. O halde sizi en çok rahatlatacak özelliği seçelim; daha sonra bütçeyi birlikte daraltabiliriz."
        : "No problem. Choose the quality that would help you most, and we can narrow the budget later.",
      options: isTurkish
        ? ["Parkı kolay küçük araç", "Az yakıt tüketimi", "Geniş iç hacim", "Uzun yolda konfor", "Belirli araçları karşılaştırmak istiyorum"]
        : ["Small and easy to park", "Low fuel use", "Spacious interior", "Long-distance comfort", "Compare specific cars"],
    };
  }

  if (!hasActionableCarsContext(input.messages)) {
    return {
      kind: "QUESTION",
      message: isTurkish
        ? "Aracı en çok nasıl kullanacaksınız? Örneğin işe gidip gelme, şehir içi, uzun yol veya aile kullanımı olabilir."
        : "How will you use the car most—for commuting, city driving, long trips, or family use?",
      options: isTurkish
        ? ["İşe gidip gelme", "Şehir içi günlük kullanım", "Uzun yol", "Aile kullanımı", "Bilmiyorum"]
        : ["Commuting", "Daily city driving", "Long trips", "Family use", "I don't know"],
    };
  }

  if (!isCandidateComparisonConversation(input.messages)) {
    if (!hasUsageOrPreference(input.messages)) {
      return {
        kind: "QUESTION",
        message: isTurkish
          ? "Aracı en çok nasıl kullanacaksınız ve sizin için hangi özellik önemli?"
          : "How will you use the car, and which feature matters most to you?",
        options: isTurkish
          ? ["İşe gidip gelme", "Şehir içi günlük kullanım", "Uzun yol", "Aile kullanımı", "Bilmiyorum"]
          : ["Commuting", "Daily city driving", "Long trips", "Family use", "I don't know"],
      };
    }
    if (!hasExplicitBudget(input.messages)) {
      return {
        kind: "QUESTION",
        message: isTurkish
          ? "Yaklaşık bütçeniz veya çıkmak istemediğiniz üst fiyat sınırı nedir?"
          : "What is your approximate budget or maximum price?",
        options: isTurkish
          ? ["1 milyon TL altı", "1–1,5 milyon TL", "1,5–2 milyon TL", "2 milyon TL üzeri", "Bilmiyorum"]
          : ["Under 1M TL", "1–1.5M TL", "1.5–2M TL", "Over 2M TL", "I don't know"],
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
