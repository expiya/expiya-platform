import type {
  CarsAcquisitionMarket,
  CarsAffordabilityState,
  CarsConversationTrace,
  CarsOfferPurpose,
  CarsRecommendationLevel,
  CarsRequirementKey,
} from "@/types/carsConversation";
import { PHASE1_ACTIVE_ACQUISITION_MARKET } from "@/types/carsConversation";

import { budgetValue, isHardBudgetCeiling, latestRequirement } from "./carsRequirementLedger";
import { formatGapPercentConsumer, formatTryConsumer, priceTypeLabel } from "./carsNewPriceAuthority";
import type { CarsPriceEvaluationResult } from "@/types/carsConversation";

const NAMED_MODEL = /\b(clio|corolla|civic|focus|golf|polo|megane|fluence|passat|octavia|ioniq|tucson|captur|ranger|hilux|yaris|fiesta)\b/iu;

const NEW_OR_USED = /(?:ikinci el(?:\s+de)?\s+olabilir|sıfır şart değil|ikisine de açığım|galeriden de olabilir|aslında ikinci el de düşünebilirim)/iu;
const NEW_ONLY = /(?:ikinci el istemiyorum|yalnız sıfır|sıfır araç (?:bakıyorum|istiyorum)|sıfır istiyorum)/iu;
const USED_ONLY = /(?:sıfıra gerek yok|ikinci el bakıyorum|(?:^|[,.]\s*)temiz ikinci el olur)/iu;
const AFFORDABILITY_MATERIAL = /(?:bütçeye uyar|bütçeme uyar|alabilir miyim|satın al(?:abilir miyim|ırım)?|bu fiyata|fiyatına alır|ödeyebilir|karşıl(?:ar|ıyor) mu\s+bütçe|2 milyona (?:alır|bulunur)|ilan bul|nereden (?:al|bul)|bütçeme uygun|bütçemi aşıyor|fiyatı ne kadar|tavanımın altında|sıfırı kaç para|bütçem yeter|artırırsam olur)/iu;
const DIRECT_AFFORDABILITY = /(?:bütçeme uygun mu|bütçemi aşıyor mu|fiyatı ne kadar|bu fiyat benim tavanımın altında mı|sıfırı kaç para|bu aracı almaya bütçem yeter mi|\d+(?:[.,]\d+)?\s*milyona? olur mu|bu araç .{0,24}uygun mu|bütçemi biraz artırırsam)/iu;
const USED_PURCHASE_REQUEST = /(?:ikinci el(?:[\s,;:.-]+(?:\d{4}\s+model\s+)?(?:bir\s+)?(?:araç|araba)|\s+(?:arıyorum|bakıyorum|istiyorum))|used (?:car|vehicle)|galeriden ikinci el)/iu;
const LISTING_URL = /https:\/\/[^\s<]+/iu;
const FORBIDDEN_AFFORDABILITY = /(?:bütçene uyuyor|satın alabilirsin|bu fiyat aralığında|bütçenin içinde|ikinci elde bulunur|galeride vardır|(?:bütçe.{0,24}ulaşılabilir)|ulaşılabilir bir (?:fiyat|araç))/iu;

export function detectAcquisitionMarket(text: string): CarsAcquisitionMarket | undefined {
  if (isDealerListingClaim(text)) return undefined;
  if (NEW_OR_USED.test(text)) return "NEW_OR_USED";
  if (NEW_ONLY.test(text)) return "NEW_ONLY";
  if (USED_ONLY.test(text)) return "USED_ONLY";
  return undefined;
}

export function isDealerListingClaim(text: string): boolean {
  const hasVenue = /galeri(?:de|den)|sahibinden|arabam(?:\.com)?|\bilan\b/iu.test(text);
  const hasPrice = /(?:\d+(?:[.,]\d+)?\s*milyon|\d[\d.\s]*\s*(?:tl|try|₺))/iu.test(text);
  const hasSeen = /gördüm|buldum|çıkmış|satılıyor/iu.test(text);
  return hasVenue && hasPrice && (hasSeen || NAMED_MODEL.test(text));
}

export function isAffordabilityMaterial(text: string): boolean {
  return AFFORDABILITY_MATERIAL.test(text);
}

export function messageClaimsAffordability(text: string): boolean {
  return FORBIDDEN_AFFORDABILITY.test(text);
}

export function dormantUserMarketIntent(memory: CarsConversationTrace): CarsAcquisitionMarket | undefined {
  const entry = latestRequirement(memory, "ACQUISITION_MARKET");
  if (typeof entry?.value === "string" && (
    entry.value === "USED_ONLY" || entry.value === "NEW_OR_USED"
  )) return entry.value;
  if (memory.acquisitionMarket === "USED_ONLY" || memory.acquisitionMarket === "NEW_OR_USED") {
    return memory.acquisitionMarket;
  }
  return undefined;
}

export function resolveAcquisitionMarket(_memory?: CarsConversationTrace): CarsAcquisitionMarket {
  void _memory;
  return PHASE1_ACTIVE_ACQUISITION_MARKET;
}

