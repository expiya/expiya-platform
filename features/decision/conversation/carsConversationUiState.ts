import type { CarsConversationMessage, CarsConversationResponse } from "@/types/carsConversation";

export function hasActiveFinalDiscriminator(messages: readonly CarsConversationMessage[]): boolean {
  const latest = messages.at(-1);
  return latest?.role === "assistant" && Boolean(latest.discriminatorChoices?.length);
}

export function assistantShowsVehicleCard(message: CarsConversationMessage): boolean {
  return message.role === "assistant" && Boolean(message.recommendations?.length);
}

export function greetingShouldHideVehicleQuickReplies(latestUser: string): boolean {
  return /^(?:merhaba|selam)(?:\s*[:)(!.,]*)*$/iu.test(latestUser.trim());
}

export function shouldShowVehicleQuickReplies(
  latestUser: string,
  quickReplies: readonly string[] | undefined,
): boolean {
  return Boolean(quickReplies?.length) && !greetingShouldHideVehicleQuickReplies(latestUser);
}

export function shouldRenderRecommendationCards(
  kind: CarsConversationResponse["kind"] | undefined,
): boolean {
  return kind === "RECOMMENDATIONS";
}

export function shouldLockTextInput(messages: readonly CarsConversationMessage[]): boolean {
  return hasActiveFinalDiscriminator(messages);
}
