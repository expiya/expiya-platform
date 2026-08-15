import type {
  CarsActiveOptionSet,
  CarsConversationResponse,
  CarsConversationTrace,
  CarsQuestionPurpose,
} from "@/types/carsConversation";

import { assessCarsConversationSufficiency } from "./assessCarsConversationSufficiency";
import { applyAssistantMove } from "./carsConversationMemory";
import { cannotRepeatQuestion } from "./carsSemanticLoopGuard";
import { isFrustration, latestRequirement } from "./carsRequirementLedger";

const USAGE_DETAIL_OPTIONS: CarsActiveOptionSet["options"] = [
  { id: "usage-camp", label: "Kamp ve stabilize yol", semanticValue: "CAMP" },
  { id: "usage-rough", label: "Çamurlu/kötü yol", semanticValue: "ROUGH_ROAD" },
  { id: "usage-serious", label: "Ciddi arazi kullanımı", semanticValue: "SERIOUS_OFF_ROAD" },
];

export function createCarsBoundedRecovery(
  trace: CarsConversationTrace,
  latestUser: string,
): { response: CarsConversationResponse; conversation: CarsConversationTrace } {
  const sufficiency = assessCarsConversationSufficiency(trace);
  const frustration = isFrustration(latestUser);
  if (frustration) {
    const message = latestRequirement(trace, "BODY_TYPE")
      ? "Haklısınız; pickup tercihiniz net ve konuşmanın merkezinde. Önceki soruyu şimdilik kenara bırakıyorum; bundan sonra pickup ve yol dışı kullanımınızı birlikte esas alacağım."
      : "Sizi aynı yere döndürdüm. Son söylediğiniz ihtiyacı esas alıp buradan daha somut ilerleyelim.";
    const conversation = applyAssistantMove(trace, {
      phase: "LIMITED_BY_EVIDENCE",
      purpose: "OFF_TOPIC_REDIRECT",
      prompt: message,
      progressEvent: "repair",
    });
    return {
      response: { kind: "QUESTION", message, conversation: { ...conversation, state: "INSUFFICIENT_SUPPORTED_EVIDENCE" } },
      conversation,
    };
  }

  const purpose = sufficiency.nextPurpose && !cannotRepeatQuestion(trace, sufficiency.nextPurpose)
    ? sufficiency.nextPurpose
    : undefined;
  const move = recoveryMove(trace, purpose, latestUser);
  const conversation = applyAssistantMove(trace, {
    phase: sufficiency.readyToEvaluate ? "READY_TO_EVALUATE" : purpose ? "CLARIFYING" : "LIMITED_BY_EVIDENCE",
    purpose: move.purpose,
    prompt: move.message,
    options: move.options,
    progressEvent: "bounded-recovery",
  });
  return {
    response: {
      kind: "QUESTION",
      message: move.message,
      options: move.options?.options.map((option) => option.label),
      conversation,
    },
    conversation,
  };
}

