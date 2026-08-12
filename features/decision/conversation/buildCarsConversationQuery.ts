import type { CarsConversationMessage } from "@/types/carsConversation";

export function buildCarsConversationQuery(
  messages: readonly CarsConversationMessage[],
): string {
  const userMessages = messages.filter((message) => message.role === "user");

  return [
    "Automobile decision conversation (oldest to newest):",
    ...userMessages.map(
      (message, index) => `User turn ${index + 1}: ${message.content.trim()}`,
    ),
    "Use the complete conversation as the request. When the user explicitly changes or corrects a preference, the newest statement replaces the older one.",
  ].join("\n");
}
