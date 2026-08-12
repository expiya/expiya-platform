import type { CarsConversationMessage } from "@/types/carsConversation";

export type CarsConversationLocale = "tr" | "en";

const genericIntentPatterns = [
  /^(?:ben\s+)?(?:bir\s+)?(?:araba|otomobil|araç)\s+(?:almak|satın almak)\s+istiyorum[.!]?$/iu,
  /^(?:bir\s+)?(?:araba|otomobil|araç)\s+(?:arıyorum|lazım|istiyorum)[.!]?$/iu,
  /^(?:i\s+)?(?:want|need|would like)\s+(?:to buy\s+)?(?:a\s+)?(?:car|vehicle)[.!]?$/iu,
  /^(?:i(?:'m| am)\s+)?looking for\s+(?:a\s+)?(?:car|vehicle)[.!]?$/iu,
];

export function hasActionableCarsContext(
  messages: readonly CarsConversationMessage[],
): boolean {
  const userTurns = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  return userTurns.some(
    (turn) => !genericIntentPatterns.some((pattern) => pattern.test(turn)),
  );
}

function userText(messages: readonly CarsConversationMessage[]): string {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
}

export function latestUserDoesNotKnow(
  messages: readonly CarsConversationMessage[],
): boolean {
  const latest = [...messages].reverse().find((message) => message.role === "user");
  return Boolean(latest && /(?:bilmiyorum|emin değilim|fikrim yok|kararsızım|i don'?t know|not sure)[.!]?$/iu.test(latest.content.trim()));
}

export function lastAssistantQuestionTopic(
  messages: readonly CarsConversationMessage[],
): "USAGE" | "BUDGET" | "PREFERENCE" | undefined {
  const latest = [...messages].reverse().find((message) => message.role === "assistant");
  if (!latest) return undefined;
  if (/(?:bütçe|fiyat|budget|price)/iu.test(latest.content)) return "BUDGET";
  if (/(?:nasıl kullan|işe gid|şehir içi|how will you use)/iu.test(latest.content)) return "USAGE";
  if (/(?:özellik|önemli|tercih|feature|matter most)/iu.test(latest.content)) return "PREFERENCE";
  return undefined;
}

export function resolveCarsConversationLocale(
  messages: readonly CarsConversationMessage[],
): CarsConversationLocale {
  const text = userText(messages).toLocaleLowerCase("tr-TR");
  return /[çğıöşü]|\b(?:araba|otomobil|araç|almak|istiyorum|bütçe|kullanacağım|kullanacağiz|şehir|yakıt|küçük|büyük|karşılaştır)\b/iu.test(text)
    ? "tr"
    : "en";
}

export function isCandidateComparisonConversation(
  messages: readonly CarsConversationMessage[],
): boolean {
  const text = userText(messages);
  return /(?:karşılaştır|kıyasla)/iu.test(text)
    || /\b(?:compare|comparison|versus|vs\.?)\b/iu.test(text);
}

export function hasExplicitBudget(
  messages: readonly CarsConversationMessage[],
): boolean {
  const text = userText(messages);
  return /(?:bütçe|fiyat|en fazla|en çok|altında)/iu.test(text)
    || /\b(?:budget|price|under|up to)\b/iu.test(text)
    || /\d[\d.,\s]*(?:₺|tl|try|lira|milyon|million|bin|thousand)/iu.test(text);
}

export function hasUsageOrPreference(
  messages: readonly CarsConversationMessage[],
): boolean {
  const text = userText(messages);
  return /(?:işe|gidiş|geliş|şehir|uzun yol|aile|çocuk|park|küçük|kompakt|büyük|geniş|yük|eşya|malzeme|koli|ekipman|yolcu|personel|servis|römork|karavan|arazi|yakıt|benzin|dizel|hibrit|elektrik|otomatik|manuel)/iu.test(text)
    || /\b(?:suv|sedan|hatchback|pickup|van|commut|city|highway|family|children|parking|cargo|haul|towing|off-road|small|compact|large|spacious|fuel|gasoline|diesel|hybrid|electric|automatic|manual)\b/iu.test(text);
}