function recoveryMove(
  trace: CarsConversationTrace,
  purpose: CarsQuestionPurpose | undefined,
  latestUser: string,
): { message: string; purpose?: CarsQuestionPurpose; options?: CarsActiveOptionSet } {
  const budget = latestRequirement(trace, "BUDGET_MAX_TRY");
  if (trace.capturedOnLatestTurn.includes("BUDGET_MAX_TRY") && budget) {
    const serious = latestRequirement(trace, "USAGE_SERIOUS_OFF_ROAD");
    return {
      purpose: "DAILY_VS_OFFROAD",
      message: serious
        ? `${Number(budget.value).toLocaleString("tr-TR")} TL üst sınır net. Ciddi arazi ana iş olacaksa şehir konforundan ne kadar ödün verebileceğiniz seçimi değiştirir; araç hafta içinde de düzenli kullanılacak mı?`
        : `${Number(budget.value).toLocaleString("tr-TR")} TL üst sınır net. Kamp ve yol dışı kullanımın yanında araç hafta içinde şehirde de düzenli çalışacak mı?`,
    };
  }
  if (trace.capturedOnLatestTurn.includes("EQUIPMENT_LEVEL")) {
    return {
      purpose: "EQUIPMENT_SCOPE",
      message: "Donanım tarafında önceliğiniz hangisi: sürüş destekleri ve görüş mü, kabin konforu mu, yoksa araziye yarayan ekipman mı?",
    };
  }
  if (trace.capturedOnLatestTurn.includes("PARTY_SIZE")) {
    const party = latestRequirement(trace, "PARTY_SIZE")?.value;
    return {
      purpose: "PARTY_CONFIRMATION",
      message: `${party} kişinin rahat edeceği, küçük hissettirmeyen bir araç arıyorsunuz. ${party} koltuğun her zaman kullanılabilir olması kesin şart mı?`,
    };
  }
  if (trace.capturedOnLatestTurn.includes("DRIVETRAIN")) {
    return {
      purpose: "DAILY_VS_OFFROAD",
      message: "4x4 beklentisi kullanım yönünü iyice netleştiriyor. Araç hafta içinde şehirde de çalışacak mı, yoksa önceliği kamp ve yol dışı kullanım mı?",
    };
  }
  if (trace.capturedOnLatestTurn.includes("BODY_TYPE")) {
    return {
      purpose: "BODY_TYPE",
      message: "Pickup tercihi net. Kasayı daha çok kamp yükü için mi, iş ve ekipman taşımak için mi düşünüyorsunuz?",
    };
  }
  if (purpose === "USAGE_DETAIL") {
    const message = /arazi|off-road|kötü yol/iu.test(latestUser)
      ? "Arazi tarafını konuşabiliriz; kamp ve stabilize yol, çamurlu/kötü yol ve ciddi arazi birbirinden farklı araç ister. Hangisine daha yakınsınız?"
      : "Kullanımı netleştirelim: kamp ve stabilize yol, çamurlu/kötü yol, yoksa ciddi arazi mi öne çıkıyor?";
    return {
      message,
      purpose,
      options: {
        id: "opt-usage-detail",
        purpose,
        options: USAGE_DETAIL_OPTIONS,
        sourceAssistantTurn: trace.latestUserTurn,
        active: true,
      },
    };
  }
  if (purpose === "PARTY_CONFIRMATION") {
    const party = latestRequirement(trace, "PARTY_SIZE")?.value;
    return {
      purpose,
      message: `${party} kişinin rahat edeceği, küçük hissettirmeyen bir araç arıyorsunuz. ${party} koltuğun her zaman kullanılabilir olması kesin şart mı?`,
    };
  }
  if (purpose === "MIN_SEATS") {
    const equipment = latestRequirement(trace, "EQUIPMENT_LEVEL");
    return {
      purpose,
      message: equipment
        ? "Yüksek donanım isteğinizi kaydettim; mevcut doğrulanmış veriyle donanım seviyesini kıyaslayamıyorum. Aracı düzenli olarak kaç kişi kullanacak?"
        : "Aracı düzenli olarak kaç kişi kullanacak? En az kaç koltuk gerekli?",
    };
  }
  if (purpose === "MIN_CARGO") {
    const seats = latestRequirement(trace, "MIN_SEATS")?.value;
    return {
      purpose,
      message: seats
        ? `${seats} kişilik kullanım tamam. Araç doluyken bagajda genelde ne taşıyacaksınız: kamp ekipmanı, büyük valizler, çocuk arabası, yoksa günlük birkaç parça mı?`
        : "Bagajda günlük olarak ne taşıyacaksınız: kamp ekipmanı, büyük valizler, çocuk arabası, yoksa birkaç küçük parça mı?",
    };
  }
  if (purpose === "PRIMARY_USAGE") {
    return { purpose, message: "Bu araç sizin gününüzde asıl hangi işi görmeli: işe gidiş, aile, uzun yol, yoksa henüz net değil mi?" };
  }
  if (purpose === "DAILY_VS_OFFROAD") {
    return {
      purpose,
      message: latestRequirement(trace, "USAGE_SERIOUS_OFF_ROAD")
        ? "Ciddi arazi isteğiniz kaydı duruyor. Aracı yine de günlük şehirde de kullanacak mısınız, yoksa arazi önceliği açık ara daha mı yüksek?"
        : "Kamp ve stabilize yol ihtiyacınız duruyor. Bu araç günlük şehir işlerinde de mi kullanılacak, yoksa asıl işi arazi ve yol dışı mı?",
    };
  }
  if (!purpose && latestRequirement(trace, "PARTY_SIZE") && !latestRequirement(trace, "MIN_SEATS")) {
    const party = latestRequirement(trace, "PARTY_SIZE")?.value;
    return {
      purpose: "PARTY_CONFIRMATION",
      message: `${party} kişinin rahat edeceği, küçük hissettirmeyen bir araç arıyorsunuz. ${party} koltuğun her zaman kullanılabilir olması kesin şart mı?`,
    };
  }
  if (!purpose && latestRequirement(trace, "EQUIPMENT_LEVEL") && !latestRequirement(trace, "MIN_SEATS")) {
    return {
      purpose: trace.askedQuestionPurposes.includes("MIN_SEATS") ? undefined : "MIN_SEATS",
      message: "Donanımın boş kalmaması önemli. Sizin için daha belirleyici olan sürüş destekleri mi, kabin konforu mu, yoksa arazi ekipmanı mı?",
    };
  }
  if (!purpose && (latestRequirement(trace, "DRIVETRAIN") || latestRequirement(trace, "BODY_TYPE"))) {
    return {
      message: latestRequirement(trace, "BODY_TYPE")
        ? "Pickup net; kasayı daha çok kamp yükü için mi, iş ve ekipman taşımak için mi kullanacaksınız?"
        : "4x4 isteğiniz ciddi arazi kullanımıyla örtüşüyor. Araç hafta içinde şehirde de kullanılacak mı?",
    };
  }
  return {
    purpose: "OFF_TOPIC_REDIRECT",
    message: "Son söylediğiniz noktayı kaçırmadım. Aracı en çok zorlayacak gerçek kullanım anını anlatırsanız doğru yerden devam edebiliriz.",
  };
}

export const discoveryUsageOptions = USAGE_DETAIL_OPTIONS;
