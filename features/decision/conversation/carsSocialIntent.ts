import type { CarsConversationMessage, CarsConversationTrace } from "@/types/carsConversation";

import { isOffTopic } from "./carsRequirementLedger";

export type CarsPrimaryAct =
  | "GREETING"
  | "THANKS"
  | "CASUAL"
  | "VEHICLE_INTENT"
  | "INFORMATION"
  | "ANSWER"
  | "UNCERTAINTY"
  | "HESITATION"
  | "HUMOUR"
  | "FRUSTRATION"
  | "CORRECTION"
  | "MISUNDERSTANDING"
  | "TOPIC_CHANGE"
  | "RETURN_TO_VEHICLE"
  | "RECOMMENDATION_ACCEPTANCE"
  | "RECOMMENDATION_DECLINE"
  | "RECOMMENDATION_REJECTION"
  | "OTHER";

export interface CarsLatestAct {
  readonly primaryAct: CarsPrimaryAct;
  readonly interpretation: string;
  readonly callsForSocialResponseFirst: boolean;
  readonly answersActiveQuestion: boolean;
  readonly isPureGreeting: boolean;
  readonly isPureSocial: boolean;
  readonly hasVehicleIntent: boolean;
  readonly isRecommendationAcceptance: boolean;
  readonly isRecommendationDecline: boolean;
  readonly isRecommendationRejection: boolean;
  readonly isSocialDetour: boolean;
  readonly isReturnToVehicle: boolean;
  readonly isCorrection: boolean;
  readonly isFrustration: boolean;
}

