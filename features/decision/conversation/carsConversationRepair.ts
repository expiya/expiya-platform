import type {
  CarsConversationMessage,
  CarsConversationResponse,
} from "@/types/carsConversation";

const repairIntentPatterns = [
  /^(?:ne gibi|nasıl yani|örnek|örnek verir misin|biraz açar mısın)[?!.]*$/iu,
  /^(?:anlamadım|açıklar mısın)[?!.]*$/iu,
  /^(?:what do you mean|such as what|for example|can you explain|i don'?t understand)[?!.]*$/iu,
];

function latestMessage(
  messages: readonly CarsConversationMessage[],
  role: CarsConversationMessage["role"],
): CarsConversationMessage | undefined {
  return [...messages].reverse().find((message) => message.role === role);
}

export function isCarsClarificationRepair(content: string): boolean {
  const normalized = content.trim();
  return repairIntentPatterns.some((pattern) => pattern.test(normalized));
}

export function createCarsClarificationRepair(
  messages: readonly CarsConversationMessage[],
): CarsConversationResponse | undefined {
  const user = latestMessage(messages, "user");
  if (!user || !isCarsClarificationRepair(user.content)) return undefined;

  const assistant = latestMessage(messages, "assistant");
  if (!assistant) return undefined;
  if (
    "discriminatorChoices" in assistant
    && Array.isArray(assistant.discriminatorChoices)
    && assistant.discriminatorChoices.length > 0
  ) return undefined;

  if (/(?:bütçe|üst sınır|fiyat|budget|maximum)/iu.test(assistant.content)) {
    return {
      kind: "QUESTION",
      message: "Örneğin 1,5 milyon TL'ye kadar veya 2 milyon TL civarı gibi yaklaşık bir üst sınır söyleyebilirsiniz. Henüz belli değilse bütçeyi şimdilik açık bırakabiliriz.",
    };
  }
  if (/(?:arazi|kötü yol|kamp|stabilize|off-road|rough road)/iu.test(assistant.content)) {
    return {
      kind: "QUESTION",
      message: "Örneğin kamp alanlarına giden stabilize yollar, çamurlu köy yolları veya daha dik ve zorlu parkurlar birbirinden farklı araç özellikleri gerektirir. Sizinkine en yakın kullanım hangisi?",
      options: ["Kamp ve stabilize yol", "Çamurlu/kötü köy yolu", "Ciddi arazi kullanımı"],
    };
  }
  if (/(?:nasıl kullan|kullanım|günlük hayat|usage|how will you use)/iu.test(assistant.content)) {
    return {
      kind: "QUESTION",
      message: "Örneğin çoğunlukla şehir içi, uzun yol, aile kullanımı veya yük taşıma gibi kullanım biçimlerinden hangisinin ağırlıklı olacağını söyleyebilirsiniz.",
    };
  }
  return {
    kind: "QUESTION",
    message: "Önceki soruyla, araç seçimini gerçekten değiştirecek ihtiyacınızı kastediyorum. İsterseniz bunu günlük kullanımınızdan somut bir örnekle anlatabilirsiniz.",
  };
}

function normalizeAssistantMessage(content: string): string {
  return content
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createNonRepeatingAlternative(previous: string): string {
  if (/(?:bütçe|üst sınır|fiyat|budget|maximum)/iu.test(previous)) {
    return "Yaklaşık bir aralık da yeterli: örneğin 1–1,5 milyon TL veya 2 milyon TL'ye kadar diyebilirsiniz. Bütçe henüz net değilse şimdilik açık bırakıp kullanım ihtiyacınıza geçebiliriz.";
  }
  if (/(?:arazi|kötü yol|kamp|stabilize|off-road|rough road)/iu.test(previous)) {
    return "Kullanım koşulunu somutlaştıralım: çoğunlukla stabilize kamp yolları mı, çamurlu/kötü yollar mı, yoksa ciddi arazi parkurları mı düşünüyorsunuz?";
  }
  return "Aynı soruyu tekrarlamayayım. Araç seçiminizi en çok değiştirecek tek ihtiyacı günlük hayatınızdan bir örnekle anlatabilir misiniz?";
}

export function suppressRepeatedCarsResponse(
  inputMessages: readonly CarsConversationMessage[],
  response: CarsConversationResponse,
): CarsConversationResponse {
  const structuredChoiceResponse = response.kind === "QUESTION"
    && "discriminatorChoices" in response
    && Boolean(response.discriminatorChoices?.length);
  const finalDiscriminatorState = response.kind === "QUESTION"
    && (response.decision as { readonly conversationState?: string } | undefined)?.conversationState === "FINAL_DISCRIMINATOR_REQUIRED";
  if (response.kind !== "QUESTION" || structuredChoiceResponse || finalDiscriminatorState) {
    return response;
  }
  const recentAssistantMessages = inputMessages
    .filter((message) => message.role === "assistant")
    .slice(-2);
  const normalizedResponse = normalizeAssistantMessage(response.message);
  const repeated = recentAssistantMessages.find(
    (message) => normalizeAssistantMessage(message.content) === normalizedResponse,
  );
  if (!repeated) return response;

  return {
    kind: "QUESTION",
    message: createNonRepeatingAlternative(repeated.content),
  };
}
