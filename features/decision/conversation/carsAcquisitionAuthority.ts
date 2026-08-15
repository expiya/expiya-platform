import type {
  CarsAcquisitionMarket,
  CarsAffordabilityState,
  CarsConversationTrace,
  CarsOfferPurpose,
  CarsRecommendationLevel,
  CarsRequirementKey,
} from "@/types/carsConversation";

import { latestRequirement } from "./carsRequirementLedger";

const NAMED_MODEL = /\b(clio|corolla|civic|focus|golf|polo|megane|fluence|passat|octavia|ioniq|tucson|captur|ranger|hilux|yaris|fiesta)\b/iu;

const NEW_OR_USED = /(?:ikinci el(?:\s+de)?\s+olabilir|sıfır şart değil|ikisine de açığım|galeriden de olabilir|aslında ikinci el de düşünebilirim)/iu;
const NEW_ONLY = /(?:ikinci el istemiyorum|yalnız sıfır|sıfır araç (?:bakıyorum|istiyorum)|sıfır istiyorum)/iu;
const USED_ONLY = /(?:sıfıra gerek yok|ikinci el bakıyorum|(?:^|[,.]\s*)temiz ikinci el olur)/iu;
const AFFORDABILITY_MATERIAL = /(?:bütçeye uyar|bütçeme uyar|alabilir miyim|satın al(?:abilir miyim|ırım)?|bu fiyata|fiyatına alır|ödeyebilir|karşıl(?:ar|ıyor) mu\s+bütçe|2 milyona (?:alır|bulunur)|ilan bul|nereden (?:al|bul))/iu;
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

export function resolveAcquisitionMarket(memory: CarsConversationTrace): CarsAcquisitionMarket {
  const stored = memory.acquisitionMarket;
  if (stored && stored !== "UNRESOLVED") return stored;
  const entry = latestRequirement(memory, "ACQUISITION_MARKET");
  if (typeof entry?.value === "string" && (
    entry.value === "NEW_ONLY" || entry.value === "USED_ONLY" || entry.value === "NEW_OR_USED"
  )) return entry.value;
  return "UNRESOLVED";
}

export function deriveAffordabilityState(input: {
  readonly memory: CarsConversationTrace;
  readonly latestUser: string;
}): CarsAffordabilityState {
  const budget = latestRequirement(input.memory, "BUDGET_MAX_TRY");
  if (!budget) return "AFFORDABILITY_NOT_REQUESTED";
  if (!isAffordabilityMaterial(input.latestUser)) return "AFFORDABILITY_NOT_REQUESTED";
  if (resolveAcquisitionMarket(input.memory) === "UNRESOLVED") return "AFFORDABILITY_MARKET_UNRESOLVED";
  return "AFFORDABILITY_EVALUATION_UNAVAILABLE";
}

export function deriveRecommendationLevel(input: {
  readonly memory: CarsConversationTrace;
  readonly listingClaim?: boolean;
}): CarsRecommendationLevel {
  if (input.listingClaim) return "LISTING_ANALYSIS_ONLY";
  const market = resolveAcquisitionMarket(input.memory);
  if (market === "USED_ONLY" || market === "NEW_OR_USED") return "USED_MODEL_GUIDANCE";
  return "MODEL_FIT_GUIDANCE";
}

export function stampAcquisitionAuthority(
  memory: CarsConversationTrace,
  extras: {
    readonly latestUser?: string;
    readonly listingClaim?: boolean;
    readonly offerPurpose?: CarsOfferPurpose;
  } = {},
): CarsConversationTrace {
  const acquisitionMarket = resolveAcquisitionMarket(memory);
  const affordabilityState = extras.latestUser
    ? deriveAffordabilityState({ memory, latestUser: extras.latestUser })
    : memory.affordabilityState ?? "AFFORDABILITY_NOT_REQUESTED";
  return {
    ...memory,
    acquisitionMarket,
    affordabilityState,
    recommendationLevel: deriveRecommendationLevel({ memory, listingClaim: extras.listingClaim }),
    offerPurpose: extras.offerPurpose ?? memory.offerPurpose,
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

export function marketClarificationMessage(addressForm?: "SEN" | "SIZ"): string {
  return addressForm === "SIZ"
    ? "Sıfır mı düşünüyorsunuz, temiz ikinci el de olur mu?"
    : "Sıfır mı düşünüyorsun, temiz ikinci el de olur mu?";
}

export function listingClaimMessage(addressForm?: "SEN" | "SIZ"): string {
  const you = addressForm === "SIZ" ? "paylaşırınız" : "paylaşırsan";
  return `Galeride gördüğün fiyatı yeni liste fiyatıyla eleyip geçmiyorum; bütçenin altında olması da tek başına yeterli değil. İlanın bağlantısını ${you} kimlik, yıl, kilometre, durum ve satıcı tarafını birlikte bakabiliriz. Şimdilik al demiyorum.`;
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

export function modelFitRevealNote(memory: CarsConversationTrace): string {
  if (hardBudgetPresent(memory)) {
    return "Bu bir satış ilanı değil; fiyat tavanını bu öneriyle henüz kıyaslamadım.";
  }
  return "Bu bir satış ilanı değil; koltuk ve bagaj ihtiyacına teknik olarak uyan model.";
}
