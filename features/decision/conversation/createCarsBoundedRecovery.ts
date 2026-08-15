import type {
  CarsActiveOptionSet,
  CarsConversationResponse,
  CarsConversationTrace,
  CarsQuestionPurpose,
} from "@/types/carsConversation";

import { applyAssistantMove } from "./carsConversationMemory";
import { cannotRepeatQuestion } from "./carsSemanticLoopGuard";
import { isFrustration, latestRequirement } from "./carsRequirementLedger";
import type { CarsLatestAct } from "./carsSocialIntent";
import { textHasVehicleIntent } from "./carsSocialIntent";

const USAGE_DETAIL_OPTIONS: CarsActiveOptionSet["options"] = [
  { id: "usage-camp", label: "Kamp ve stabilize yol", semanticValue: "CAMP" },
  { id: "usage-rough", label: "Çamurlu/kötü yol", semanticValue: "ROUGH_ROAD" },
  { id: "usage-serious", label: "Ciddi arazi kullanımı", semanticValue: "SERIOUS_OFF_ROAD" },
];

export const FALLBACK_GREETING = "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?";
export const FALLBACK_THANKS = "Rica ederim.";
export const FALLBACK_OFFER = "Konuştuklarımızdan hareketle size güçlü bir önerim var. Görmek ister misiniz?";

