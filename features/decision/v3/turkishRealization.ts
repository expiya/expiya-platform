import { latestActiveLedgerEvent } from "./ledger";
import type { V3ConversationState } from "./types";

export function isTurkishPublicCopy(text: string) {
  return !/\b(?:the|and|your|you|car|vehicle|budget|recommendation|candidate|option|engine|filter|ranking)\b/iu.test(text);
}

export function dailyUsageContext(state: V3ConversationState) {
  const usage = latestActiveLedgerEvent(state.ledger, "primaryUsage"); const source = usage?.sourceSpan.text ?? "";
  const recent = usage ? state.revision - usage.sourceTurn <= 1 : false;
  const recalled = (detail: string) => recent ? `Senin de söylediğin gibi, ${detail}` : `Daha önce sözünü ettiğin ${detail}`;
  if (/okul/iu.test(source)) return recalled("okul yolculuklarını düşünerek");
  if (/işe|işe gidip/iu.test(source)) return recalled("işe gidiş gelişleri düşünerek");
  if (/yetişkin çocuk/iu.test(source)) return recalled("yetişkin çocuklarınla yapacağın yolculukları düşünerek");
  if (/bebek|çocuk/iu.test(source)) return recalled("çocuklu aile yolculuklarını düşünerek");
  if (/bozuk yol|köy|arazi|stabilize/iu.test(source)) return recalled("bozuk veya değişken zemin kullanımını düşünerek");
  if (/kamp/iu.test(source)) return recalled("kamp yolculuklarını ve taşıyacağın ekipmanları düşünerek");
  if (/uzun yol|şehirler arası/iu.test(source)) return recalled("uzun yol kullanımını düşünerek");
  switch (usage?.normalizedValue) {
    case "URBAN_DAILY": return "Şehir içindeki günlük kullanımını, örneğin park ve dur-kalk kolaylığını düşünerek";
    case "FAMILY": return "Ailece yapılan günlük yolculukları ve inip binme kolaylığını düşünerek";
    case "MIXED_ROAD": return "Günlük yolculuklarla bozuk zeminli yollar arasındaki dengeyi düşünerek";
    case "LONG_DISTANCE": return "Uzun yolculuklarda rahat ve yorucu olmayan bir kullanımı düşünerek";
    case "COMMERCIAL": return "Günlük iş akışında yükleme ve sık duraklamaları düşünerek";
    case "CORPORATE_TRAVEL": return "Satış ekibinin şehir içi ve şehir dışı müşteri ziyaretlerini düşünerek";
    case "PASSENGER_TRANSPORT": return "Yolcuların rahatça inip binmesini ve birlikte seyahat etmesini düşünerek";
    default: return "Günlük kullanımda; örneğin işe gidiş, aile yolculuğu veya kısa şehir işleri gibi ihtiyaçları düşünerek";
  }
}

export function conversationalAcknowledgement(state: V3ConversationState) {
  const variants = ["Anlıyorum.", "Ne demek istediğini anlıyorum.", "Bu önceliğini anlıyorum.", "Söylediğin noktayı anlıyorum."] as const;
  return variants[state.revision % variants.length];
}

export function contextualQuestion(state: V3ConversationState, key: string, question: string) {
  if (key === "primaryUsage") return "Aracı daha çok nerede ve ne için kullanacaksın; örneğin işe gidiş, aile yolculuğu, uzun yol ya da yük taşıma mı?";
  const usage = latestActiveLedgerEvent(state.ledger, "primaryUsage");
  return usage?.sourceTurn === state.revision ? `${dailyUsageContext(state)} sorayım: ${question}` : question;
}
