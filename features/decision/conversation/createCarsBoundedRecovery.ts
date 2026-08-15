import type {
  CarsActiveOptionSet,
  CarsConversationResponse,
  CarsConversationTrace,
  CarsQuestionPurpose,
} from "@/types/carsConversation";

import { applyAssistantMove } from "./carsConversationMemory";
import { coverageLimitationMessage } from "./carsDirectRecommendation";
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
export const FALLBACK_OFFER = "Konuştuklarımızdan hareketle ihtiyacına uyan net bir önerim var. Görmek ister misin?";
export const FALLBACK_CAPABILITY = "İhtiyaçlarını dinleyip uygun arabayı birlikte daraltmana yardım ederim; satış baskısı yok. İlan ezberi veya rastgele model listesi uydurmam.";
export const FALLBACK_HELP_START = "En temiz başlangıç günlük hayat: araba daha çok şehir içi mi iş görecek, yoksa hafta sonu aile çıkışları da var mı?";
export const VAGUE_CONTINUITY = "Son söylediğiniz noktayı kaçırmadım. İsterseniz oradan devam ederiz.";

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

function resumeVehicleContext(trace: CarsConversationTrace): { message: string; purpose?: CarsQuestionPurpose } {
  const usage = latestRequirement(trace, "USAGE_CITY") ?? latestRequirement(trace, "USAGE_FAMILY");
  const budget = latestRequirement(trace, "BUDGET_MAX_TRY");
  if (usage && budget) {
    return {
      message: `Şehir ve aile kullanımı duruyor, üst sınır da ${Number(budget.value).toLocaleString("tr-TR")} TL. Bu çerçevede asıl belirleyici olan günlük konfor mu, yoksa bagaj/aile yükü mü?`,
    };
  }
  if (usage) {
    return { message: "Şehir ve hafta sonu aile kullanımı üzerinden gidelim. Arabayı daha çok günlük işler mi, yoksa aile çıkışları mı belirleyecek?" };
  }
  if (budget) {
    return { message: `${Number(budget.value).toLocaleString("tr-TR")} TL tavanın duruyor. Arabayı daha çok şehir içi mi, yoksa aileyle dışarı da mı kullanacaksın?` };
  }
  const pending = trace.lastAssistantQuestion ?? trace.questionMemory?.find((entry) => entry.status === "OPEN" || entry.status === "DEFERRED");
  if (pending?.purpose === "PRIMARY_USAGE") {
    return { purpose: "PRIMARY_USAGE", message: FALLBACK_HELP_START };
  }
  return { purpose: cannotRepeatQuestion(trace, "PRIMARY_USAGE") ? undefined : "PRIMARY_USAGE", message: FALLBACK_HELP_START };
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
  if ((latestAct?.primaryAct === "SOCIAL_CHECK_IN" || latestAct?.primaryAct === "CASUAL") && !trace.vehicleIntentEstablished && !latestAct?.hasVehicleIntent) {
    return {
      message: /hava/iu.test(latestUser) ? "Bugünün havasına bakamam." : "İyiyim, teşekkürler.",
      phase: trace.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
      advisorStage: trace.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
    };
  }
  if (latestAct?.isCapabilityQuestion || latestAct?.primaryAct === "CAPABILITY_QUESTION") {
    return { message: FALLBACK_CAPABILITY, phase: "SOCIAL_OPEN", advisorStage: "SOCIAL_OPEN" };
  }
  if (latestAct?.isRecommendationDecline || latestAct?.primaryAct === "OFFER_DECLINE") {
    return {
      message: "Tamam, şimdilik göstermiyorum. İstersen konuşmaya devam ederiz, istersen burada dururuz.",
      phase: "RECOMMENDATION_DECLINED",
      advisorStage: "RECOMMENDATION_DECLINED",
    };
  }
  if (latestAct?.primaryAct === "CONVERSATION_EXIT") {
    return { message: "Tamam, görüşürüz.", phase: "PAUSED", advisorStage: "PAUSED" };
  }
  if (isFrustration(latestUser) || latestAct?.isFrustration) {
    const message = latestRequirement(trace, "BODY_TYPE")
      ? "Haklısın; pickup tercihin net. Önceki soruyu kenara bırakıp pickup üzerinden gideceğim."
      : "Seni aynı yere döndürdüm. Son ihtiyacını esas alıp daha somut ilerleyelim.";
    return { message, phase: "RECOVERING", advisorStage: "RECOVERY" };
  }
  if (latestAct?.isCorrection && trace.capturedOnLatestTurn.length > 0) {
    const seats = latestRequirement(trace, "MIN_SEATS");
    const budget = latestRequirement(trace, "BUDGET_MAX_TRY");
    return {
      message: seats && trace.capturedOnLatestTurn.includes("MIN_SEATS")
        ? `Tamam, ${seats.value} koltuk olarak güncelledim.`
        : budget && trace.capturedOnLatestTurn.includes("BUDGET_MAX_TRY")
          ? `Tamam, tavan ${Number(budget.value).toLocaleString("tr-TR")} TL.`
          : "Tamam, son düzeltmeni esas alıyorum.",
      phase: "DISCOVERING",
      advisorStage: "CONTEXT_UNDERSTANDING",
    };
  }
  if (latestAct?.isReturnToVehicle || latestAct?.primaryAct === "RETURN_TO_TOPIC") {
    const resume = resumeVehicleContext(trace);
    return { ...resume, phase: "DISCOVERING", advisorStage: "CONTEXT_UNDERSTANDING" };
  }
  if (latestAct?.isDirectRecommendationRequest || latestAct?.isDirectModelComparison) {
    return {
      message: coverageLimitationMessage(latestAct.namedModel, trace.addressForm),
      phase: "LIMITED_BY_EVIDENCE",
      advisorStage: "NOT_RECOMMENDABLE",
    };
  }
  if (latestAct?.isHelpStart || latestAct?.primaryAct === "HELP_START_REQUEST" || latestAct?.primaryAct === "VEHICLE_INTENT") {
    if (/aile/iu.test(latestUser) && !cannotRepeatQuestion(trace, "PRIMARY_USAGE")) {
      return { purpose: "PRIMARY_USAGE", message: "Aile kullanımı öne çıkıyor. Günlük hayatta bu araç asıl ne işi görecek?" };
    }
    return { purpose: cannotRepeatQuestion(trace, "PRIMARY_USAGE") ? undefined : "PRIMARY_USAGE", message: FALLBACK_HELP_START };
  }
  if (
    (latestAct?.isSocialDetour || (latestAct?.isPureSocial && trace.vehicleIntentEstablished))
    && trace.capturedOnLatestTurn.length === 0
    && latestAct?.primaryAct !== "ANSWER"
    && latestAct?.primaryAct !== "FACT_PROVISION"
    && latestAct?.primaryAct !== "INFORMATION"
    && !latestAct?.isCapabilityQuestion
    && !latestAct?.isHelpStart
  ) {
    return {
      message: /hava/iu.test(latestUser)
        ? "Bugünün havasına bakamam."
        : latestAct?.primaryAct === "SOCIAL_CHECK_IN" || latestAct?.primaryAct === "CASUAL"
          ? "İyiyim, teşekkürler."
          : "Tamam. İstersen kaldığımız araç konusuna döneriz.",
      phase: "SOCIAL_DETOUR",
      advisorStage: "SOCIAL_DETOUR",
    };
  }
  if (trace.capturedOnLatestTurn.includes("BUDGET_MAX_TRY")) {
    const budget = latestRequirement(trace, "BUDGET_MAX_TRY");
    return {
      message: budget
        ? `${Number(budget.value).toLocaleString("tr-TR")} TL üst sınır net.`
        : "Bütçe sınırın net.",
      phase: "DISCOVERING",
      advisorStage: "CONTEXT_UNDERSTANDING",
    };
  }
  if (trace.capturedOnLatestTurn.includes("EQUIPMENT_LEVEL")) {
    return {
      purpose: cannotRepeatQuestion(trace, "EQUIPMENT_SCOPE") ? undefined : "EQUIPMENT_SCOPE",
      message: "Donanım tarafında önceliğin hangisi: sürüş destekleri ve görüş mü, kabin konforu mu, yoksa araziye yarayan ekipman mı?",
    };
  }
  if (
    trace.capturedOnLatestTurn.includes("PARTY_SIZE")
    || (trace.capturedOnLatestTurn.includes("MIN_SEATS") && latestRequirement(trace, "PARTY_SIZE") && latestUser.trim().toLowerCase() === "evet")
  ) {
    const party = latestRequirement(trace, "PARTY_SIZE")?.value ?? latestRequirement(trace, "MIN_SEATS")?.value;
    if (latestUser.trim().toLowerCase() === "evet" && latestRequirement(trace, "MIN_SEATS")) {
      return {
        message: `${party} kişilik kullanım net. Bu araçta asıl zorlayacak şey yol, yük, yoksa günlük konfor mu?`,
        phase: "DISCOVERING",
        advisorStage: "CONTEXT_UNDERSTANDING",
      };
    }
    return {
      purpose: "PARTY_CONFIRMATION",
      message: `${party} kişinin rahat edeceği, küçük hissettirmeyen bir araç arıyorsun. ${party} koltuğun her zaman kullanılabilir olması kesin şart mı?`,
    };
  }
  if (trace.capturedOnLatestTurn.includes("BODY_TYPE")) {
    return {
      message: "Pickup tercihi net. Kasayı daha çok kamp yükü için mi, iş ve ekipman taşımak için mi düşünüyorsun?",
      purpose: cannotRepeatQuestion(trace, "BODY_TYPE") ? undefined : "BODY_TYPE",
    };
  }
  if (trace.capturedOnLatestTurn.includes("DRIVETRAIN")) {
    return {
      message: "4x4 beklentisi kullanım yönünü netleştiriyor. Araç hafta içinde şehirde de çalışacak mı, yoksa önceliği kamp ve yol dışı kullanım mı?",
    };
  }
  if (/aile/iu.test(latestUser) && !cannotRepeatQuestion(trace, "PRIMARY_USAGE") && !trace.askedQuestionPurposes.includes("USAGE_DETAIL")) {
    return {
      purpose: "PRIMARY_USAGE",
      message: "Aile kullanımı öne çıkıyor. Günlük hayatta bu araç asıl ne işi görecek?",
    };
  }
  if (latestAct?.hasVehicleIntent && /arazi|off-road|kötü yol|kamp|stabilize/iu.test(latestUser)
    && !trace.askedQuestionPurposes.includes("USAGE_DETAIL")) {
    return {
      purpose: "USAGE_DETAIL",
      message: /arazi|off-road|kötü yol/iu.test(latestUser)
        ? "Arazi tarafını konuşabiliriz; kamp ve stabilize yol, çamurlu/kötü yol ve ciddi arazi birbirinden farklı araç ister. Hangisine daha yakınsın?"
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
  if (latestAct?.primaryAct === "HESITATION") {
    return { message: "Acele etme. Düşündüğünde kaldığımız yerden devam ederiz.", phase: "PAUSED", advisorStage: "PAUSED" };
  }
  const resume = resumeVehicleContext(trace);
  return {
    ...resume,
    phase: textHasVehicleIntent(latestUser) || trace.vehicleIntentEstablished ? "DISCOVERING" : "SOCIAL_OPEN",
    advisorStage: textHasVehicleIntent(latestUser) || trace.vehicleIntentEstablished ? "CONTEXT_UNDERSTANDING" : "SOCIAL_OPEN",
  };
}

export const discoveryUsageOptions = USAGE_DETAIL_OPTIONS;