export function isDirectAffordabilityQuestion(text: string): boolean {
  return DIRECT_AFFORDABILITY.test(text) || /(?:bütçeme uygun|fiyatı ne kadar|bütçemi aşıyor|sıfırı kaç|almaya bütçem)/iu.test(text);
}

export function isUsedPurchaseRequest(text: string): boolean {
  if (isDealerListingClaim(text)) return false;
  const value = text.toLocaleLowerCase("tr-TR");
  return USED_PURCHASE_REQUEST.test(value) && !/(?:sadece|yalnız|yalnızca)\s+sıfır/iu.test(value);
}

export function isListingUrlSubmission(text: string): boolean {
  return LISTING_URL.test(text);
}

export function affordabilityQuestionCeilingTry(text: string): number | undefined {
  if (!isDirectAffordabilityQuestion(text) && !isAffordabilityMaterial(text)) return undefined;
  return budgetValue(text);
}

export function deriveAffordabilityState(input: {
  readonly memory: CarsConversationTrace;
  readonly latestUser: string;
  readonly evaluated?: CarsAffordabilityState;
}): CarsAffordabilityState {
  if (input.evaluated) return input.evaluated;
  const budget = latestRequirement(input.memory, "BUDGET_MAX_TRY");
  if (!budget && !affordabilityQuestionCeilingTry(input.latestUser)) return "AFFORDABILITY_NOT_REQUESTED";
  if (budget?.category === "SOFT_CONTEXT" && !isHardBudgetCeiling(input.latestUser) && !isDirectAffordabilityQuestion(input.latestUser)) {
    return "AFFORDABILITY_NOT_REQUESTED";
  }
  return input.memory.affordabilityState ?? "AFFORDABILITY_NOT_REQUESTED";
}

export function deriveRecommendationLevel(input: {
  readonly memory: CarsConversationTrace;
  readonly listingClaim?: boolean;
  readonly usedPurchaseRequest?: boolean;
  readonly budgetCompatible?: boolean;
}): CarsRecommendationLevel {
  if (input.listingClaim || input.usedPurchaseRequest) return "LISTING_ANALYSIS_ONLY";
  if (input.budgetCompatible) return "NEW_CONFIGURATION_RECOMMENDATION";
  return "MODEL_FIT_GUIDANCE";
}

export function stampAcquisitionAuthority(
  memory: CarsConversationTrace,
  extras: {
    readonly latestUser?: string;
    readonly listingClaim?: boolean;
    readonly usedPurchaseRequest?: boolean;
    readonly offerPurpose?: CarsOfferPurpose;
    readonly affordabilityState?: CarsAffordabilityState;
    readonly budgetCompatible?: boolean;
  } = {},
): CarsConversationTrace {
  return {
    ...memory,
    acquisitionMarket: PHASE1_ACTIVE_ACQUISITION_MARKET,
    affordabilityState: extras.affordabilityState
      ?? (extras.latestUser
        ? deriveAffordabilityState({ memory, latestUser: extras.latestUser })
        : memory.affordabilityState ?? "AFFORDABILITY_NOT_REQUESTED"),
    recommendationLevel: deriveRecommendationLevel({
      memory,
      listingClaim: extras.listingClaim,
      usedPurchaseRequest: extras.usedPurchaseRequest,
      budgetCompatible: extras.budgetCompatible,
    }),
    offerPurpose: extras.offerPurpose ?? memory.offerPurpose,
    usedPurchaseRequestDetected: extras.usedPurchaseRequest || memory.usedPurchaseRequestDetected,
  };
}

export function acquisitionMarketFact(text: string): { key: CarsRequirementKey; value: string } | undefined {
  const market = detectAcquisitionMarket(text);
  if (!market) return undefined;
  return { key: "ACQUISITION_MARKET", value: market };
}

export function hardBudgetPresent(memory: CarsConversationTrace): boolean {
  return memory.requirements.some((entry) => (
    entry.key === "BUDGET_MAX_TRY" && entry.category === "HARD_UNEVALUATED_CONSTRAINT"
  ));
}

export function affordabilityClaimAuthorized(memory: CarsConversationTrace): boolean {
  return memory.affordabilityState === "AFFORDABILITY_PASS";
}

export function purchasableUnitAuthorized(): boolean {
  return false;
}

export function marketClarificationMessage(_addressForm?: "SEN" | "SIZ"): string {
  void _addressForm;
  return usedVehicleScopeMessage();
}

export function usedVehicleScopeMessage(addressForm?: "SEN" | "SIZ"): string {
  return addressForm === "SIZ"
    ? "Şu an sıfır araçlarla bakıyorum. İkinci el ilan veya stok önermiyorum; isterseniz ihtiyaçlarınıza uyan sıfır bir yapılandırmaya bakabiliriz."
    : "Şu an sıfır araçlarla bakıyorum. İkinci el ilan veya stok önermiyorum; istersen ihtiyaçlarına uyan sıfır bir yapılandırmaya bakabiliriz.";
}

export function usedVehicleScopeRepeat(addressForm?: "SEN" | "SIZ"): string {
  return addressForm === "SIZ"
    ? "İkinci el tarafını açmıyorum; sıfır seçenek üzerinden devam edebiliriz."
    : "İkinci el tarafını açmıyorum; sıfır seçenek üzerinden devam edebiliriz.";
}

