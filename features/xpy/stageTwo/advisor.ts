import type { XpyStageTwoAdvisorAnswer, XpyStageTwoProjection } from "./contracts";

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR");

/** Shared safety boundary only. Category semantics and richer answers remain adapter-owned. */
export function answerBoundedStageTwoQuestion(projection: XpyStageTwoProjection, question: string): XpyStageTwoAdvisorAnswer {
  const query = normalize(question);
  if (/yeniden (seç|öner|başlat)|başka ürün (bul|ekle)|kararımı değiştir|aşama 1.*değiştir/u.test(query)) return { status: "REFUSED", message: "Satış Danışmanı AŞAMA 1 seçimini yeniden açamaz veya yeni ürün seçemez. Karar görüşmesine ayrı olarak dönebilirsin." };
  const entitled = projection.comparison.access === "ENTITLED" ? projection.comparison.products : [projection.selected];
  const mentionsUnentitled = /karşılaştır|rakip|alternatif|hangisi/u.test(query) && projection.comparison.access !== "ENTITLED";
  if (mentionsUnentitled) return { status: "REFUSED", message: "Karşılaştırma erişimi bu karar için satın alınmış ve doğrulanmış değil. Yalnız yetkili ürün hakkında yanıt verebilirim." };
  const product = entitled.find(item => query.includes(normalize(item.title))) ?? projection.selected;
  const fact = product.facts.find(item => query.includes(normalize(item.label)) || query.includes(normalize(item.key)));
  if (fact) return { status: "ANSWERED", message: `${product.title}: ${fact.label} ${fact.value}. ${fact.dailyMeaning ?? fact.limitation ?? "Bu kayıt tek başına belirli bir kullanım sonucu garantisi değildir."}` };
  if (/fiyat|kaç para/u.test(query)) return { status: product.price.state === "UNAVAILABLE" ? "UNKNOWN" : "ANSWERED", message: `${product.title} fiyat durumu: ${product.price.display}. ${product.price.note}` };
  return { status: "UNKNOWN", message: "Bu yanıt yetkili ürün ve kanıt alanlarında bulunmuyor; eksik bilgiyi tahminle tamamlamıyorum." };
}
