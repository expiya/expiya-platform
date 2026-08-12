import type { CarsConversationMessage } from "@/types/carsConversation";

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