const GREETING_ONLY = /^(?:merhaba|selam(?:lar)?|hey+|hi+|hello|günaydın|iyi (?:akşamlar|günler|geceler)|selamün aleyküm)(?:\s*[:)(!.,]*)*$/iu;
const THANKS_ONLY = /^(?:teşekkür(?:ler| ederim)?|sağ ol(?:un)?|çok teşekkürler|thanks|thank you|ty)(?:\s*[:)(!.,]*)*$/iu;
const CASUAL_ONLY = /^(?:nasılsın(?:ız)?|naber|ne haber|iyi misin|how are you|what's up|ne yapıyorsun)(?:\s*[?!.]*)*$/iu;
const HUMOUR_ONLY = /^(?:haha+|hehe+|lol|😂|😄|😄+|😄)(?:\s*[:)(!.,]*)*$/iu;
const HESITATION = /^(?:bilmiyorum|emin değilim|kararsızım|düşünmem lazım|bir bakayım|şimdilik duralım|idk|not sure)(?:\s*[?!.]*)*$/iu;

const VEHICLE_INTENT = /(?:araba|araç|otomobil|ilan|suv|sedan|pickup|pikap|4x4|koltuk|bagaj|bütçe|milyon|donanım|kişi(?:lik)?|ranger|hilux|corolla|civic|ioniq|araba almak|araç bak|karşılaştır|kıyasla|\bvs\.?\b|versus|arazi|off-road|kötü yol|kamp|stabilize|kullanacağım|bakıyorum)/iu;
const DISCOVERY_QUESTION = /(?:hangi senaryo|nasıl kullan|kaç koltuk|kaç litre|üst bütçe|bagaj|gövde tipi|yakıt|vites|daraltalım|en çok hangi|kaç kişi)/iu;
const ACCEPTANCE = /^(?:evet|aynen|olur|tamam|ok|okay|göster|göreyim|göster bakayım|isterim|istiyorum|önerini göster|kartı göster|bakalım)(?:\s*[:)(!.,]*)*$/iu;
const DECLINE = /^(?:hayır|yok|şimdilik değil|gerek yok|istemiyorum|daha sonra|sonra bakarız|gösterme)(?:\s*[:)(!.,]*)*$/iu;
const REJECTION = /(?:beğenmedim|hoşuma gitmedi|bunlar olmaz|başka seçenek|farklı bir araç|bu olmaz|istemiyorum bu)/iu;
const FRUSTRATION = /(?:dedim ya|anlamadın mı|anlamdın mı|az önce söyledim|yine aynı|salaksın|aptal|anlamıyor musun)/iu;
const CORRECTION = /^(?:hayır[,.]?\s+|aslında\s+|düzelt(?:eyim|mek istiyorum)|yanlış(?:tı| anladın)|(\d{1,2})\s*(?:koltuk\s+)?yeter)/iu;
const RETURN_TO_VEHICLE = /(?:araç(?:a|lara)? dön|konumuza dön|araba(?:ya)? dön|nerede kalmıştık|kaldığımız yer)/iu;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function latestUserContent(messages: readonly CarsConversationMessage[]): string {
  return [...messages].reverse().find((message) => message.role === "user")?.content.trim() ?? "";
}

export function textHasVehicleIntent(text: string): boolean {
  return VEHICLE_INTENT.test(text);
}

export function isPureGreetingText(text: string): boolean {
  return GREETING_ONLY.test(normalize(text));
}

export function isDiscoveryQuestion(text: string): boolean {
  return DISCOVERY_QUESTION.test(text);
}

export function interpretLatestUserAct(
  messages: readonly CarsConversationMessage[],
  memory?: CarsConversationTrace,
): CarsLatestAct {
  const content = latestUserContent(messages);
  const normalized = normalize(content);
  const vehicleIntentAlready = Boolean(memory?.vehicleIntentEstablished) || messages.some((message) => (
    message.role === "user" && textHasVehicleIntent(message.content) && !GREETING_ONLY.test(normalize(message.content))
  ));
  const hasVehicleIntentInMessage = textHasVehicleIntent(content);
  const greetingOnly = GREETING_ONLY.test(normalized) && !hasVehicleIntentInMessage;
  const thanksOnly = THANKS_ONLY.test(normalized);
  const casualOnly = CASUAL_ONLY.test(normalized);
  const humourOnly = HUMOUR_ONLY.test(normalized);
  const hesitationOnly = HESITATION.test(normalized);
  const offerActive = memory?.recommendationOfferStatus === "AWAITING_CONSENT";
  const shown = memory?.recommendationOfferStatus === "REVEALED" || memory?.advisorStage === "RECOMMENDATION_SHOWN";
  const pendingDiscovery = Boolean(memory?.lastAssistantQuestion)
    && memory?.recommendationOfferStatus !== "AWAITING_CONSENT";
  const isAcceptance = ACCEPTANCE.test(normalized);
  const isDecline = DECLINE.test(normalized);

  if (greetingOnly && !hasVehicleIntentInMessage) {
    return act("GREETING", "Pure social greeting.", true, false, {
      isPureGreeting: true,
      isPureSocial: true,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (thanksOnly) {
    return act("THANKS", "Social thanks.", true, false, {
      isPureSocial: true,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (casualOnly) {
    return act("CASUAL", "Ordinary social check-in.", true, false, {
      isPureSocial: true,
      isSocialDetour: vehicleIntentAlready,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (humourOnly) {
    return act("HUMOUR", "Light social humour.", true, false, {
      isPureSocial: true,
      isSocialDetour: vehicleIntentAlready,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (FRUSTRATION.test(content)) {
    return act("FRUSTRATION", "User is frustrated by a prior turn.", true, false, {
      isFrustration: true,
      hasVehicleIntent: vehicleIntentAlready || hasVehicleIntentInMessage,
    });
  }
  if (REJECTION.test(content) && shown) {
    return act("RECOMMENDATION_REJECTION", "User rejected a shown recommendation.", true, false, {
      isRecommendationRejection: true,
      hasVehicleIntent: true,
    });
  }
  if (offerActive && isDecline && !pendingDiscovery) {
    return act("RECOMMENDATION_DECLINE", "User declined to view the held recommendation.", true, false, {
      isRecommendationDecline: true,
      hasVehicleIntent: true,
    });
  }
  if (offerActive && isAcceptance && !pendingDiscovery) {
    return act("RECOMMENDATION_ACCEPTANCE", "User accepted the active recommendation offer.", false, true, {
      isRecommendationAcceptance: true,
      hasVehicleIntent: true,
    });
  }
  if (CORRECTION.test(normalized) || /hayır[,.]?\s+\d{1,2}\s*(?:koltuk\s+)?yeter/iu.test(normalized)) {
    return act("CORRECTION", "User corrected a previously stored fact.", true, Boolean(pendingDiscovery), {
      isCorrection: true,
      hasVehicleIntent: true,
    });
  }
  if (hesitationOnly) {
    return act("HESITATION", "User is hesitating without new vehicle facts.", true, false, {
      isPureSocial: !vehicleIntentAlready,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (RETURN_TO_VEHICLE.test(content) && vehicleIntentAlready) {
    return act("RETURN_TO_VEHICLE", "User is returning to the vehicle topic.", false, false, {
      hasVehicleIntent: true,
      isReturnToVehicle: true,
    });
  }
  if (hasVehicleIntentInMessage) {
    return act(memory?.vehicleIntentEstablished ? "INFORMATION" : "VEHICLE_INTENT",
      "User expressed vehicle intent.",
      GREETING_ONLY.test(normalized.split(/[,.]/)[0]?.trim() ?? ""),
      false,
      { hasVehicleIntent: true });
  }
  if (!vehicleIntentAlready && !hasVehicleIntentInMessage && normalized.length < 80) {
    return act("CASUAL", "Ordinary social or unrelated remark.", true, false, {
      isPureSocial: true,
    });
  }
  if (pendingDiscovery && isAcceptance) {
    return act("ANSWER", "Short affirmative bound to the active discovery question.", false, true, {
      hasVehicleIntent: true,
    });
  }
  if (isAcceptance && /[?]/u.test([...messages].reverse().find((message) => message.role === "assistant")?.content ?? "") && !offerActive) {
    return act("ANSWER", "Short affirmative bound to the previous assistant question.", false, true, {
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (vehicleIntentAlready && !hasVehicleIntentInMessage && isOffTopic(content)) {
    return act("TOPIC_CHANGE", "Brief social detour while vehicle context exists.", true, false, {
      isSocialDetour: true,
      isPureSocial: true,
      hasVehicleIntent: true,
    });
  }
  if (pendingDiscovery) {
    return act("INFORMATION", "User supplied information that may or may not answer the active question.", false, false, {
      hasVehicleIntent: true,
    });
  }
  return act(hasVehicleIntentInMessage || vehicleIntentAlready ? "INFORMATION" : "OTHER", "Latest message interpreted in context.", false, false, {
    hasVehicleIntent: hasVehicleIntentInMessage || vehicleIntentAlready,
  });
}

function act(
  primaryAct: CarsPrimaryAct,
  interpretation: string,
  callsForSocialResponseFirst: boolean,
  answersActiveQuestion: boolean,
  flags: Partial<Omit<CarsLatestAct, "primaryAct" | "interpretation" | "callsForSocialResponseFirst" | "answersActiveQuestion">>,
): CarsLatestAct {
  return {
    primaryAct,
    interpretation,
    callsForSocialResponseFirst,
    answersActiveQuestion,
    isPureGreeting: false,
    isPureSocial: false,
    hasVehicleIntent: false,
    isRecommendationAcceptance: false,
    isRecommendationDecline: false,
    isRecommendationRejection: false,
    isSocialDetour: false,
    isReturnToVehicle: false,
    isCorrection: false,
    isFrustration: false,
    ...flags,
  };
}