export function listingClaimMessage(addressForm?: "SEN" | "SIZ"): string {
  return addressForm === "SIZ"
    ? "O ilanı alım önerisi olarak değerlendirmiyorum. Şu an sıfır araç yapılandırmalarıyla ilerliyorum; isterseniz ona en yakın sıfır seçeneğe bakabiliriz."
    : "O ilanı alım önerisi olarak değerlendirmiyorum. Şu an sıfır araç yapılandırmalarıyla ilerliyorum; istersen ona en yakın sıfır seçeneğe bakabiliriz.";
}

export function listingUrlGateMessage(addressForm?: "SEN" | "SIZ"): string {
  return addressForm === "SIZ"
    ? "Paylaştığınız bağlantıyı satın alma önerisine çevirmiyorum. Şu an resmi sıfır yapılandırmalar üzerinden bakıyorum."
    : "Paylaştığın bağlantıyı satın alma önerisine çevirmiyorum. Şu an resmi sıfır yapılandırmalar üzerinden bakıyorum.";
}

export function affordabilityUnavailableMessage(market: CarsAcquisitionMarket): string {
  if (market === "NEW_ONLY") {
    return "Sıfır tarafında fiyatı henüz güvenilir biçimde kıyaslayamadığım için bunu alınabilir bir seçenek olarak sunmuyorum.";
  }
  if (market === "USED_ONLY") {
    return "İkinci el niyeti duruyor; elde güncel bir ilan olmadığı için bütçeye uyan bir araç var diyemem.";
  }
  return "Alım tarafını henüz doğrulayamadığım için bunu satın alınabilir bir öneri olarak sunmuyorum.";
}

export function modelFitRevealNote(_memory: CarsConversationTrace): string {
  void _memory;
  return "";
}

export function noAffordableMatchMessage(memory: CarsConversationTrace, ceilingTry: number, gapPercent?: number): string {
  const ceiling = formatTryConsumer(ceilingTry);
  const seats = latestRequirement(memory, "MIN_SEATS");
  const extreme = (gapPercent ?? 0) >= 50;
  if (extreme && typeof seats?.value === "number") {
    return `Şu an baktığım sıfır seçeneklerde hem koltuk hem bagaj şartını ${ceiling} tavanın içinde karşılayan bir yapılandırma yok. Fark büyük; bütçeyi zorlamak yerine ${seats.value} koltuk şartı her zaman gerekli mi, ona bakabiliriz.`;
  }
  return `Şu an baktığım sıfır seçeneklerde zorunlu şartların hepsini ${ceiling} tavanın içinde karşılayan bir yapılandırma yok. Bütçeyi esnetmek veya bir şartı gevşetmek dışında net bir sıfır eşleşme çıkaramıyorum. Hangisi konuşmaya değer?`;
}

export function budgetFlexibilityMessage(ceilingTry: number, gapTry?: number, gapPercent?: number): string {
  if (gapTry !== undefined && gapPercent !== undefined) {
    const extreme = gapPercent >= 50;
    const gap = `${formatTryConsumer(gapTry)} (${formatGapPercentConsumer(gapPercent)})`;
    if (extreme) {
      return `${formatTryConsumer(ceilingTry)} tavanla güncel sıfır fiyat arasında ${gap} fark var. Bu küçük bir esneme değil. Koltuk şartını konuşmak daha gerçekçi olabilir.`;
    }
    return `${formatTryConsumer(ceilingTry)} tavanla güncel sıfır fiyat arasında ${gap} fark var. Tavanı o kadar esnetmek ister misin, yoksa bir şartı mı gevşetelim?`;
  }
  return "Bütçeyi biraz artırmak bu seçenekte küçük bir fark kapatmaz; güncel sıfır fiyat hâlâ tavanın üzerinde. Koltuk veya bagaj şartını konuşabiliriz.";
}

export function shownCandidateAffordabilityMessage(input: {
  readonly identity: string;
  readonly amountTry?: number;
  readonly priceType?: "LIST" | "CAMPAIGN";
  readonly ceilingTry: number;
  readonly result: CarsPriceEvaluationResult;
  readonly caveat?: string;
}): string {
  if (input.result === "UNKNOWN" || input.amountTry === undefined) {
    return `${input.identity} için güncel sıfır fiyatı güvenilir biçimde kıyaslayamadım; bu bütçeye uyar diyemem.`;
  }
  const price = `güncel sıfır ${priceTypeLabel(input.priceType)} fiyatı ${formatTryConsumer(input.amountTry)}`;
  if (input.result === "PASS") {
    return `${input.identity} ${price}. ${formatTryConsumer(input.ceilingTry)} tavanın içinde.`;
  }
  return [
    `${input.identity} ${price}.`,
    `${formatTryConsumer(input.ceilingTry)} tavanın üzerinde; bu bütçeyle uymuyor.`,
    input.caveat,
    "Koltuk şartı değişirse başka sıfır seçeneklere bakabiliriz.",
  ].filter(Boolean).join(" ");
}
