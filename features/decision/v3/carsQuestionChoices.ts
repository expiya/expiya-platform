import type { XpyChoiceSet, XpyChoiceSubmission } from "@/features/xpy/contracts";
import { defineXpyQuestionPack, validateChoiceSubmission } from "@/features/xpy/questionGuidance";
import { EQUIPMENT_FEATURE_DEFINITIONS } from "@/features/vehicle-data/equipmentEvidencePolicy";

const single = (questionKey: string, options: XpyChoiceSet["options"], prompt?: string): XpyChoiceSet => ({ questionKey, selectionMode: "SINGLE", source: "DOMAIN_PACK", ...(prompt ? { prompt } : {}), options });
const multiple = (questionKey: string, options: XpyChoiceSet["options"], prompt?: string): XpyChoiceSet => ({ questionKey, selectionMode: "MULTIPLE", source: "DOMAIN_PACK", ...(prompt ? { prompt } : {}), options });

const pack = defineXpyQuestionPack({ packId: "cars-stage1-question-pack/v3.8", questions: {
  primaryUsage: single("primaryUsage", [
    { value: "Şehir içinde günlük kullanım", label: "Şehir içi günlük", description: "İşe gidiş, alışveriş ve kısa mesafeler." },
    { value: "Aile kullanımı", label: "Aile kullanımı", description: "Çocuklar ve aile yolculukları." },
    { value: "Uzun yol ve şehirler arası seyahat", label: "Uzun yol", description: "Otoyol ve şehirler arası kullanım." },
    { value: "İşim için yük taşıma ve teslimat", label: "Yük taşıma", description: "Ürün, koli veya iş malzemesi taşıma." },
    { value: "Müşteri ziyaretleri ve iş seyahati", label: "İş ziyaretleri", description: "Şirket, saha ve müşteri ziyaretleri." },
    { value: "Kamp, bozuk yol ve karma kullanım", label: "Karma yol", description: "Günlük yol ile kamp veya bozuk yolu birlikte kullanma." },
  ], "Aracı en çok hangi günlük ihtiyaç için kullanacaksın?"),
  fuelType: multiple("fuelType", [
    { value: "Benzinli", label: "Benzinli", description: "Şarj gerektirmeyen kullanım." }, { value: "Dizel", label: "Dizel", description: "Düzenli yüksek kilometreyi değerlendirmek için." },
    { value: "Hibrit", label: "Hibrit", description: "Şehir içi dur-kalkta elektrik desteğini değerlendirmek için." }, { value: "Elektrikli", label: "Elektrikli", description: "Düzenli şarj imkânıyla değerlendirmek için." },
    { value: "Yakıt türünü birlikte değerlendirelim", label: "Birlikte değerlendirelim", description: "Yakıt türünü günlük kullanıma göre belirle.", exclusive: true },
  ], "Günlük kullanımına uygun yakıt seçeneklerini seçebilirsin."),
  bodyStyle: multiple("bodyStyle", [
    { value: "Kompakt hatchback", label: "Kompakt ve kolay park", description: "Dar alanda manevra ve park ihtiyacı." },
    { value: "Ferah ve yüksek SUV", label: "Ferah ve yüksek yapı", description: "İnip binme ve kabin ferahlığı ihtiyacı." },
    { value: "Her ikisi de olabilir", label: "Her ikisi de olabilir", description: "Gövde yerine diğer ihtiyaçlara öncelik ver.", exclusive: true },
  ], "Günlük kullanımına uygun araç yapısını seçebilirsin."),
  mixedRoadBody: multiple("mixedRoadBody", [{ value: "SUV", label: "SUV", description: "Kapalı bagaj ve yolcu kullanımı." }, { value: "Pick-up", label: "Pick-up", description: "Açık kasa ve hacimli yük kullanımı." }]),
  commercialConfiguration: multiple("commercialConfiguration", [{ value: "Kapalı yük alanlı panelvan", label: "Panelvan", description: "Korunan kapalı yük alanı." }, { value: "Açık kasalı pick-up", label: "Pick-up", description: "Açık kasada hacimli yük." }, { value: "Yolcu ve yükü birlikte taşıyan yapı", label: "Yolcu + yük", description: "Ekip ve malzemeyi birlikte taşıma." }]),
  recommendationStart: single("recommendationStart", [{ value: "Tamam, bana en uygun aracı seç", label: "Seçime geç", description: "Kabul edilen ihtiyaçlarla seçimi başlat." }, { value: "Bir soru daha sor", label: "Bir ihtiyacı daha konuş", description: "Karardan önce bir maddi ayrımı daha ele al.", exclusive: true }]),
  offerConsent: single("offerConsent", [{ value: "Evet, seçimi göster", label: "Seçimi göster", description: "Hazırlanan araç seçimini aç." }, { value: "Şimdilik gösterme, sohbete devam", label: "Sohbete devam", description: "Araç kartını açmadan konuşmayı sürdür.", exclusive: true }]),
  purchaseInterest: single("purchaseInterest", [{ value: "Kendi kullanımım için araç seçmeyi düşünüyorum", label: "Araç seçmek istiyorum", description: "Satın alma seçimine geç." }, { value: "Şimdilik sadece merak ediyorum", label: "Yalnızca bilgi", description: "Bilgi sorusunu tercih olarak kaydetme.", exclusive: true }]),
  catalogBrandRelaxation: single("catalogBrandRelaxation", [{ value: "Evet, yakıt tercihini koruyup markayı esnetelim", label: "Markayı esnet", description: "Motor türünü koruyup başka markalara bak." }, { value: "Hayır, marka tercihim kalsın", label: "Markayı koru", description: "Mevcut marka tercihini koru.", exclusive: true }]),
  brandModel: single("brandModel", [{ value: "Marka veya model tercihim yok, sen seç", label: "Marka tercihim yok", description: "Marka yönlendirmesi olmadan ilerle.", exclusive: true }]),
} });

