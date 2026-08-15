import type { CarsConversationMessage } from "@/types/carsConversation";

export function hasActiveFinalDiscriminator(messages: readonly CarsConversationMessage[]): boolean {
  const latest = messages.at(-1);
  return latest?.role === "assistant" && Boolean(latest.discriminatorChoices?.length);
}
