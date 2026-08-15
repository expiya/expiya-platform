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

function rememberedFacts(trace: CarsConversationTrace): string {
  const parts = trace.requirements.map((entry) => {
    if (entry.key === "BODY_TYPE") return `${entry.value}`.toLowerCase() === "pickup" ? "pickup tercihinizi" : `${entry.value} gövde tercihinizi`;
    if (entry.key === "DRIVETRAIN") return "4x4/AWD şartınızı";
    if (entry.key === "BUDGET_MAX_TRY") return `${Number(entry.value).toLocaleString("tr-TR")} TL bütçenizi`;
    if (entry.key === "EQUIPMENT_LEVEL") return "yüksek donanım isteğinizi";
    if (entry.key === "MIN_SEATS") return `${entry.value} koltuk şartınızı`;
    if (entry.key === "PARTY_SIZE") return `${entry.value} kişilik kullanımınızı`;
    if (entry.key === "SIZE_PREFERENCE") return "küçük olmama tercihinizi";
    if (entry.key === "USAGE_SERIOUS_OFF_ROAD") return "ciddi arazi kullanımınızı";
    if (entry.key === "USAGE_CAMP") return "kamp kullanımınızı";
    if (entry.key === "USAGE_STABILIZED_ROAD") return "stabilize yol kullanımınızı";
    if (entry.key === "USAGE_ROUGH_ROAD") return "arazi/kötü yol ihtiyacınızı";
    if (entry.key === "USAGE_CITY") return "şehir kullanımınızı";
    if (entry.key === "USAGE_HIGHWAY") return "uzun yol kullanımınızı";
    if (entry.key === "USAGE_FAMILY") return "aile kullanımınızı";
    if (entry.key === "TRANSMISSION") return `${entry.value}`.toLowerCase() === "automatic" ? "otomatik vites tercihinizi" : "vites tercihinizi";
    return undefined;
  }).filter((item): item is string => Boolean(item));
  if (parts.length === 0) return "şu ana kadar söylediklerinizi";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} ve ${parts.at(-1)}`;
}

export function createCarsBoundedRecovery(
  trace: CarsConversationTrace,
  latestUser: string,
): { response: CarsConversationResponse; conversation: CarsConversationTrace } {
  const sufficiency = assessCarsConversationSufficiency(trace);
  const frustration = isFrustration(latestUser);
  if (frustration) {
    const message = latestRequirement(trace, "BODY_TYPE")
      ? `Evet, ${rememberedFacts(trace)} kaydettim; bunları tekrar sormayacağım. Mevcut doğrulanmış karar verisi pickup ve 4x4 gibi boyutları adaylar arasında güvenilir kıyaslamadığı için yok sayarak araç seçmeyeceğim.`
      : `Evet, ${rememberedFacts(trace)} duruyor. Aynı soruyu tekrar etmeyeceğim.`;
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
      message: trace.requirements.length > 1
        ? `${rememberedFacts(trace)} kaydettim. En az ${party} koltuk sizin için zorunlu mu?`
        : `${party} kişi için yer istediğinizi aldım. En az ${party} koltuk sizin için zorunlu mu?`,
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
        ? `${seats} koltuk şartınızı onayladım. Bagaj için zorunlu bir minimum hacminiz var mı? Varsa litre olarak belirtir misiniz?`
        : "Bagaj için zorunlu bir minimum hacminiz varsa litre olarak yazar mısınız?",
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
      message: trace.requirements.length > 1
        ? `${rememberedFacts(trace)} kaydettim. En az ${party} koltuk sizin için zorunlu mu?`
        : `${party} kişi için yer istediğinizi aldım. En az ${party} koltuk sizin için zorunlu mu?`,
    };
  }
  if (!purpose && latestRequirement(trace, "EQUIPMENT_LEVEL") && !latestRequirement(trace, "MIN_SEATS")) {
    return {
      purpose: trace.askedQuestionPurposes.includes("MIN_SEATS") ? undefined : "MIN_SEATS",
      message: trace.askedQuestionPurposes.includes("MIN_SEATS")
        ? "Yüksek donanım isteğinizi kaydettim; mevcut doğrulanmış veriyle donanım seviyesini kıyaslayamıyorum. Koltuk veya bagaj için sayısal bir eşik verirseniz değerlendirmeye geçebilirim."
        : "Yüksek donanım isteğinizi kaydettim; mevcut doğrulanmış veriyle donanım seviyesini kıyaslayamıyorum. Aracı düzenli olarak kaç kişi kullanacak?",
    };
  }
  if (!purpose && (latestRequirement(trace, "DRIVETRAIN") || latestRequirement(trace, "BODY_TYPE"))) {
    return {
      message: latestRequirement(trace, "BODY_TYPE")
        ? "Pickup ve 4x4/AWD tercihleriniz kayıtlı. Mevcut doğrulanmış karar verisi bunları adaylar arasında kıyaslamıyor; yok sayarak seçim yapmayacağım. Desteklenen koltuk veya bagaj eşiğiniz varsa onu konuşabiliriz."
        : "4x4/AWD şartınızı kaydettim. Bunu mevcut doğrulanmış veriyle kıyaslayamadığım için yok sayarak karar vermeyeceğim. Desteklenen bir koltuk veya bagaj eşiğiniz var mı?",
    };
  }
  return {
    purpose: "OFF_TOPIC_REDIRECT",
    message: `Son mesajınızı aldım; ${rememberedFacts(trace)} yerinde. Mevcut doğrulanmış kapsam koltuk ve bagaj eşiklerini değerlendirebiliyor; bunlardan biri zorunluysa söyleyin, değilse bu sınırla güvenilir bir seçim yapmam.`,
  };
}

export const discoveryUsageOptions = USAGE_DETAIL_OPTIONS;
