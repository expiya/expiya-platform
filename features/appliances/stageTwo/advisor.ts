import type { AdvisorReadProjection } from "./contracts";

export interface AppliancesAdvisorAnswer { readonly status: "ANSWERED" | "REFUSED" | "UNKNOWN"; readonly message: string }
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR");
const manualQuestion = /kılavuz|kurulum|montaj|bağlantı|bakım|temiz|güven|tehlike|uyarı|kullanım|nasıl kullan/u;

/** Pure read-only advisor: it can quote only fields already present in the read projection. */
export function answerAppliancesAdvisor(projection: AdvisorReadProjection, question: string): AppliancesAdvisorAnswer {
  const q = normalize(question);
  if (/başka|değiştir|yeniden (seç|öner|çalıştır)|daha iyi ürün|ürün ekle|alternatif bul/u.test(q)) return { status: "REFUSED", message: "Bu aşamada karar bağlamını değiştiremem, seçimi yeniden çalıştıramam veya yeni ürün ekleyemem. AŞAMA 1 karar görüşmesine dönebilirsin." };
  if (/karşılaştır|farkı|hangisi/u.test(q) && projection.comparison.access !== "ENTITLED") return { status: "REFUSED", message: "Karşılaştırma kanıtı bu oturumda açık değil. Yalnız onayladığın ürün hakkında yanıt verebilirim." };
  const visible = projection.comparison.access === "ENTITLED" ? projection.comparison.products : [projection.selected];
  const product = visible.find(item => q.includes(normalize(item.brand)) || q.includes(normalize(item.model))) ?? projection.selected;
  if (manualQuestion.test(q)) {
    const entry = projection.manualKnowledge.entries.find(item => q.includes(normalize(item.topic).split(/\s+/u)[0] ?? "")) ?? projection.manualKnowledge.entries[0];
    if (!entry) return { status: "UNKNOWN", message: "Bu ürün için doğrulanmış kullanım kılavuzu açıklaması henüz bulunmuyor. Ürünü göstermeye devam edebilirim; eksik kılavuz bilgisini tahminle tamamlamam." };
    return { status: "ANSWERED", message: `${entry.topic}: ${entry.statement} Kaynak: ${entry.sourceLabel}, sayfa ${entry.pageNumber}${entry.sectionLabel ? `, ${entry.sectionLabel} bölümü` : ""}.` };
  }
  const fact = product.facts.find(item => q.includes(normalize(item.label)) || normalize(item.label).split(/\s+/u).some(term => term.length > 3 && q.includes(term.slice(0, Math.max(5, term.length - 2)))));
  if (fact) return { status: "ANSWERED", message: `${product.brand} ${product.model} için doğrulanmış kayıt: ${fact.label} ${fact.value}. ${fact.dailyMeaning ?? "Bu teknik bilgi belirli bir kullanım sonucu garantisi değildir."} Kaynak: ${fact.sourceLabel}${fact.observedAt ? `, ${fact.observedAt}` : ""}.` };
  if (/fiyat|kaç para/u.test(q)) return { status: product.price.display === "Bilinmiyor" ? "UNKNOWN" : "ANSWERED", message: `${product.brand} ${product.model} için fiyat durumu: ${product.price.display}. ${product.price.note}` };
  return { status: "UNKNOWN", message: "Bu sorunun yanıtı onaylı ürün kanıtında bulunmuyor. Bilinmeyen bilgiyi tamamlamıyor veya satış verisinden teknik gerçek çıkarmıyorum." };
}
