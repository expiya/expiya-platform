import type { KnowledgeIntent } from "./schema";

export interface KnowledgeIntentMatch { readonly intent: KnowledgeIntent; readonly confidence: "HIGH" | "MEDIUM" }

/**
 * Knowledge questions may mention the same concepts as a vehicle-selection
 * request. An explicit request to find, choose or recommend a vehicle belongs
 * to the Decision Engine, never to the explanation-only layer.
 */
export function isExplicitVehicleSelectionRequest(text: string): boolean {
  const normalized = text.trim();
  return /\b(?:araç|araba|otomobil|model)\b.{0,80}\b(?:bul(?:alım)?|öner(?:ir misin|in)?|seç(?:elim|mek|meme yardım et)?|arıyorum|istiyorum|almak istiyorum|almam gerekiyor)\b/iu.test(normalized)
    || /(?:aracımı|arabamı|otomobilimi).{0,60}(?:yenilemek|değiştirmek|yenileyeceğim|değiştireceğim)/iu.test(normalized)
    || /\b(?:benim için|bana)\b.{0,80}\b(?:bul|öner|seç)\b/iu.test(normalized);
}

const rules: readonly [KnowledgeIntent, RegExp][] = [
  ["EXPIYA_ORIENTATION", /(?:expiya(?: cars)? (?:nedir|ne (?:yapıyor|işe yarıyor|sunuyor))|bu (?:site|uygulama|hizmet|sohbet|asistan|araç danışmanı) (?:nedir|ne (?:yapıyor|işe yarıyor))|sen ne (?:yapıyorsun|işe yarıyorsun)|siz ne yapıyorsunuz|(?:(?:benim|bizim) için|bana|bize) ne yapabilirsin(?:iz)?|(?:(?:bana|bize) )?nasıl yardımcı ol(?:ursun|abilirsiniz))/iu],
  ["CATALOG_OVERVIEW", /(?:(?:siz|katalog)[a-zçğıöşü]* ne tür araç|hangi (?:araçlar|markalar|modeller) (?:var|bulunuyor)|katalog(?:unuz|da))/iu],
  ["USED_VEHICLE_DUE_DILIGENCE", /(?:ikinci el araç al|2\. el araç al|ekspertiz(?: rapor)?|hasar geçmiş|kilometre geçmiş|servis geçmiş|vin kontrol|şasi numarası kontrol)/iu],
  ["VEHICLE_RECALLS", /(?:geri çağırma|geri çağrıl|recall|servis kampanyası)/iu],
  ["EV_CHARGING_ECOSYSTEM", /(?:ac dc şarj|dc ac şarj|halka açık şarj|şarj istasyon|şarj fiyat|şarj eğrisi|kwh ile kw|evde şarj)/iu],
  ["TIRE_SAFETY", /(?:lastik basın|lastik diş|lastik ebat|yük endeksi|hız endeksi|kış lastiği|yaz lastiği|lastik yaşı)/iu],
  ["CHILD_PASSENGER_SAFETY", /(?:çocuk koltuğu|bebek koltuğu|yükseltici koltuk|isofix|çocuk.*emniyet kemeri)/iu],
  ["POST_CRASH_GUIDANCE", /(?:kaza sonrası|kaza yaptım|kaza tutanağı|maddi hasarlı kaza|mobil kaza tutanağı|hasar ihbarı nasıl)/iu],
  ["SAFETY_RATINGS", /(?:euro ncap|çarpışma testi|güvenlik puanı|güvenlik yıldızı|crash test)/iu],
  ["ENVIRONMENTAL_IMPACT", /(?:yaşam döngüsü emisyon|çevresel etki|karbon ayak izi|kuyudan tekerleğe|well.to.wheel|batarya üretim emisyon)/iu],
  ["ACCESSIBLE_MOBILITY", /(?:erişilebilir araç|engelli sürücü|uyarlanmış araç|el kumandası|tekerlekli sandalye.*araç|araç modifikasyonu)/iu],
  ["INTERNATIONAL_DRIVING", /(?:yurt dışına araçla|yurtdışına araçla|avrupa.*araçla|yeşil kart sigorta|uluslararası sürüş|yurt dışında araç kullan)/iu],
  ["LISTING_AND_PAYMENT_SAFETY", /(?:sahte araç ilan|ilan dolandır|güvenli ödeme|eids|ilan doğrulama|kapora dolandır)/iu],
  ["INSURANCE_AND_CLAIMS", /(?:kasko|trafik sigort|sigorta primi|hasar ihbar|hasar süreci|poliçe)/iu],
  ["MAINTENANCE_AND_PARTS", /(?:periyodik bakım|bakım aralığı|bakım maliyet|yedek parça|servis süresi|servis ağı)/iu],
  ["IMPORT_AND_COMPLIANCE", /(?:araç ithalat|otomobil ithalat|ithalat rejimi|gümrük verg|münferit ithal|uygunluk belgesi)/iu],
  ["OWNERSHIP_VALUE", /(?:fiyat.?performans|değer kaybı|depresiasyon|ikinci el değer|2\. el değer|toplam sahiplik maliyeti|tco)/iu],
  ["FINANCING_AND_CREDIT", /(?:taşıt kredisi|araç kredisi|otomobil kredisi|kredi vadesi|kredi.?değer oranı|peşinat oranı|finansman teklifi|aylık taksit|kredi faizi)/iu],
  ["AUTONOMOUS_DRIVING", /(?:otonom sürüş|otonom araç|sürücüsüz araç|self.?driving|sürüş otomasyonu|seviye [0-5]|level [0-5])/iu],
  ["EV_RANGE_AND_CHARGING", /(?:menzil çeşit|menzili etkileyen|menzil neden|gerçek menzil|elektrikli araç menzil|şarj hızı|batarya ön koşullandırma)/iu],
  ["EXPERT_PERSPECTIVES", /(?:uzman görüş|uzmanlar(?:.{0,80})?ne diyor|sektör uzman|kurumsal görüş)/iu],
  ["SAFE_AND_ADVANCED_DRIVING", /(?:güvenli sürüş|ileri sürüş|defansif sürüş|savunmacı sürüş|takip mesafesi|doğru frenleme|viraj tekniği|kaygan yol(?:da)? sürüş|tehlike algılama)/iu],
  ["INCENTIVES", /(?:teşvik|vergi avantaj|engelli araç|ötv istisna|hurda teşvik)/iu],
  ["TAX_AND_REGULATION", /(?:ötv|mtv|motorlu taşıtlar vergisi|vergi oran|kanuni düzenleme|mevzuat|yasal düzenleme)/iu],
  ["ECONOMIC_INDICATORS", /(?:otomobil fiyat endeksi|araç fiyat endeksi|ikinci el fiyat|fiyatlar ne kadar arttı|otomobil enflasyonu|ekonomik veri)/iu],
  ["MARKET_STATISTICS", /(?:en çok (?:hangi|tercih|sat)|kaç (?:adet|otomobil|araç)|pazar(?:ı|da)|satış(?:ı|ları)|tescil|renkler)/iu],
  ["AUTOMOTIVE_HISTORY", /(?:otomobil(?:in)? tarih|araba(?:nın)? tarih|ilk otomobil|carl benz|bertha benz)/iu],
  ["FORECAST_DISCUSSION", /(?:gelece(?:k|ği)|öngörü|tahmin|senaryo|ne olacak|nasıl görünüyor)/iu],
  ["AUTOMOTIVE_EDUCATION", /(?:(?:nedir|ne demek|farkı (?:nedir|ne)|neden popüler|nasıl çalışır|anlatır mısın)|(?:gövde|yakıt|enerji) türleri?)/iu],
];

export function routeAutomotiveKnowledgeIntent(text: string): KnowledgeIntentMatch | undefined {
  const normalized = text.trim();
  if (isExplicitVehicleSelectionRequest(normalized)) return undefined;
  for (const [intent, pattern] of rules) if (pattern.test(normalized)) return { intent, confidence: "HIGH" };
  return undefined;
}