export function createCarsBoundedRecovery(
  trace: CarsConversationTrace,
  latestUser: string,
  latestAct?: CarsLatestAct,
): { response: CarsConversationResponse; conversation: CarsConversationTrace } {
  const move = recoveryMove(trace, latestUser, latestAct);
  const conversation = applyAssistantMove(trace, {
    phase: move.phase ?? (trace.vehicleIntentEstablished ? "DISCOVERING" : "SOCIAL_OPEN"),
    purpose: move.purpose,
    prompt: move.message,
    options: move.options,
    progressEvent: "bounded-recovery",
    advisorStage: move.advisorStage ?? (trace.vehicleIntentEstablished ? "CONTEXT_UNDERSTANDING" : "SOCIAL_OPEN"),
    vehicleIntentEstablished: trace.vehicleIntentEstablished || Boolean(latestAct?.hasVehicleIntent),
    clearPendingQuestion: !move.purpose,
    recommendationOfferStatus: move.offer ? "AWAITING_CONSENT" : trace.recommendationOfferStatus,
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
  latestUser: string,
  latestAct?: CarsLatestAct,
): {
  message: string;
  purpose?: CarsQuestionPurpose;
  options?: CarsActiveOptionSet;
  phase?: CarsConversationTrace["phase"];
  advisorStage?: CarsConversationTrace["advisorStage"];
  offer?: boolean;
} {
  if (latestAct?.isPureGreeting && !textHasVehicleIntent(latestUser)) {
    return { message: FALLBACK_GREETING, phase: "SOCIAL_OPEN", advisorStage: "SOCIAL_OPEN" };
  }
  if (latestAct?.primaryAct === "THANKS") {
    return { message: FALLBACK_THANKS, phase: trace.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN", advisorStage: trace.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN" };
  }
  if (latestAct?.isRecommendationDecline) {
    return {
      message: "Tabii. İsterseniz konuşmaya devam ederiz, isterseniz burada durabiliriz.",
      phase: "RECOMMENDATION_DECLINED",
      advisorStage: "RECOMMENDATION_DECLINED",
    };
  }
  if (isFrustration(latestUser) || latestAct?.isFrustration) {
    const message = latestRequirement(trace, "BODY_TYPE")
      ? "Haklısınız; pickup tercihiniz net ve konuşmanın merkezinde. Önceki soruyu şimdilik kenara bırakıyorum; bundan sonra pickup ve yol dışı kullanımınızı birlikte esas alacağım."
      : "Sizi aynı yere döndürdüm. Son söylediğiniz ihtiyacı esas alıp buradan daha somut ilerleyelim.";
    return { message, phase: "RECOVERING", advisorStage: "RECOVERY" };
  }
  if (latestAct?.isCorrection) {
    const seats = latestRequirement(trace, "MIN_SEATS");
    return {
      message: seats
        ? `Tamam, ${seats.value} koltuk olarak güncelledim.`
        : "Tamam, son düzeltmenizi esas alıyorum.",
      phase: "DISCOVERING",
      advisorStage: "CONTEXT_UNDERSTANDING",
    };
  }
  if (
    (latestAct?.isSocialDetour || (latestAct?.isPureSocial && trace.vehicleIntentEstablished))
    && trace.capturedOnLatestTurn.length === 0
    && latestAct?.primaryAct !== "ANSWER"
    && latestAct?.primaryAct !== "INFORMATION"
    && latestAct?.primaryAct !== "VEHICLE_INTENT"
  ) {
    return {
      message: /hava/iu.test(latestUser)
        ? "Bugünün havasına bakamam."
        : latestAct?.primaryAct === "CASUAL"
          ? "İyiyim, teşekkürler."
          : "Tabii. Dilediğinizde kaldığımız yerden devam ederiz.",
      phase: "SOCIAL_DETOUR",
      advisorStage: "SOCIAL_DETOUR",
    };
  }
  if (trace.capturedOnLatestTurn.includes("BUDGET_MAX_TRY")) {
    const budget = latestRequirement(trace, "BUDGET_MAX_TRY");
    return {
      message: budget
        ? `${Number(budget.value).toLocaleString("tr-TR")} TL üst sınır net.`
        : "Bütçe sınırınız net.",
      phase: "DISCOVERING",
      advisorStage: "CONTEXT_UNDERSTANDING",
    };
  }
  if (trace.capturedOnLatestTurn.includes("EQUIPMENT_LEVEL")) {
    return {
      purpose: cannotRepeatQuestion(trace, "EQUIPMENT_SCOPE") ? undefined : "EQUIPMENT_SCOPE",
      message: "Donanım tarafında önceliğiniz hangisi: sürüş destekleri ve görüş mü, kabin konforu mu, yoksa araziye yarayan ekipman mı?",
    };
  }
  if (
    trace.capturedOnLatestTurn.includes("PARTY_SIZE")
    || (trace.capturedOnLatestTurn.includes("MIN_SEATS") && latestRequirement(trace, "PARTY_SIZE") && latestUser.trim().toLowerCase() === "evet")
  ) {
    const party = latestRequirement(trace, "PARTY_SIZE")?.value ?? latestRequirement(trace, "MIN_SEATS")?.value;
    if (latestUser.trim().toLowerCase() === "evet" && latestRequirement(trace, "MIN_SEATS")) {
      return {
        message: `${party} kişilik kullanım net. Bu araçta sizi asıl zorlayacak şey yol, yük, yoksa günlük konfor mu?`,
        phase: "DISCOVERING",
        advisorStage: "CONTEXT_UNDERSTANDING",
      };
    }
    return {
      purpose: "PARTY_CONFIRMATION",
      message: `${party} kişinin rahat edeceği, küçük hissettirmeyen bir araç arıyorsunuz. ${party} koltuğun her zaman kullanılabilir olması kesin şart mı?`,
    };
  }
  if (trace.capturedOnLatestTurn.includes("BODY_TYPE")) {
    return {
      message: "Pickup tercihi net. Kasayı daha çok kamp yükü için mi, iş ve ekipman taşımak için mi düşünüyorsunuz?",
      purpose: cannotRepeatQuestion(trace, "BODY_TYPE") ? undefined : "BODY_TYPE",
    };
  }
  if (trace.capturedOnLatestTurn.includes("DRIVETRAIN")) {
    return {
      message: "4x4 beklentisi kullanım yönünü iyice netleştiriyor. Araç hafta içinde şehirde de çalışacak mı, yoksa önceliği kamp ve yol dışı kullanım mı?",
    };
  }
  if (/aile/iu.test(latestUser) && !cannotRepeatQuestion(trace, "PRIMARY_USAGE") && !trace.askedQuestionPurposes.includes("USAGE_DETAIL")) {
    return {
      purpose: "PRIMARY_USAGE",
      message: "Aile kullanımı öne çıkıyor. Günlük hayatta bu araç sizin için asıl ne işi görecek?",
    };
  }
  if ((latestAct?.primaryAct === "VEHICLE_INTENT" || latestAct?.hasVehicleIntent) && /arazi|off-road|kötü yol|kamp|stabilize/iu.test(latestUser)
    && !trace.askedQuestionPurposes.includes("USAGE_DETAIL")) {
    return {
      purpose: "USAGE_DETAIL",
      message: /arazi|off-road|kötü yol/iu.test(latestUser)
        ? "Arazi tarafını konuşabiliriz; kamp ve stabilize yol, çamurlu/kötü yol ve ciddi arazi birbirinden farklı araç ister. Hangisine daha yakınsınız?"
        : "Kullanımı netleştirelim: kamp ve stabilize yol, çamurlu/kötü yol, yoksa ciddi arazi mi öne çıkıyor?",
      options: {
        id: "opt-usage-detail",
        purpose: "USAGE_DETAIL",
        options: USAGE_DETAIL_OPTIONS,
        sourceAssistantTurn: trace.latestUserTurn,
        active: true,
      },
    };
  }
  if (trace.capturedOnLatestTurn.some((key) => key.startsWith("USAGE_"))) {
    return {
      purpose: cannotRepeatQuestion(trace, "DAILY_VS_OFFROAD") ? undefined : "DAILY_VS_OFFROAD",
      message: latestRequirement(trace, "USAGE_SERIOUS_OFF_ROAD")
        ? "Ciddi arazi kullanımı net. Bu araç günlük hayatta da mı iş görecek, yoksa asıl işi arazi mi?"
        : "Kullanım yönü netleşti. Günlük hayatta da mı iş görecek, yoksa asıl işi yol dışı mı?",
    };
  }
  if (
    (latestAct?.primaryAct === "VEHICLE_INTENT" || latestAct?.hasVehicleIntent)
    && !cannotRepeatQuestion(trace, "PRIMARY_USAGE")
    && !trace.askedQuestionPurposes.includes("USAGE_DETAIL")
    && !trace.requirements.some((entry) => entry.key.startsWith("USAGE_"))
  ) {
    return {
      purpose: "PRIMARY_USAGE",
      message: /aile/iu.test(latestUser)
        ? "Aile kullanımı öne çıkıyor. Günlük hayatta bu araç sizin için asıl ne işi görecek?"
        : "Araba bakıyorsunuz. Bu araç sizin gününüzde asıl hangi işi görmeli?",
    };
  }
  if (latestAct?.primaryAct === "HESITATION") {
    return { message: "Acele etmeyin. Düşündüğünüzde kaldığınız yerden devam ederiz.", phase: "PAUSED", advisorStage: "PAUSED" };
  }
  return {
    message: textHasVehicleIntent(latestUser) || trace.vehicleIntentEstablished
      ? "Son söylediğiniz noktayı kaçırmadım. İsterseniz oradan devam ederiz."
      : FALLBACK_GREETING,
    phase: textHasVehicleIntent(latestUser) || trace.vehicleIntentEstablished ? "DISCOVERING" : "SOCIAL_OPEN",
    advisorStage: textHasVehicleIntent(latestUser) || trace.vehicleIntentEstablished ? "CONTEXT_UNDERSTANDING" : "SOCIAL_OPEN",
  };
}

export const discoveryUsageOptions = USAGE_DETAIL_OPTIONS;
