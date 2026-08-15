import type { CarsConversationMessage, CarsConversationTrace } from "@/types/carsConversation";

import { isDealerListingClaim } from "./carsAcquisitionAuthority";
import { isOffTopic, latestRequirement } from "./carsRequirementLedger";

export type CarsPrimaryAct =
  | "GREETING"
  | "THANKS"
  | "CASUAL"
  | "SOCIAL_CHECK_IN"
  | "CAPABILITY_QUESTION"
  | "VEHICLE_INTENT"
  | "HELP_START_REQUEST"
  | "INFORMATION"
  | "FACT_PROVISION"
  | "ANSWER"
  | "UNCERTAINTY"
  | "HESITATION"
  | "HUMOUR"
  | "FRUSTRATION"
  | "CORRECTION"
  | "MISUNDERSTANDING"
  | "TOPIC_CHANGE"
  | "RETURN_TO_VEHICLE"
  | "RETURN_TO_TOPIC"
  | "DIRECT_RECOMMENDATION_REQUEST"
  | "DIRECT_MODEL_COMPARISON_REQUEST"
  | "RECOMMENDATION_ACCEPTANCE"
  | "RECOMMENDATION_DECLINE"
  | "OFFER_ACCEPTANCE"
  | "OFFER_DECLINE"
  | "RECOMMENDATION_REJECTION"
  | "LISTING_CLAIM"
  | "CONVERSATION_EXIT"
  | "OTHER";

export interface CarsLatestAct {
  readonly primaryAct: CarsPrimaryAct;
  readonly secondaryActs: readonly CarsPrimaryAct[];
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
  readonly isCapabilityQuestion: boolean;
  readonly isHelpStart: boolean;
  readonly isDirectRecommendationRequest: boolean;
  readonly isDirectModelComparison: boolean;
  readonly isListingClaim: boolean;
  readonly isImpatient: boolean;
  readonly namedModel?: string;
}

