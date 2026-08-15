import type { CarsConversationMessage } from "@/types/carsConversation";

export type CarsForwardProgressType =
  | "ANSWERED_DIRECT_QUESTION"
  | "NEW_DISTINCTION"
  | "SUPPORTED_RECOMMENDATION_ACTION"
  | "STATED_LIMITATION"
  | "ASKED_MATERIAL_QUESTION"
  | "REPAIRED_MISUNDERSTANDING"
  | "CHANGED_STATE"
  | "NONE";

export interface CarsForwardProgress {
  readonly forwardProgressType: CarsForwardProgressType;
  readonly newInformationComparedWithRecentTurns: boolean;
  readonly directQuestionAnswered: boolean;
  readonly semanticRepetitionDetected: boolean;
  readonly repairApplied: boolean;
}

const GENERIC_CLIO_FRAMES = [
  /küçük otomatik hatchback/iu,
  /kolay park/iu,
  /düşük (?:masraf|gider|risk)/iu,
  /ikinci el(?:de)? yaygın/iu,
  /aktif ikinci el/iu,
  /temiz örnek/iu,
  /clio (?:kötü bir öneri değil|mantıklı)/iu,
  /tek seçenek değil/iu,
  /rastgele (?:seç|model)/iu,
  /ezbere (?:olur|isim)/iu,
];

const VAGUE_CONTINUITY = /son söylediğiniz noktayı kaçırmadım|kaldığımız yerden devam ederiz(?!.*(?:şehir|aile|bütçe|koltuk))/iu;

export function assistantRepeatsGenericAdvice(
  message: string,
  recentAssistant: readonly string[],
): boolean {
  const currentHits = GENERIC_CLIO_FRAMES.filter((pattern) => pattern.test(message));
  if (currentHits.length === 0) return false;
  return recentAssistant.some((prior) => currentHits.some((pattern) => pattern.test(prior)));
}

export function isVagueContinuityPhrase(message: string): boolean {
  return /son söylediğiniz noktayı kaçırmadım/iu.test(message)
    || /isters(?:eniz|en) oradan devam ederiz/iu.test(message)
    || VAGUE_CONTINUITY.test(message);
}

export function assessForwardProgress(input: {
  readonly latestUser: string;
  readonly assistantMessage: string;
  readonly recentAssistant: readonly string[];
  readonly directQuestionAnswered: boolean;
  readonly stateChanged: boolean;
  readonly askedMaterialQuestion: boolean;
  readonly statedLimitation: boolean;
  readonly repaired: boolean;
  readonly recommendationAction: boolean;
}): CarsForwardProgress {
  const repetition = assistantRepeatsGenericAdvice(input.assistantMessage, input.recentAssistant)
    || (isVagueContinuityPhrase(input.assistantMessage) && input.recentAssistant.length > 0);
  let type: CarsForwardProgressType = "NONE";
  if (input.repaired) type = "REPAIRED_MISUNDERSTANDING";
  else if (input.statedLimitation) type = "STATED_LIMITATION";
  else if (input.recommendationAction) type = "SUPPORTED_RECOMMENDATION_ACTION";
  else if (input.directQuestionAnswered) type = "ANSWERED_DIRECT_QUESTION";
  else if (input.stateChanged) type = "CHANGED_STATE";
  else if (input.askedMaterialQuestion) type = "ASKED_MATERIAL_QUESTION";
  else if (!repetition) type = "NEW_DISTINCTION";
  return {
    forwardProgressType: repetition && type === "NONE" ? "NONE" : type,
    newInformationComparedWithRecentTurns: !repetition && type !== "NONE",
    directQuestionAnswered: input.directQuestionAnswered,
    semanticRepetitionDetected: repetition,
    repairApplied: input.repaired,
  };
}

export function recentAssistantTexts(messages: readonly CarsConversationMessage[], limit = 4): string[] {
  return messages.filter((message) => message.role === "assistant").map((message) => message.content).slice(-limit);
}
