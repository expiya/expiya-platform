import type { CarsConversationMessage, CarsConversationTrace, CarsQuestionPurpose } from "@/types/carsConversation";

import { carsQuestionPurpose } from "./carsRequirementLedger";

export interface CarsConversationQualityReport {
  readonly factRetention: boolean;
  readonly shortAnswerBinding: boolean;
  readonly correctionAccuracy: boolean;
  readonly repeatedSemanticQuestionCount: number;
  readonly unsupportedFactHonesty: boolean;
  readonly prematureDecision: boolean;
  readonly unnecessaryQuestionCount: number;
  readonly decisionGrounded: boolean;
  readonly latestUserAcknowledged: boolean;
  readonly progressed: boolean;
  readonly roboticTemplateHits: number;
}

const ROBOTIC = [
  /kararı gerçekten değiştirecek son noktayı netleştirelim/iu,
  /sizin için vazgeçilmez özellik nedir/iu,
  /aynı soruyu tekrarlamayayım/iu,
  /günlük hayatınızdan bir örnek verir misiniz/iu,
  /koltuk veya bagaj için sayısal eşik/iu,
  /mevcut doğrulanmış (?:karar )?(?:veri|kapsam)/iu,
  /size uygun aracı birlikte daraltalım/iu,
  /(?:kaydettim|not ettim)/iu,
  /minimum hacmi.*litre/iu,
  /USAGE_[A-Z_]+,\s*[A-Z_]+,\s*[A-Z_]+/,
  /son söylediğiniz noktayı kaçırmadım/iu,
  /isters(?:eniz|en) oradan devam ederiz/iu,
  /kullanım bağlamınız duruyor/iu,
  /isim uyduramam/iu,
  /burada durabiliriz/iu,
  /rastgele (?:isim saymam|model uydur)/iu,
  /sana model atamam/iu,
  /daha fazla bilgi verirsen belki/iu,
  /bütçene uyuyor/iu,
  /satın alabilirsin/iu,
  /bu fiyat aralığında/iu,
  /bütçenin içinde/iu,
  /ikinci elde bulunur/iu,
  /galeride vardır/iu,
];

export function evaluateCarsConversationQuality(input: {
  readonly messages: readonly CarsConversationMessage[];
  readonly conversation: CarsConversationTrace;
  readonly assistantMessage: string;
  readonly expectedKeys?: readonly string[];
  readonly shortAnswerBound?: boolean;
  readonly correctedKey?: string;
  readonly correctedValue?: string | number;
}): CarsConversationQualityReport {
  const asked: CarsQuestionPurpose[] = [];
  let repeats = 0;
  for (const message of input.messages) {
    if (message.role !== "assistant") continue;
    const purpose = carsQuestionPurpose(message.content);
    if (!purpose) continue;
    if (asked.includes(purpose) && purpose !== "OFF_TOPIC_REDIRECT") repeats += 1;
    asked.push(purpose);
  }
  const latestPurpose = carsQuestionPurpose(input.assistantMessage);
  if (latestPurpose && asked.includes(latestPurpose) && !input.conversation.didConversationProgress) repeats += 1;

  return {
    factRetention: (input.expectedKeys ?? []).every((key) => input.conversation.requirements.some((entry) => entry.key === key)),
    shortAnswerBinding: input.shortAnswerBound ?? input.conversation.requirements.some((entry) => entry.sourceText.trim().toLowerCase() === "evet"),
    correctionAccuracy: input.correctedKey
      ? input.conversation.requirements.some((entry) => entry.key === input.correctedKey && entry.value === input.correctedValue && entry.category === "CORRECTION")
      : true,
    repeatedSemanticQuestionCount: repeats,
    unsupportedFactHonesty: /doğrulanmış|kıyaslayam|yok sayarak|önermeyeceğim/iu.test(input.assistantMessage)
      || !input.conversation.requirements.some((entry) => entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE"),
    prematureDecision: input.conversation.phase === "DECISION_READY" && !input.conversation.requirements.some((entry) => entry.key === "MIN_SEATS" || entry.key === "MIN_CARGO_L"),
    unnecessaryQuestionCount: latestPurpose === "FINAL_PRIORITY" || latestPurpose === "BUDGET_MAX" && input.conversation.answeredQuestionPurposes.includes("BUDGET_MAX") ? 1 : 0,
    decisionGrounded: input.conversation.phase !== "DECISION_READY" || input.conversation.state === "DECISION_READY",
    latestUserAcknowledged: input.conversation.capturedOnLatestTurn.length > 0 || /kaydet|aldım|duruyor|anlad/iu.test(input.assistantMessage),
    progressed: input.conversation.didConversationProgress || input.conversation.phase !== "DISCOVERING",
    roboticTemplateHits: ROBOTIC.filter((pattern) => pattern.test(input.assistantMessage)).length,
  };
}
