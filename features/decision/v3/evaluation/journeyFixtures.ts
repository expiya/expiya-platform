import type { PurchaseIntentState } from "../types";

export interface V3JourneyExpectation {
  readonly finalPurchaseIntent?: PurchaseIntentState;
  readonly finalActivePreferences?: Readonly<Record<string, string | number>>;
  readonly absentActiveConcepts?: readonly string[];
  readonly finalLedgerLength?: number;
  readonly minimumLedgerEvents?: Readonly<Record<string, number>>;
  readonly recommendationCount?: number;
  readonly maximumRecommendationCount?: number;
  readonly offerMustBeObserved?: boolean;
  readonly conversationMustEnd?: boolean;
  readonly finalLastQuestionKey?: string | null;
  readonly finalMessagePattern?: RegExp;
  readonly finalLedgerEvent?: Readonly<{ concept: string; normalizedValue?: string | number; decisionUse?: string; strength?: string; authority?: string }>;
  readonly recommendationWarningPattern?: RegExp;
}

export interface V3JourneyFixture {
  readonly id: string;
  readonly description: string;
  readonly messages: readonly string[];
  readonly expectation: V3JourneyExpectation;
}

export const V3_SMOKE_JOURNEYS: readonly V3JourneyFixture[] = [
  {
    id: "purchase-city-discovery",
    description: "Satın alma niyeti ve şehir içi kullanım bilgisini korur",
    messages: ["Yeni bir araç almak istiyorum.", "Şehir içinde işe gidip gelmek için kullanacağım."],
    expectation: { finalPurchaseIntent: "ACTIVE_DISCOVERY", finalActivePreferences: { primaryUsage: "URBAN_DAILY" } },
  },
  {
    id: "neutral-conversation",
    description: "Sosyal ve konu dışı mesajları karar kaydına dönüştürmez",
    messages: ["Merhaba", "Yarın okulda sınav var.", "Dün akşamki maçı izledin mi?"],
    expectation: { finalLedgerLength: 0 },
  },
  {
    id: "automotive-information",
    description: "Genel otomotiv sorusunu satın alma tercihi saymaz",
    messages: ["Önden çekiş ile arkadan itiş arasındaki fark nedir?", "Teşekkür ederim, bilgi yeterli."],
    expectation: { finalPurchaseIntent: "NOT_EXPRESSED", finalLedgerLength: 0 },
  },
  {
    id: "electric-preference",
    description: "Elektrikli araç tercihini güçlü karar girdisi olarak saklar",
    messages: ["Araç almak istiyorum.", "Elektrikli olsun."],
    expectation: { finalPurchaseIntent: "ACTIVE_DISCOVERY", finalActivePreferences: { fuelType: "BEV" } },
  },
  {
    id: "body-style-correction",
    description: "SUV tercihini hatchback düzeltmesiyle günceller",
    messages: ["Araç almak istiyorum.", "SUV olsun.", "Vazgeçtim, hatchback de olabilir."],
    expectation: { finalActivePreferences: { bodyStyle: "HATCHBACK" }, minimumLedgerEvents: { bodyStyle: 2 } },
  },
  {
    id: "budget-correction-clear",
    description: "Bütçeyi append-only biçimde ekler, düzeltir ve kaldırır",
    messages: ["Araç almak istiyorum.", "Bütçem maksimum 2 milyon.", "Düzeltme: bütçem maksimum 3 milyon.", "Bütçeyi kaldır."],
    expectation: { absentActiveConcepts: ["budgetMax"], minimumLedgerEvents: { budgetMax: 3 } },
  },
  {
    id: "weak-signal-confirmation",
    description: "Kamp ve bozuk yol sinyalini onaydan sonra güçlü tercihe dönüştürür",
    messages: ["Araç almak istiyorum.", "Dört kişilik aileyiz, kamp yapıyoruz, bozuk yola gidiyoruz.", "Evet, değerlendirelim."],
    expectation: { finalActivePreferences: { mixedRoadUse: "SUV" }, minimumLedgerEvents: { mixedRoadUse: 2 } },
  },
  {
    id: "single-recommendation-consent",
    description: "Açık onaydan önce kart göstermez ve sonra tek araç verir",
    messages: ["Yeni araç almak istiyorum", "Şehir içinde günlük kullanacağım", "Parkı kolay kompakt bir yapı olsun", "Kesin bütçem 3 milyon TL", "Elektrikli olsun", "Geri görüş kamerası kesin olsun", "Tek araç öner", "Evet, göster"],
    expectation: { recommendationCount: 1, offerMustBeObserved: true },
  },
  {
    id: "alternative-recommendations-consent",
    description: "Açık onaydan sonra en fazla üç alternatif verir",
    messages: ["Yeni araç almak istiyorum", "Aile kullanımı için", "Daha ferah ve yüksek olsun", "Bütçe sorun değil", "Benzinli olsun", "Geri görüş kamerası kesin olsun", "Toyota olabilir", "Alternatif göster", "Evet, göster"],
    expectation: { maximumRecommendationCount: 3, offerMustBeObserved: true },
  },
  {
    id: "non-intent-termination",
    description: "Tekrarlanan niyetsiz konuşmayı doğal biçimde sonlandırır",
    messages: ["Merhaba", "Yarın sınav var", "Maç nasıldı?", "Hava sıcak", "Teşekkürler, bu kadar"],
    expectation: { finalPurchaseIntent: "ENDED_WITHOUT_INTENT", finalLedgerLength: 0, conversationMustEnd: true },
  },
  {
    id: "approximate-budget-soft-rank",
    description: "Yaklaşık bütçeyi soft-rank, kesin üst sınırı hard-filter olarak saklar",
    messages: ["Şehir içinde kullanmak için SUV araç almak istiyorum.", "Yaklaşık 2 milyon civarı.", "Kesin üst sınırım 2 milyon 300 bin TL."],
    expectation: { finalActivePreferences: { budgetTarget: 2_000_000, budgetMax: 2_300_000 }, finalLedgerEvent: { concept: "budgetMax", decisionUse: "HARD_FILTER" } },
  },
  {
    id: "uncertain-budget-soft-rank",
    description: "Belirsiz bütçe ifadesini kesin üst sınır gibi kullanmaz",
    messages: ["Şehir içinde kullanmak için SUV araç almak istiyorum.", "Elektrikli olsun.", "2 milyona kadar çıkabiliriz sanırım, çok net değil."],
    expectation: { finalActivePreferences: { budgetTarget: 2_000_000 }, absentActiveConcepts: ["budgetMax"], finalLedgerEvent: { concept: "budgetTarget", decisionUse: "SOFT_RANK" } },
  },
  {
    id: "budget-irrelevant-value-options",
    description: "Bütçe önemsizse marka tercihini bir kez sorup en fazla üç değer seçeneği sunar",
    messages: ["Aile kullanımı için SUV araç almak istiyorum.", "Bütçe sorun değil.", "Benzinli olsun.", "Bu gruptakilerden hiçbiri şart değil.", "Bu gruptakilerden hiçbiri şart değil.", "Bu gruptakilerden hiçbiri şart değil.", "Fark etmez, sen seç.", "Evet, göster."],
    expectation: { offerMustBeObserved: true, maximumRecommendationCount: 3, finalLedgerEvent: { concept: "budgetNotImportant", normalizedValue: "NOT_IMPORTANT", decisionUse: "NONE" } },
  },
  {
    id: "urban-question-order",
    description: "Şehir içi kullanımda önce gövde ihtiyacını netleştirir",
    messages: ["Yeni araç almak istiyorum.", "Şehir içinde günlük kullanacağım."],
    expectation: { finalActivePreferences: { primaryUsage: "URBAN_DAILY" }, finalLastQuestionKey: "bodyStyle", finalMessagePattern: /Park kolaylığı mı|ferah ve yüksek/iu },
  },
  {
    id: "commercial-question-order",
    description: "Yük ve malzeme taşımada yakıt sorusunu önceliklendirir",
    messages: ["Araç almak istiyorum.", "İşim için yük ve malzeme taşıyacağım."],
    expectation: { finalActivePreferences: { primaryUsage: "COMMERCIAL" }, finalLastQuestionKey: "fuelType" },
  },
  {
    id: "rear-camera-hard-filter",
    description: "Açık geri görüş kamerası isteğini hard-filter olarak saklar",
    messages: ["Yeni bir araç almak istiyorum.", "Geri görüş kamerası kesin olsun."],
    expectation: { finalActivePreferences: { equipmentFeature: "REAR_VIEW_CAMERA" }, finalLedgerEvent: { concept: "equipmentFeature", decisionUse: "HARD_FILTER" } },
  },
  {
    id: "diesel-emissions-information",
    description: "Dizel emisyon sorusunu somut yanıtlar ve tercih yaratmaz",
    messages: ["Merhaba.", "Dizel araçlar doğayı diğer tür yakıtlara göre daha fazla mı kirletiyor?"],
    expectation: { finalPurchaseIntent: "NOT_EXPRESSED", finalLedgerLength: 0, finalMessagePattern: /karbondioksit.*azot oksit.*ince partikül/iu },
  },
  {
    id: "hybrid-saving-information",
    description: "Hibrid yazımını tanır ve yakıt tasarrufunu dengeli açıklar",
    messages: ["Selam.", "Hibrid araçların yakıt tasarrufu sağladığı doğru mu?"],
    expectation: { finalPurchaseIntent: "NOT_EXPRESSED", finalLedgerLength: 0, finalMessagePattern: /şehir içindeki dur-kalk.*yakıt tasarrufu.*otoyol.*avantaj.*küçülür/iu },
  },
  {
    id: "sales-reflex-interest-question",
    description: "Bilgi yanıtından sonra baskısız satın alma ilgisi sorar",
    messages: ["Elektrikli araçlar normal araçlara göre daha pahalı sanırım?", "Bilgi için teşekkür ederim."],
    expectation: { finalPurchaseIntent: "NOT_EXPRESSED", finalLedgerLength: 0, finalLastQuestionKey: "purchaseInterest", finalMessagePattern: /yalnızca merak mı.*günlük kullanımın için değerlendirmeye açık mısın/iu },
  },
  {
    id: "sales-reflex-conversion",
    description: "Olumlu ilgi yanıtını doğrudan ihtiyaç keşfine taşır",
    messages: ["Elektrikli araçlar benzinlilere göre daha pahalı mı?", "Bilgi için teşekkürler.", "Evet, kendi kullanımım için değerlendirmeye açığım."],
    expectation: { finalPurchaseIntent: "EXPLICIT", finalLastQuestionKey: "primaryUsage", finalMessagePattern: /nerede ve ne için/iu },
  },
  {
    id: "sales-reflex-decline",
    description: "Sadece merak eden kullanıcıyı karar açısından tarafsız bırakır",
    messages: ["Elektrikli araçlar daha pahalı mı?", "Teşekkür ederim.", "Sadece merak ettim, şimdilik düşünmüyorum."],
    expectation: { finalPurchaseIntent: "NOT_EXPRESSED", finalLedgerLength: 0, finalLastQuestionKey: null },
  },
  {
    id: "composite-toyota-bev",
    description: "Mevcut hibriti hedef BEV tercihine karıştırmadan birleşik mesajı işler",
    messages: ["Merhaba.", "Toyota marka Corolla Hibrit aracımı yine Toyota'nın tam elektrikli bir modeli ile değiştirmek istiyorum. Hangi modeli önerirsin?"],
    expectation: { finalPurchaseIntent: "EXPLICIT", finalActivePreferences: { brandPreference: "Toyota", fuelType: "BEV" }, finalMessagePattern: /aktif katalogda.*varyant bulunmuyor/iu },
  },
  {
    id: "composite-brand-relaxation",
    description: "Katalogda olmayan Toyota BEV birleşimini kullanıcı onayıyla marka açısından esnetir",
    messages: ["Toyota marka Corolla Hibrit aracımı yine Toyota'nın tam elektrikli bir modeli ile değiştirmek istiyorum. Hangi modeli önerirsin?", "Toyota'nın elektrikli modelini satın almak istiyorum.", "Evet seçelim."],
    expectation: { finalActivePreferences: { fuelType: "BEV" }, absentActiveConcepts: ["brandPreference"], finalLastQuestionKey: "primaryUsage" },
  },
  {
    id: "named-model-purchase",
    description: "Araç kelimesi olmadan Corolla satın alma niyetini ve model tercihini tanır",
    messages: ["Merhaba.", "Corolla almak istiyorum."],
    expectation: { finalPurchaseIntent: "EXPLICIT", finalActivePreferences: { modelPreference: "Corolla" }, finalLastQuestionKey: "offerConsent" },
  },
  {
    id: "first-time-driver-context",
    description: "İlk sürücü bağlamını karar tercihi uydurmadan korur",
    messages: ["Sürücü ehliyetimi bugün aldım, heyecanlıyım. İlk aracımı almak için araştırma yapıyorum.", "Şehir içinde günlük kullanacağım."],
    expectation: { finalPurchaseIntent: "ACTIVE_DISCOVERY", finalActivePreferences: { primaryUsage: "URBAN_DAILY" }, finalLedgerEvent: { concept: "firstTimeDriverContext", decisionUse: "NONE" } },
  },
  {
    id: "electric-interest-suffix",
    description: "İlgimi sözcüğündeki eki soru parçacığı sanmadan elektrik tercihini kaydeder",
    messages: ["Araç almak istiyorum.", "Elektrikli modeller daha çok ilgimi çekiyor."],
    expectation: { finalActivePreferences: { fuelType: "BEV" }, finalLedgerEvent: { concept: "fuelType", decisionUse: "HARD_FILTER" } },
  },
  {
    id: "broad-pool-differentiator",
    description: "Kullanıcı donanımın önemli olmadığını söylediyse aynı donanım alanını yeniden sormadan teklif hazırlar",
    messages: ["Şehir içinde kullanmak için SUV araç almak istiyorum.", "Özel park donanımı şart değil.", "Kesin bütçem 2 milyon TL.", "Elektrikli olsun.", "Marka fark etmez.", "Tek araç seçelim."],
    expectation: { finalLastQuestionKey: "offerConsent", finalMessagePattern: /tek seçimi hazırladım.*Göstermemi ister misin/iu, recommendationCount: 0, offerMustBeObserved: true },
  },
  {
    id: "corporate-customer-visits",
    description: "Müşteri ziyaretlerini yük taşımacılığı değil kurumsal yolculuk olarak modeller",
    messages: ["Şirketimin satış departmanı için bir araç almak istiyorum.", "Satış ekibim şehir içi ve şehir dışı müşteri ziyaretleri gerçekleştiriyor."],
    expectation: { finalActivePreferences: { primaryUsage: "CORPORATE_TRAVEL" }, finalLastQuestionKey: "fuelType" },
  },
  {
    id: "corporate-total-cost",
    description: "Kurumsal kullanıcı iki maliyet boyutunu seçtiğinde pending confirmation döngüsünü kapatır",
    messages: ["Şirketimin satış departmanı için bir araç almak istiyorum.", "Satış ekibim müşteri ziyaretleri için şehir içi ve şehir dışı kullanacak.", "Yakıt tasarrufu üst düzey olsun, donanımlar önemli değil.", "Ekonomik bir araç olsun yeterli.", "Her ikisi de."],
    expectation: { finalActivePreferences: { totalCostPriority: "TOTAL_COST" }, finalLastQuestionKey: "brandModel", finalLedgerEvent: { concept: "totalCostPriority", decisionUse: "SOFT_RANK" } },
  },
  {
    id: "unverified-equipment-warning",
    description: "Doğrulanmamış donanımla seçilen kartta zorunlu uyarıyı gösterir",
    messages: ["Aile kullanımı için SUV araç almak istiyorum.", "Anahtarsız çalıştırma kesin olsun.", "Bütçe sorun değil.", "Dizel olsun.", "Alfa Romeo Tonale olabilir.", "Tek araç öner.", "Evet, göster."],
    expectation: { recommendationCount: 1, offerMustBeObserved: true, recommendationWarningPattern: /doğrulanması gerekir/iu },
  },
] as const;

export function getV3SmokeJourney(id: string): V3JourneyFixture {
  const journey = V3_SMOKE_JOURNEYS.find((item) => item.id === id);
  if (!journey) throw new TypeError(`V3_EVAL_UNKNOWN_JOURNEY:${id}`);
  return journey;
}