const GREETING_ONLY = /^(?:merhaba|selam(?:lar)?|hey+|hi+|hello|günaydın|iyi (?:akşamlar|günler|geceler)|selamün aleyküm)(?:\s*[:)(!.,]*)*$/iu;
const THANKS_ONLY = /^(?:teşekkür(?:ler| ederim)?|sağ ol(?:un)?|çok teşekkürler|thanks|thank you|ty)(?:\s*[:)(!.,]*)*$/iu;
const CASUAL_ONLY = /^(?:nasılsın(?:ız)?|naber|ne haber|iyi misin|how are you|what's up|ne yapıyorsun)(?:\s*[?!.]*)*$/iu;
const HUMOUR_ONLY = /^(?:haha+|hehe+|lol|😂|😄)(?:\s*[:)(!.,]*)*$/iu;
const HESITATION = /^(?:bilmiyorum|emin değilim|kararsızım|düşünmem lazım|bir bakayım|şimdilik duralım|idk|not sure)(?:\s*[?!.]*)*$/iu;
const EXIT_ONLY = /^(?:görüşürüz|hoşça kal(?:ın)?|bye|kapat(?:ıyorum)?|ben kaçarım)(?:\s*[!.,]*)*$/iu;

const VEHICLE_INTENT = /(?:araba|araç|otomobil|ilan|suv|sedan|pickup|pikap|4x4|koltuk|bagaj|bütçe|milyon|donanım|kişi(?:lik)?|ranger|hilux|corolla|civic|ioniq|clio|araba almak|araç bak|karşılaştır|kıyasla|\bvs\.?\b|versus|arazi|off-road|kötü yol|kamp|stabilize|kullanacağım|bakıyorum)/iu;
const DISCOVERY_QUESTION = /(?:hangi senaryo|nasıl kullan|kaç koltuk|kaç litre|üst bütçe|bagaj|gövde tipi|yakıt|vites|daraltalım|en çok hangi|kaç kişi)/iu;
const CAPABILITY = /(?:ne yapabildiğini|ne yapabiliyorsun|neler yapabilirsin|ne işe yararsın|bana nasıl yardımcı|ne konuda yardımcı|yeteneklerin|ne yapıyorsun sen)/iu;
const HELP_START = /(?:nereden başla|nereden başlamalıyım|nereden başlayacağımı|nereden başlayayım|nasıl başlarım|nereden tutayım)/iu;
const RETURN_TO_TOPIC = /(?:arabaya dön|araca dön|konumuza dön|araba(?:ya)? dönelim|nerede kalmıştık|kaldığımız yer|neyse[,.]?\s*araba)/iu;
const DIRECT_NAMED_ALT = /(?:harici ne var|dışında ne var|yerine ne var|alternatif(?:in|ler)?(?:i|ini)?\s*(?:söyle|ver|nedir)|isim ver|model(?:\s+adı)?\s*(?:söyle|ver)|ne önerirsin(?:\s+söyle)?|başka ne(?:\s+var)?\s*söyle)/iu;
const DIRECT_COMPARISON = /(?:almamı önerdi[,.]?\s*sen ne dersin|sen ne dersin|ne dersin\s*\?|kıyasla|karşılaştır|vs\.?|versus)/iu;
const IMPATIENCE = /(?:hadi|acele et|lafı uzatma|aynı şeyi tekrar|uzatma artık|direkt söyle|hemen söyle)/iu;
const FRUSTRATION = /(?:dedim ya|anlamadın mı|anlamdın mı|az önce söyledim|yine aynı|salaksın|aptal|anlamıyor musun|aynı şeyi tekrar ediyorsun)/iu;
const REJECTION = /(?:beğenmedim|hoşuma gitmedi|bunlar olmaz|başka seçenek|farklı bir araç|bu olmaz|istemiyorum bu)/iu;
const NAMED_MODEL = /\b(clio|corolla|civic|focus|golf|polo|megane|fluence|passat|octavia|ioniq|tucson|captur|ranger|hilux|yaris|fiesta)\b/iu;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function folded(text: string): string {
  return normalize(text).toLocaleLowerCase("tr-TR");
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

export function isOfferAcceptanceText(text: string): boolean {
  const value = folded(text);
  if (!value) return false;
  if (isOfferDeclineText(value)) return false;
  if (/^(?:evet|aynen|olur|tamam|ok|okay|göster|göreyim|göster bakayım|isterim|istiyorum|önerini göster|kartı göster|bakalım)(?:\s*[:)(!.,]*)*$/iu.test(value)) {
    return true;
  }
  return /(?:görelim|göreyim|göster|görmek istiyorum|neymiş)/iu.test(value)
    && /(?:tamam|evet|olur|hadi|peki|bakalım|göster|görelim|neymiş)/iu.test(value);
}

export function isOfferDeclineText(text: string): boolean {
  const value = folded(text);
  if (/hayır[,.]?\s+\d{1,2}\s*(?:koltuk\s+)?yeter/iu.test(value)) return false;
  if (/bütçeyi yanlış|aslında bütçe/iu.test(value)) return false;
  if (/^(?:hayır|yok|şimdilik değil|gerek yok|istemiyorum|daha sonra|sonra bakarız|gösterme|vazgeçtim|kalsın)(?:\s*[:)(!.,]*)*$/iu.test(value)) {
    return true;
  }
  return /(?:görmek istemiyorum|şimdilik istemiyorum|şimdi göstermene gerek yok|sonra bakarız|vazgeçtim|kalsın|gösterme)/iu.test(value)
    || /hayır[,.]?\s+(?:şimdilik|görmek|istemiyorum|gösterme)/iu.test(value);
}

export function isCapabilityQuestionText(text: string): boolean {
  return CAPABILITY.test(text);
}

export function isHelpStartText(text: string): boolean {
  return HELP_START.test(text);
}

export function isDirectRecommendationRequestText(text: string): boolean {
  return DIRECT_NAMED_ALT.test(text) || /(?:alternatif|başka model|clio harici|clio dışında)/iu.test(text);
}

export function isDirectModelComparisonText(text: string): boolean {
  return DIRECT_COMPARISON.test(text) && NAMED_MODEL.test(text);
}

export function namedModelInText(text: string): string | undefined {
  const match = text.match(NAMED_MODEL);
  return match?.[1]?.toLocaleLowerCase("tr-TR");
}

export function isImpatientText(text: string): boolean {
  return IMPATIENCE.test(text);
}

export function isActualCorrection(text: string, memory?: CarsConversationTrace): boolean {
  const value = folded(text);
  if (/hayır[,.]?\s+\d{1,2}\s*(?:koltuk\s+)?yeter/iu.test(value)) return true;
  if (/(?:bütçeyi yanlış|aslında bütçe|üzerine çıkmak istemiyorum)/iu.test(value) && (memory?.requirements.some((entry) => entry.key === "BUDGET_MAX_TRY") || /milyon|bütçe/iu.test(value))) {
    return Boolean(memory?.requirements.some((entry) => entry.key === "BUDGET_MAX_TRY")) || /bütçeyi yanlış/iu.test(value);
  }
  if (/^(?:hayır[,.]?\s+|aslında\s+|düzelt(?:eyim|mek istiyorum)|yanlış(?:tı| anladın))/iu.test(value)) {
    if (HELP_START.test(value) || textHasVehicleIntent(value) && !latestRequirement(memory ?? emptyMemory(), "MIN_SEATS") && !latestRequirement(memory ?? emptyMemory(), "BUDGET_MAX_TRY") && !latestRequirement(memory ?? emptyMemory(), "MIN_CARGO_L")) {
      return false;
    }
    return Boolean(memory?.requirements.length);
  }
  return false;
}

function emptyMemory(): CarsConversationTrace {
  return {
    version: 1,
    state: "SOCIAL_OPEN",
    phase: "SOCIAL_OPEN",
    advisorStage: "SOCIAL_OPEN",
    vehicleIntentEstablished: false,
    humanReady: false,
    governedReady: false,
    recommendationOfferStatus: "NONE",
    requirements: [],
    askedQuestionPurposes: [],
    answeredQuestionPurposes: [],
    latestUserTurn: 0,
    capturedOnLatestTurn: [],
    didConversationProgress: false,
    textInputAllowed: true,
    optionHistory: [],
    rejectedRecommendationIds: [],
    semanticFingerprint: "",
    loopCount: 0,
  };
}

export function detectAddressForm(text: string): "SEN" | "SIZ" | undefined {
  if (/(?:hoş geldiniz|bütçeniz|istediğiniz|\bsiz\b|\bsizin\b|\bsizi\b|\bsize\b|misiniz|mısınız|musunuz|müsünüz|nasılsınız|yapabildiğinizi)/iu.test(text)) {
    return "SIZ";
  }
  if (/(?:hoş geldin\b|bütçen\b|düşünüyorsun|istiyorsun|\bsen\b|\bsenin\b|\bseni\b|\bsana\b|misin|mısın|musun|müsün|nasılsın|yapabildiğini)/iu.test(text)) {
    return "SEN";
  }
  return undefined;
}

export function resolveConversationAddressForm(
  messages: readonly CarsConversationMessage[],
  memory?: CarsConversationTrace,
): "SEN" | "SIZ" | undefined {
  if (memory?.addressForm) return memory.addressForm;
  for (const message of messages) {
    if (message.role !== "user") continue;
    const form = detectAddressForm(message.content);
    if (form) return form;
  }
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const form = detectAddressForm(message.content);
    if (form) return form;
  }
  return undefined;
}

export function priorDirectRecommendationRequest(messages: readonly CarsConversationMessage[]): boolean {
  return messages.some((message) => (
    message.role === "user"
    && (isDirectRecommendationRequestText(message.content) || isDirectModelComparisonText(message.content))
  ));
}

export function priorNamedModel(messages: readonly CarsConversationMessage[]): string | undefined {
  for (const message of [...messages].reverse()) {
    if (message.role !== "user") continue;
    const named = namedModelInText(message.content);
    if (named) return named;
  }
  return undefined;
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
  const offerActive = memory?.recommendationOfferStatus === "AWAITING_CONSENT";
  const shown = memory?.recommendationOfferStatus === "REVEALED" || memory?.advisorStage === "RECOMMENDATION_SHOWN";
  const pendingDiscovery = Boolean(memory?.lastAssistantQuestion) && memory?.recommendationOfferStatus !== "AWAITING_CONSENT";
  const secondary: CarsPrimaryAct[] = [];
  const namedModel = namedModelInText(content);

  if (GREETING_ONLY.test(normalized) && !hasVehicleIntentInMessage) {
    return act("GREETING", [], "Pure social greeting.", true, false, {
      isPureGreeting: true,
      isPureSocial: true,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (THANKS_ONLY.test(normalized)) {
    return act("THANKS", [], "Social thanks.", true, false, {
      isPureSocial: true,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (CASUAL_ONLY.test(normalized)) {
    return act("SOCIAL_CHECK_IN", ["CASUAL"], "Ordinary social check-in.", true, false, {
      isPureSocial: true,
      isSocialDetour: vehicleIntentAlready,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (HUMOUR_ONLY.test(normalized)) {
    return act("HUMOUR", [], "Light social humour.", true, false, {
      isPureSocial: true,
      isSocialDetour: vehicleIntentAlready,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (EXIT_ONLY.test(normalized)) {
    return act("CONVERSATION_EXIT", [], "User is leaving the conversation.", true, false, {
      isPureSocial: true,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (isCapabilityQuestionText(content)) {
    return act("CAPABILITY_QUESTION", hasVehicleIntentInMessage ? ["VEHICLE_INTENT"] : [], "User asked what the assistant can do.", false, false, {
      isCapabilityQuestion: true,
      hasVehicleIntent: vehicleIntentAlready || hasVehicleIntentInMessage,
      isHelpStart: HELP_START.test(content),
    });
  }
  if (REJECTION.test(content) && shown) {
    return act("RECOMMENDATION_REJECTION", [], "User rejected a shown recommendation.", true, false, {
      isRecommendationRejection: true,
      hasVehicleIntent: true,
    });
  }
  if (offerActive && isOfferDeclineText(content)) {
    return act("OFFER_DECLINE", ["RECOMMENDATION_DECLINE"], "User declined to view the held recommendation.", true, false, {
      isRecommendationDecline: true,
      hasVehicleIntent: true,
    });
  }
  if (offerActive && isOfferAcceptanceText(content)) {
    return act("OFFER_ACCEPTANCE", ["RECOMMENDATION_ACCEPTANCE"], "User accepted the active recommendation offer.", false, true, {
      isRecommendationAcceptance: true,
      hasVehicleIntent: true,
    });
  }
  if (isDealerListingClaim(content)) {
    return act("LISTING_CLAIM", ["INFORMATION"], "User reported a dealer or listing price observation.", false, false, {
      hasVehicleIntent: true,
      isListingClaim: true,
      namedModel,
    });
  }
  if (isImpatientText(content) && (isDirectRecommendationRequestText(content) || priorDirectRecommendationRequest(messages))) {
    return act("DIRECT_RECOMMENDATION_REQUEST", ["FRUSTRATION"], "User is impatient for a named recommendation.", false, false, {
      hasVehicleIntent: true,
      isDirectRecommendationRequest: true,
      isImpatient: true,
      isFrustration: FRUSTRATION.test(content),
      namedModel: namedModel ?? priorNamedModel(messages),
    });
  }
  if (FRUSTRATION.test(content)) {
    return act("FRUSTRATION", isImpatientText(content) ? ["DIRECT_RECOMMENDATION_REQUEST"] : [], "User is frustrated by a prior turn.", true, false, {
      isFrustration: true,
      isImpatient: isImpatientText(content),
      isDirectRecommendationRequest: priorDirectRecommendationRequest(messages),
      hasVehicleIntent: vehicleIntentAlready || hasVehicleIntentInMessage,
      namedModel: namedModel ?? priorNamedModel(messages),
    });
  }
  if (isActualCorrection(content, memory)) {
    return act("CORRECTION", hasVehicleIntentInMessage ? ["VEHICLE_INTENT"] : [], "User corrected a previously stored fact.", true, Boolean(pendingDiscovery), {
      isCorrection: true,
      hasVehicleIntent: true,
    });
  }
  if (RETURN_TO_TOPIC.test(content) && vehicleIntentAlready) {
    return act("RETURN_TO_TOPIC", ["RETURN_TO_VEHICLE"], "User is returning to the vehicle topic.", false, false, {
      hasVehicleIntent: true,
      isReturnToVehicle: true,
    });
  }
  if (isDirectModelComparisonText(content)) {
    if (HELP_START.test(content)) secondary.push("HELP_START_REQUEST");
    secondary.push("VEHICLE_INTENT");
    return act("DIRECT_MODEL_COMPARISON_REQUEST", secondary, "User asked for a professional view on a named model.", false, false, {
      hasVehicleIntent: true,
      isDirectModelComparison: true,
      isDirectRecommendationRequest: isDirectRecommendationRequestText(content),
      namedModel,
      isImpatient: isImpatientText(content),
    });
  }
  if (isDirectRecommendationRequestText(content)) {
    return act("DIRECT_RECOMMENDATION_REQUEST", ["VEHICLE_INTENT"], "User asked for named alternatives.", false, false, {
      hasVehicleIntent: true,
      isDirectRecommendationRequest: true,
      namedModel,
      isImpatient: isImpatientText(content),
    });
  }
  if (hasVehicleIntentInMessage || HELP_START.test(content)) {
    if (HELP_START.test(content)) secondary.push("HELP_START_REQUEST");
    if (hasVehicleIntentInMessage) secondary.push("VEHICLE_INTENT");
    const primary: CarsPrimaryAct = HELP_START.test(content)
      ? (memory?.vehicleIntentEstablished ? "HELP_START_REQUEST" : "VEHICLE_INTENT")
      : memory?.vehicleIntentEstablished ? "FACT_PROVISION" : "VEHICLE_INTENT";
    if (primary === "VEHICLE_INTENT" && HELP_START.test(content)) {
      if (!secondary.includes("HELP_START_REQUEST")) secondary.push("HELP_START_REQUEST");
    }
    return act(primary, [...new Set(secondary.filter((item) => item !== primary))], "User expressed vehicle intent or asked how to start.", GREETING_ONLY.test(normalized.split(/[,.]/)[0]?.trim() ?? ""), false, {
      hasVehicleIntent: true,
      isHelpStart: HELP_START.test(content),
      isImpatient: isImpatientText(content),
    });
  }
  if (HESITATION.test(normalized)) {
    return act("HESITATION", [], "User is hesitating without new vehicle facts.", true, false, {
      isPureSocial: !vehicleIntentAlready,
      hasVehicleIntent: vehicleIntentAlready,
    });
  }
  if (!vehicleIntentAlready && !hasVehicleIntentInMessage && normalized.length < 80) {
    return act("CASUAL", [], "Ordinary social or unrelated remark.", true, false, {
      isPureSocial: true,
    });
  }
  if (pendingDiscovery && isOfferAcceptanceText(content) && !offerActive) {
    return act("ANSWER", [], "Short affirmative bound to the active discovery question.", false, true, {
      hasVehicleIntent: true,
    });
  }
  if (vehicleIntentAlready && !hasVehicleIntentInMessage && isOffTopic(content)) {
    return act("TOPIC_CHANGE", [], "Brief social detour while vehicle context exists.", true, false, {
      isSocialDetour: true,
      isPureSocial: true,
      hasVehicleIntent: true,
    });
  }
  if (pendingDiscovery) {
    return act("FACT_PROVISION", ["INFORMATION"], "User supplied information that may or may not answer the active question.", false, false, {
      hasVehicleIntent: true,
    });
  }
  return act(vehicleIntentAlready ? "FACT_PROVISION" : "OTHER", vehicleIntentAlready ? ["INFORMATION"] : [], "Latest message interpreted in context.", false, false, {
    hasVehicleIntent: vehicleIntentAlready,
    isImpatient: isImpatientText(content),
  });
}

function act(
  primaryAct: CarsPrimaryAct,
  secondaryActs: readonly CarsPrimaryAct[],
  interpretation: string,
  callsForSocialResponseFirst: boolean,
  answersActiveQuestion: boolean,
  flags: Partial<Omit<CarsLatestAct, "primaryAct" | "secondaryActs" | "interpretation" | "callsForSocialResponseFirst" | "answersActiveQuestion">>,
): CarsLatestAct {
  return {
    primaryAct,
    secondaryActs,
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
    isCapabilityQuestion: false,
    isHelpStart: false,
    isDirectRecommendationRequest: false,
    isDirectModelComparison: false,
    isListingClaim: false,
    isImpatient: false,
    ...flags,
  };
}