const equipment = new Map<string, (typeof EQUIPMENT_FEATURE_DEFINITIONS)[number]>(EQUIPMENT_FEATURE_DEFINITIONS.map(definition => [definition.featureCode, definition]));
const dailyUse: Readonly<Record<string, string>> = { PARKING: "Park ve manevra ihtiyacı.", ADAS: "Yoğun trafik ve uzun yol desteği.", OCCUPANT_SAFETY: "Yolcu güvenliği ihtiyacı.", CABIN_COMFORT: "Kabin rahatlığı ihtiyacı.", ACCESS: "Günlük erişim kolaylığı.", CONNECTIVITY: "Telefon ve navigasyon kullanımı.", LIGHTING: "Gece görüş rahatlığı.", OFF_ROAD: "Bozuk veya düşük tutunmalı yol ihtiyacı." };

export function carsQuestionChoices(questionKey?: string): XpyChoiceSet | undefined {
  if (!questionKey) return undefined;
  if (pack.questions[questionKey]) return pack.questions[questionKey];
  if (questionKey.startsWith("verifiedEquipment:")) {
    const options = questionKey.slice("verifiedEquipment:".length).split("|").flatMap(code => { const definition = equipment.get(code); return definition ? [{ value: definition.labelTr.toLocaleLowerCase("tr-TR"), label: definition.labelTr, description: dailyUse[definition.category] ?? "Günlük kullanım kolaylığı." }] : []; });
    return options.length ? multiple(questionKey, [...options, { value: "Bu seçeneklerden hiçbiri şart değil", label: "Hiçbiri şart değil", description: "Bu donanımları zorunlu tutmadan devam et.", exclusive: true }], "Senin için vazgeçilmez olan donanımları seçebilirsin.") : undefined;
  }
  if (questionKey.startsWith("confirm:")) return single(questionKey, [{ value: "Evet, bunu öncelik yapalım", label: "Evet", description: "Bu ihtiyacı güçlü tercih olarak kullan." }, { value: "Hayır, bunu öncelik yapmayalım", label: "Hayır", description: "Bu çıkarımı reddet.", exclusive: true }], "Bu önceliği araç seçiminde kullanalım mı?");
  if (questionKey.startsWith("constraintRelaxation:")) {
    const definitions = { budgetMax: { value: "Bütçeyi karardan çıkar, ihtiyaç odaklı devam", label: "Bütçe sınırını kaldır", description: "Fiyat üst sınırı olmadan yeniden değerlendir." }, bodyStyle: { value: "Gövde tipi fark etmez, bu tercihi esnetelim", label: "Gövde tipini esnet", description: "Gövde ayrımını zorunlu tutma." }, fuelType: { value: "Yakıt türü fark etmez, bu tercihi esnetelim", label: "Yakıt türünü esnet", description: "Yakıt türünü zorunlu tutma." }, transmission: { value: "Vites türü fark etmez, bu tercihi esnetelim", label: "Vites tercihini esnet", description: "Vites türünü zorunlu tutma." } } as const;
    const options = questionKey.slice("constraintRelaxation:".length).split("|").flatMap(concept => concept in definitions ? [definitions[concept as keyof typeof definitions]] : []);
    return options.length ? single(questionKey, options, "Seçenekleri yeniden genişletmek için hangi tercihi esnetelim?") : undefined;
  }
}

export function validateCarsChoice(pendingQuestionKey: string | undefined, submission: XpyChoiceSubmission): boolean {
  const choices = carsQuestionChoices(pendingQuestionKey);
  return choices ? validateChoiceSubmission({ packId: pack.packId, questions: { [choices.questionKey]: choices } }, pendingQuestionKey, submission) : false;
}
