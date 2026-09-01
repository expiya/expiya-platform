import { usedCarsProductDecisions, type ProductDecision } from "./productDecisions";
import type { DecisionImpact } from "./decisionChangeControl";

export interface ProductDecisionWorkshopItem {
  readonly decisionId: string;
  readonly recommendedValue: string;
  readonly alternativeValues: readonly string[];
  readonly recommendationRationale: string;
  readonly impacts: readonly DecisionImpact[];
  readonly requiredApproverRole: ProductDecision["ownerRole"];
  readonly independentReviewRequired: boolean;
  readonly rollbackOrReviewTrigger: string;
  readonly approvalStatus: "AWAITING_OWNER_DECISION";
  readonly productionEffectAuthorized: false;
}

const details: Readonly<Record<string, Omit<ProductDecisionWorkshopItem, "decisionId" | "recommendedValue" | "requiredApproverRole" | "independentReviewRequired" | "approvalStatus" | "productionEffectAuthorized">>> = Object.freeze({
  "UC-PD-001": { alternativeValues: ["İki şehirde tek kontrollü bölge", "Pilot coğrafyasını ertele"], recommendationRationale: "Operasyon ve moderasyon değişkenlerini ilk dalgada sınırlar.", impacts: ["B2C", "PARTNER", "OPS"], rollbackOrReviewTrigger: "Kohort stoğu 250 altına iner veya SLA iki ölçüm döneminde ihlal edilir." },
  "UC-PD-002": { alternativeValues: ["Binek ve hafif ticari birlikte", "Yalnız tek gövde tipi"], recommendationRationale: "Taxonomy ve kanıt kalitesi ölçülürken kapsam patlamasını önler.", impacts: ["B2C", "DATA", "OPS"], rollbackOrReviewTrigger: "Taxonomy eşleşmesi yüzde 90 altına iner veya duplicate oranı eşiği aşar." },
  "UC-PD-003": { alternativeValues: ["Baştan zorunlu B2C hesabı", "Tamamen anonim ve leadsiz deneyim"], recommendationRationale: "Keşif sürtünmesini azaltır; iletişim öncesi doğrulama ve rızayı korur.", impacts: ["B2C", "LEGAL", "DATA", "SECURITY"], rollbackOrReviewTrigger: "Rıza, doğrulama veya abuse ölçümleri kabul sınırını aşar." },
  "UC-PD-004": { alternativeValues: ["Pilot başında ücretli üyelik", "Süresiz ücretsiz üyelik"], recommendationRationale: "Fiyat etkisinden önce operasyon ve lead değerini ölçer.", impacts: ["PARTNER", "COMMERCIAL", "LEGAL"], rollbackOrReviewTrigger: "Erken erişim bitişinde ölçüm ve sözleşme review'u." },
  "UC-PD-005": { alternativeValues: ["Tek ekspertiz sağlayıcı entegrasyonu", "Ekspertiz yönlendirmesi de sunmama"], recommendationRationale: "Doğrulama iddiası üretmeden güvenli sonraki adım sağlar.", impacts: ["B2C", "OPS", "LEGAL"], rollbackOrReviewTrigger: "Yönlendirme kullanıcıda garanti algısı yaratır veya şikâyet eşiği aşılır." },
  "UC-PD-006": { alternativeValues: ["Dar uzman klasik pilotu", "Klasikleri normal eski araç gibi dahil et"], recommendationRationale: "Klasik iddialar için gereken uzmanlık ve kanıt modelini normal stoktan ayırır.", impacts: ["B2C", "DATA", "OPS", "LEGAL"], rollbackOrReviewTrigger: "Uzman paneli, kaynak lisansı ve klasik eval paketi tamamlanır." },
  "UC-PD-007": { alternativeValues: ["Ayrı repository ve deployment", "B2C ile aynı uygulama ve auth audience"], recommendationRationale: "Kod paylaşımını korurken tenant ve auth blast radius'unu ayırır.", impacts: ["PARTNER", "SECURITY", "DATA"], rollbackOrReviewTrigger: "Bağımsız threat model veya deployment sınırı testi başarısız olur." },
  "UC-PD-008": { alternativeValues: ["Yalnız firma yöneticisi lead alır", "Merkezi Expiya çağrı ekibi lead alır"], recommendationRationale: "Talebi stoktan sorumlu doğrulanmış şubeye en az yetkiyle yönlendirir.", impacts: ["PARTNER", "OPS", "LEGAL", "DATA"], rollbackOrReviewTrigger: "Yanıt SLA'sı veya yetkisiz erişim olayı kabul sınırını aşar." },
  "UC-PD-009": { alternativeValues: ["Üçüncü taraf lisanslı fiyat serisi", "Satıcı beyanı fiyat değişim geçmişi"], recommendationRationale: "Kaynaksız piyasa değeri veya yanıltıcı fiyat geçmişi üretmez.", impacts: ["B2C", "DATA", "LEGAL", "COMMERCIAL"], rollbackOrReviewTrigger: "Lisans, provenance, metodoloji ve hukuk onayı tamamlanır." },
  "UC-PD-010": { alternativeValues: ["Pilotta ayrı sponsorlu vitrin", "Sponsorluğu tamamen kaldır"], recommendationRationale: "Organik matching tarafsızlığını pilot ölçümlerinden ayırır.", impacts: ["B2C", "COMMERCIAL", "LEGAL"], rollbackOrReviewTrigger: "Ayrı UI, erişilebilirlik review'u ve ranking bağımsızlık audit'i geçer." },
});

export const usedCarsProductDecisionWorkshop: readonly ProductDecisionWorkshopItem[] = Object.freeze(usedCarsProductDecisions.map((decision) => Object.freeze({ decisionId: decision.decisionId, recommendedValue: decision.recommendedDefault, ...details[decision.decisionId], requiredApproverRole: decision.ownerRole, independentReviewRequired: decision.ownerRole === "LEGAL" || decision.ownerRole === "SECURITY", approvalStatus: "AWAITING_OWNER_DECISION" as const, productionEffectAuthorized: false as const })));

export function validateProductDecisionWorkshop(items: readonly ProductDecisionWorkshopItem[]) {
  const decisionIds = usedCarsProductDecisions.map((decision) => decision.decisionId);
  const missing = decisionIds.filter((id) => !items.some((item) => item.decisionId === id));
  const invalid = items.filter((item) => item.alternativeValues.length < 2 || item.alternativeValues.includes(item.recommendedValue) || !item.recommendationRationale || item.impacts.length === 0 || !item.rollbackOrReviewTrigger || item.approvalStatus !== "AWAITING_OWNER_DECISION" || item.productionEffectAuthorized).map((item) => item.decisionId);
  return Object.freeze({ valid: missing.length === 0 && invalid.length === 0 && items.length === decisionIds.length, missing: Object.freeze(missing), invalid: Object.freeze(invalid), decisionsApproved: false as const, productionEffectAuthorized: false as const });
}
