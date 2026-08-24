import type { PendingConfirmation, PreferenceEvent, V3ConversationState, V3SemanticContextSignal } from "./types";

const whole = (text: string) => ({ start: 0, end: text.length, text });
const normalizedBody = (text: string): string | readonly string[] | undefined => {
  const explicit = [
    [/panel\s*van|panelvan/iu, "PANEL VAN"], [/(?:minibüs|yolcu van)/iu, "PASSENGER VAN"], [/(?:pick\s*up|kamyonet)/iu, "PICKUP"],
    [/\bmpv\b/iu, "MPV"], [/coupe|coupé/iu, "COUPE"], [/hatchback/iu, "HATCHBACK"], [/sedan/iu, "SEDAN"], [/(?:suv|crossover)/iu, "SUV"],
  ] as const;
  const matches = explicit.filter(([pattern]) => pattern.test(text)).map(([, value]) => value);
  if (matches.length > 1) return matches; if (matches.length === 1) return matches[0];
  return /kompakt|parkı kolay|küçük bir yapı/iu.test(text) ? "HATCHBACK" : /(?:daha yüksek|ferah.{0,20}yüksek)/iu.test(text) ? "SUV" : undefined;
};
const normalizedFuel = (text: string) => /elektrikli/iu.test(text) ? "BEV" : /hibrit|hibrid/iu.test(text) ? "HEV" : /dizel/iu.test(text) ? "DIESEL" : /benzinli/iu.test(text) ? "GASOLINE" : undefined;
const normalizedTransmission = (text: string) => /manuel/iu.test(text) ? "MANUAL" : /otomatik(?!\s*park)|dsg|dct|cvt|e-?dct|tork konvertör/iu.test(text) ? "AUTOMATIC" : undefined;
const normalizedUsage = (text: string) => /(?:aile|çocuk(?!luğum)|bebek|puset|kalabalık sülale)/iu.test(text) ? "FAMILY" : /(?:satış (?:departmanı|ekibi)|müşteri ziyaret|saha ekibi|şirket aracı|filo)/iu.test(text) ? "CORPORATE_TRAVEL" : /(?:\byük(?:\s|$)|yük taşı|kargo|dağıtım|ticari|şantiye|malzeme|dükkan teslimat|kurye|(?:^|\s)iş\s+(?:için|amaçlı)|işimde)/iu.test(text) ? "COMMERCIAL" : /(?:kamp|arazi|bozuk yol|köy|4x4|dört çeker)/iu.test(text) ? "MIXED_ROAD" : /(?:uzun yol|şehirler arası|seyahat|ege turnesi)/iu.test(text) ? "LONG_DISTANCE" : /(?:şehir içi|günlük|işe (?:gidip|gidiş)|iş gidiş|okul|ayağımı yerden|toplu taşıma|otobüsle uğraş)/iu.test(text) ? "URBAN_DAILY" : undefined;
const normalizedEquipment = (text: string) => /360\s*(?:derece)?|çevre görüş/iu.test(text) ? "SURROUND_VIEW_CAMERA_360" : /geri görüş kameras/iu.test(text) ? "REAR_VIEW_CAMERA" : /kendi kendine park|otomatik park|park asistan/iu.test(text) ? "AUTOMATIC_PARK_ASSIST" : /park sensör/iu.test(text) ? "PARKING_SENSORS" : /adaptif hız|adaptive cruise|mesafeyi koruyan.*hız|öndeki araçla mesafe/iu.test(text) ? "ADAPTIVE_CRUISE_CONTROL" : /kör nokta/iu.test(text) ? "BLIND_SPOT_MONITOR" : /isofix|çocuk koltuğu bağlant/iu.test(text) ? "ISOFIX_REAR_OUTER" : /anahtarsız (?:çalıştırma|başlatma)/iu.test(text) ? "KEYLESS_START" : undefined;
const desiredBrand = (text: string) => text.match(/(?:^|\s)([\p{Lu}][\p{L}\d.-]+)\s+marka\b/u)?.[1] ?? text.match(/\byine\s+([\p{Lu}][\p{L}\d.-]+)(?:['’](?:nın|nin|nun|nün))?/u)?.[1] ?? text.match(/^([\p{Lu}][\p{L}\d.-]+)(?:['’](?:nın|nin|nun|nün))\s+/u)?.[1];
const desiredModel = (text: string) => {
  const candidate = text.match(/^([\p{Lu}][\p{L}\d.-]*(?:\s+[\p{Lu}\d][\p{L}\d.-]*){0,2})\s+(?:modelini\s+)?(?:satın\s+)?almak\s+istiyorum[.!]?$/u)?.[1];
  return candidate && !/^(?:araç|araba|otomobil|yeni araç|yeni araba|yeni otomobil)$/iu.test(candidate) ? candidate : undefined;
};
function budgetAmount(text: string, allowBareNumber: boolean) { const normalized = text.replace(/(\d+)\.\s+(\d+)\s*m\b/giu, "$1.$2 milyon"); const first = normalized.match(allowBareNumber ? /(\d{1,3}(?:[.]\d{3})+|\d+(?:[.,]\d+)?)\s*(milyon|bin|m)?(?:\s*(?:tl|₺))?/iu : /(\d{1,3}(?:[.]\d{3})+|\d+(?:[.,]\d+)?)\s*(milyon|bin|m|tl|₺)/iu); if (!first) return undefined; const unit = first[2]?.toLocaleLowerCase("tr"); const token = first[1]!; const raw = Number(/^\d{1,3}(?:\.\d{3})+$/u.test(token) ? token.replace(/\./g, "") : token.replace(",", ".")); let value = unit === "milyon" || unit === "m" ? raw * 1_000_000 : unit === "bin" ? raw * 1_000 : raw; if (unit === "milyon" || unit === "m") { const tail = normalized.slice((first.index ?? 0) + first[0].length).match(/(\d+(?:[.,]\d+)?)\s*bin/iu); if (tail) value += Number(tail[1]!.replace(",", ".")) * 1_000; } return value; }

function event(input: { state: V3ConversationState; messageId: string; text: string; concept: string; field?: string; value: string | number | readonly string[]; weak?: boolean; use?: PreferenceEvent["decisionUse"]; authority?: PreferenceEvent["authority"] }): PreferenceEvent {
  const authority = input.authority ?? "USER_EXPLICIT";
  return { id: `${input.messageId}:${input.concept}:${input.state.ledger.length}`, sourceMessageId: input.messageId, sourceTurn: input.state.revision + 1, sourceSpan: whole(input.text), concept: input.concept, field: input.field, normalizedValue: input.value, strength: input.weak ? "WEAK_SIGNAL" : authority === "USER_CONFIRMED" ? "CONFIRMED_STRONG" : "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: input.weak ? "QUESTION_INPUT" : (input.use ?? "HARD_FILTER"), confidence: input.weak ? 0.72 : 0.96, authority, confirmationRequired: Boolean(input.weak) };
}

function supersedeActive(ledger: readonly PreferenceEvent[], next: PreferenceEvent, sameConcept = next.concept): PreferenceEvent[] {
  const prior = [...ledger].reverse().find((item) => item.concept === sameConcept && item.status === "ACTIVE");
  if (!prior) return [...ledger, next];
  return [...ledger, { ...prior, id: `${next.id}:supersede`, status: "SUPERSEDED", supersedes: prior.id, decisionUse: "NONE", sourceMessageId: next.sourceMessageId, sourceTurn: next.sourceTurn, sourceSpan: next.sourceSpan }, { ...next, supersedes: prior.id }];
}

export function applyPreferenceMessage(state: V3ConversationState, messageId: string, text: string): { ledger: readonly PreferenceEvent[]; pending?: PendingConfirmation } {
  let ledger = [...state.ledger]; let pending = state.pendingConfirmation; let resolvedValueEconomy = false;
  if (state.pendingAction === "RELAX_BRAND_FOR_POWERTRAIN" && /(?:evet|olur|tamam|esnet|başka marka|marka fark etmez|seçelim)/iu.test(text)) {
    const activeBrand = [...ledger].reverse().find((item) => item.concept === "brandPreference" && item.status === "ACTIVE");
    if (activeBrand) ledger.push({ ...activeBrand, id: `${messageId}:clear:brandPreference`, sourceMessageId: messageId, sourceTurn: state.revision + 1, sourceSpan: whole(text), status: "CLEARED", decisionUse: "NONE", supersedes: activeBrand.id });
    return { ledger, pending };
  }
  if (pending && /^(?:evet|olur|uygun|değerlendirelim|tamam)\b/iu.test(text.trim())) {
    const source = ledger.find((item) => item.id === pending!.eventId);
    if (source) ledger = [...ledger, event({ state: { ...state, ledger }, messageId, text, concept: source.concept, field: source.field, value: pending.proposedValue, use: source.field ? "HARD_FILTER" : "SOFT_RANK", authority: "USER_CONFIRMED" })];
    return { ledger, pending: undefined };
  }
  if (pending && /^(?:hayır|istemem|olmasın|gerek yok)/iu.test(text.trim())) {
    const source = ledger.find((item) => item.id === pending!.eventId);
    if (source) ledger = [...ledger, { ...source, id: `${messageId}:reject:${source.concept}`, sourceMessageId: messageId, sourceTurn: state.revision + 1, sourceSpan: whole(text), status: "REJECTED", decisionUse: "NONE", supersedes: source.id }];
    return { ledger, pending: undefined };
  }
  if (pending?.concept === "valueEconomy" && /(?:her ikisi|ikisi ?de|ikiside|toplam maliyet)/iu.test(text)) {
    ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "totalCostPriority", field: "costPriority", value: "TOTAL_COST", use: "SOFT_RANK", authority: "USER_CONFIRMED" }));
    return { ledger, pending: undefined };
  }
  if (pending?.concept === "valueEconomy" && /(?:bilmiyorum|sence|sen söyle|sen seç)/iu.test(text)) {
    ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "totalCostPriority", field: "costPriority", value: "TOTAL_COST", use: "SOFT_RANK", authority: "PRODUCT_POLICY" }));
    return { ledger, pending: undefined };
  }
  if (pending?.concept === "valueEconomy" && /(?:(?:yakıt|kullanım|işletme) gider|az yak|düşük tüketim)/iu.test(text)) {
    ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "operatingCostPriority", field: "costPriority", value: "OPERATING_COST", use: "SOFT_RANK", authority: "USER_CONFIRMED" }));
    pending = undefined; resolvedValueEconomy = true;
  }
  const budgetNotImportant = /(?:bütçe (?:önemli|sorun) değil|bütçe kısıtlamam yok|bütçeyi (?:önemseme|boşver)|fiyat (?:önemli|sorun) değil|net bütçe(?:m| rakamım)? (?:henüz )?yok|bütçe(?:m)? (?:henüz )?net değil)/iu.test(text);
  const clearBudget = /(?:bütçeyi (?:boşver|kaldır)|bütçe önemli değil)/iu.test(text);
  if (clearBudget) {
    for (const concept of ["budgetMax", "budgetTarget"]) { const active = [...ledger].reverse().find((item) => item.concept === concept && item.status === "ACTIVE"); if (active) ledger.push({ ...active, id: `${messageId}:clear:${concept}`, sourceMessageId: messageId, sourceTurn: state.revision + 1, sourceSpan: whole(text), status: "CLEARED", decisionUse: "NONE", supersedes: active.id }); }
  }
  if (budgetNotImportant) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "budgetNotImportant", value: "NOT_IMPORTANT", use: "NONE" }));
  if (/(?:fiyat|bütçe).*(?:rakam|sayı|net (?:bir )?sınır).*(?:veremem|söyleyemem|bilmiyorum)|rakam veremem/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "budgetUnspecified", value: "UNSPECIFIED", use: "NONE" }));
  if ((state.lastQuestionKey === "budget" || state.lastQuestionKey === "exactBudget") && /(?:net (?:bir )?rakam|rakamı|bütçe).*(?:belirlemedim|belli değil|henüz yok)/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "budgetUnspecified", value: "UNSPECIFIED", use: "NONE" }));
  if (state.lastQuestionKey === "exactBudget" && !budgetAmount(text, true) && /(?:öner|seç|göster|paylaş|marka.?model)/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "budgetUnspecified", value: "UNSPECIFIED", use: "NONE", authority: "PRODUCT_POLICY" }));
  const usage = normalizedUsage(text); if (usage && (state.lastQuestionKey === "primaryUsage" || /(?:kullan|ihtiyaç|amaç|iş|ticari|aile|çocuk|bebek|kamp|arazi|4x4|uzun yol|ege turnesi|şehir içi|işe gidip|ayağımı yerden|otobüs|kargo|dağıtım|yük|müşteri ziyaret|sülale)/iu.test(text))) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "primaryUsage", field: "usagePurpose", value: usage }));
  const body = normalizedBody(text);
  const answeredBody = state.lastQuestionKey === "bodyStyle" ? (/park|kompakt|küçük/iu.test(text) ? "HATCHBACK" : /ferah|yüksek|geniş/iu.test(text) ? "SUV" : undefined) : undefined;
  if (body ?? answeredBody) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "bodyStyle", field: "bodyStyle", value: (body ?? answeredBody)! }));
  if ((state.lastQuestionKey === "bodyStyle" || state.askedQuestionKeys.includes("bodyStyle")) && /(?:ekonomik.*yeterli|gövde.*(?:fark etmez|önemli değil)|hangisi olursa)/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "bodyNotImportant", value: "FLEXIBLE", use: "NONE" }));
  if ((state.lastQuestionKey === "bodyStyle" || state.askedQuestionKeys.includes("bodyStyle")) && /(?:(?:[iİ]kisi de|hiçbiri).*(?:önceliğim değil|önemli değil|fark etmez)|(?:gövde|yapı).*(?:önceliğim değil|fark etmez))/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "bodyNotImportant", value: "FLEXIBLE", use: "NONE" }));
  const fuel = normalizedFuel(text);
  if (fuel) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "fuelType", field: "fuelType", value: fuel }));
  const transmission = normalizedTransmission(text);
  if (transmission) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "transmission", field: "transmission", value: transmission }));
  const brand = desiredBrand(text);
  if (brand && /(?:satın al|değiştir|istiyorum|öner|seç)/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "brandPreference", field: "brand", value: brand }));
  const model = desiredModel(text);
  if (model) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "modelPreference", field: "model", value: model }));
  if (/(?:aracımı|arabamı|otomobilimi).*(?:değiştir|yenile)/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "currentVehicleContext", field: "currentVehicle", value: text.trim(), use: "NONE" }));
  if (/(?:ehliyet(?:imi)?(?: bugün)? aldım|ilk arac[ıi]m[ıi])/u.test(text.toLocaleLowerCase("tr"))) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "firstTimeDriverContext", field: "conversationContext", value: "FIRST_TIME_DRIVER", use: "NONE" }));
  const equipment = normalizedEquipment(text);
  const rejectsEquipment = Boolean(equipment && /(?:olmasın|istemiyorum|gerek yok|önemli değil|sorun değil|vazgeçtim)/iu.test(text));
  if (rejectsEquipment) {
    const activeEquipment = [...ledger].reverse().find((item) => item.concept === "equipmentFeature" && item.status === "ACTIVE" && item.normalizedValue === equipment);
    if (activeEquipment) ledger.push({ ...activeEquipment, id: `${messageId}:clear:equipmentFeature`, sourceMessageId: messageId, sourceTurn: state.revision + 1, sourceSpan: whole(text), status: "CLEARED", decisionUse: "NONE", supersedes: activeEquipment.id });
  } else if (equipment) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "equipmentFeature", field: "equipmentFeature", value: equipment }));
  if (/(?:bunlar|donanım|özellik).*(?:önemli değil|min(?:i|u)mum|gerek yok|özel (?:bir )?şart(?:ım)? yok|temel .* yeterli)/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "equipmentNotImportant", value: "MINIMAL", use: "NONE" }));
  if (/yakıt tasarrufu|kullanım gider|işletme gider/iu.test(text)) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "operatingCostPriority", field: "costPriority", value: "OPERATING_COST", use: "SOFT_RANK" }));
  const budget = budgetAmount(text, state.lastQuestionKey === "budget" || state.lastQuestionKey === "exactBudget");
  if (budget !== undefined && !clearBudget && !budgetNotImportant && (state.lastQuestionKey === "budget" || state.lastQuestionKey === "exactBudget" || /bütçe|fiyat|milyon|bin|₺|tl/iu.test(text))) { const soft = /(?:yaklaşık|civarı|civarında|kabaca|aşağı yukarı|ortalama|esnek|sanırım|net değil|emin değil)/iu.test(text); const concept = soft ? "budgetTarget" : "budgetMax"; ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept, field: "price", value: budget, use: soft ? "SOFT_RANK" : "HARD_FILTER" })); }
  if (state.lastQuestionKey === "brandModel" && !/(?:bilmiyorum|fark etmez|sen seç|yok|istemiyorum|alternatif|öner|göster|seç|kamera|sensör|isofix|donanım|hız sabitle|kör nokta)/iu.test(text) && text.trim().length > 1) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "brandModelPreference", field: "brandModel", value: text.trim(), use: "SOFT_RANK" }));
  const party = text.match(/(\d+)\s*kiş/iu); if (party) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "minimumSeats", field: "seats", value: Number(party[1]) }));
  const weakSignals: [RegExp, string, string | undefined, string, string][] = [
    [/kamp|bozuk yol/iu, "mixedRoadUse", "bodyStyle", "SUV", "Hem günlük kullanımda rahat hem de bozuk yollarda daha uygun olabilecek SUV/crossover araçları değerlendirelim mi?"],
    [/bebeğimiz olacak|bebek/iu, "familyPracticality", undefined, "PRACTICALITY", "Bebek eşyaları için yükleme kolaylığı ve ferahlığı daha güçlü olan araçlara öncelik verelim mi?"],
    [/uzun yolda yormasın/iu, "longDistanceComfort", undefined, "COMFORT", "Uzun yol rahatlığını seçimde belirleyici bir öncelik yapalım mı?"],
    [/ekonomik|bütçemiz fazla değil/iu, "valueEconomy", undefined, "VALUE", "Satın alma fiyatını mı, kullanım giderlerini mi daha belirleyici tutalım?"],
    [/\bperformans(?:lı| arab| otomobil| sürüş| öncel)/iu, "performance", undefined, "PERFORMANCE", "Canlı hızlanmayı seçimde belirleyici bir öncelik yapalım mı?"],
    [/(?:bel fıtığı|koltuk.*(?:rahat|pamuk)|süspansiyon.*(?:konfor|çukur)|inip bin)/iu, "ergonomicComfort", undefined, "ERGONOMIC_COMFORT", "Oturma, inip binme ve süspansiyon rahatlığını seçimde belirleyici tutalım mı?"],
    [/(?:bisiklet|bebek arabası|puset|kamp malzem|kocaman bagaj|dev bir bagaj|yükleme kolay)/iu, "cargoPracticality", undefined, "CARGO_PRACTICALITY", "Yükleme kolaylığı ve kullanılabilir bagaj alanını seçimde belirleyici tutalım mı?"],
    [/(?:karavan çek|çeki demir|yüksek tork)/iu, "towingNeed", undefined, "TOWING", "Karavan çekme uygunluğunu, yalnız katalogda doğrulanabilen çekme verileriyle, temel seçim ölçütü yapalım mı?"],
    [/(?:sessiz|yalıtım|yolda yorm|bacak.*uyuş)/iu, "cabinComfort", undefined, "CABIN_COMFORT", "Kabin sessizliği ve uzun yol konforunu seçimde belirleyici tutalım mı?"],
    [/(?:görüş açı|ön kaput.*bit|geri geri.*stres|park.*kork|yeni sürücü|acemili)/iu, "driverConfidence", undefined, "DRIVER_CONFIDENCE", "Görüş kolaylığı ve sürücü desteklerini seçimde belirleyici tutalım mı?"],
    [/(?:sürüşü keyif|yüzümde tebessüm|motorun.*ses|heyecan yaşat)/iu, "drivingEnjoyment", undefined, "DRIVING_ENJOYMENT", "Sürüş keyfini seçimde belirleyici bir öncelik yapalım mı?"],
    [/(?:güvende|güvenli|hata.*tolere|yokuşta.*kaydır)/iu, "safetyConfidence", undefined, "SAFETY_CONFIDENCE", "Doğrulanabilir güvenlik ve sürücü desteklerini seçimde belirleyici tutalım mı?"],
    [/(?:panoramik|cam tavan|sunroof|açılır tavan)/iu, "glassRoofPreference", "equipmentFeature", "PANORAMIC_GLASS_ROOF", "Panoramik veya açılır cam tavanı vazgeçilmez bir donanım olarak mı ele alalım?"],
    [/(?:ambiyans aydınlat|uçak kokpiti|gece sürüşünde.*ışık)/iu, "cockpitAmbience", undefined, "COCKPIT_AMBIENCE", "Dijital kokpit ve ambiyans aydınlatmasını tasarım seçiminde öne alalım mı?"],
    [/(?:dikkat çekici|karizma|karizmatik|dönüp.*bak|spor görünüş|farklı.*tasarım|zamansız.*tasarım)/iu, "distinctiveDesign", undefined, "DISTINCTIVE_DESIGN", "Dikkat çekici ve karakterli tasarımı seçimde belirleyici tutalım mı?"],
    [/(?:az yakan|yakıt ibresi|yakıt cimrisi|koklayan bir araç)/iu, "fuelEconomy", undefined, "FUEL_ECONOMY", "Düşük enerji veya yakıt tüketimini seçimde temel öncelik yapalım mı?"],
    [/(?:arkası geniş|diz mesafesi|arka koltuk.*geniş|uzun boylu.*biner)/iu, "rearSeatSpace", undefined, "REAR_SEAT_SPACE", "Arka koltuk genişliği ve diz mesafesini temel öncelik yapalım mı?"],
    [/(?:altı vur|yüksek bir araç|yüksekte otur)/iu, "highRideHeight", "bodyStyle", "SUV", "Yüksek sürüş ve yerden yükseklik ihtiyacı için SUV/crossover gövdeyi öne alalım mı?"],
    [/(?:sörf tahtası|kayak.*tavan|tavan.*kayak)/iu, "roofLoadLifestyle", undefined, "ROOF_LOAD", "Tavan taşıma uyumluluğunu seçimde önemli bir doğrulama ölçütü yapalım mı?"],
    [/(?:ses sistemi|harman kardon|müziği son ses)/iu, "premiumAudio", undefined, "PREMIUM_AUDIO", "Doğrulanabilir premium ses sistemini seçimde belirleyici tutalım mı?"],
    [/(?:e[- ]?segment)/iu, "marketSegment", undefined, "E_SEGMENT", "E-segmentte özellikle sedan gövdeyi mi hedefliyorsun?"],
    [/(?:ortak kullan|ikimizin de|ikimizin.*rahat|orta yol bulalım)/iu, "sharedDriverEase", undefined, "SHARED_DRIVER_EASE", "İkinizin de kolay alışacağı, görüşü ve kumandaları rahat bir aracı temel öncelik yapalım mı?"],
  ];
  if (pending) {
    const repeated = weakSignals.find(([pattern, concept]) => concept === pending?.concept && pattern.test(text));
    const source = ledger.find((item) => item.id === pending?.eventId);
    if (repeated && source) {
      ledger.push(event({ state: { ...state, ledger }, messageId, text, concept: source.concept, field: source.field, value: pending.proposedValue, use: source.field ? "HARD_FILTER" : "SOFT_RANK", authority: "USER_CONFIRMED" }));
      pending = undefined;
    }
  }
  if (!pending) {
    const priority = ["rearSeatSpace", "cargoPracticality", "cabinComfort", "ergonomicComfort", "sharedDriverEase", "driverConfidence", "safetyConfidence", "glassRoofPreference", "cockpitAmbience", "distinctiveDesign", "drivingEnjoyment", "fuelEconomy", "premiumAudio", "highRideHeight", "roofLoadLifestyle", "marketSegment", "towingNeed", "longDistanceComfort", "mixedRoadUse", "familyPracticality", "valueEconomy", "performance"];
    const matched = weakSignals.filter(([pattern, concept]) => pattern.test(text) && !(resolvedValueEconomy && concept === "valueEconomy")).sort((a, b) => priority.indexOf(a[1]) - priority.indexOf(b[1]));
    for (const [, concept, field, value, question] of matched) {
      if (ledger.some((item) => item.concept === concept && item.status === "ACTIVE")) continue;
      const weak = event({ state: { ...state, ledger }, messageId, text, concept, field, value, weak: true }); ledger.push(weak);
      pending ??= { eventId: weak.id, concept, proposedValue: value, question };
    }
  }
  return { ledger, pending };
}

export function applyCatalogEntitySignals(state: V3ConversationState, ledger: readonly PreferenceEvent[], messageId: string, text: string, signals: { readonly brands: readonly string[]; readonly models: readonly string[] }): readonly PreferenceEvent[] {
  let next = [...ledger];
  const tentative = /(?:olabilir|olsa da olur|örneğin|gibi)/iu.test(text);
  if (signals.brands.length) next = supersedeActive(next, event({ state: { ...state, ledger: next }, messageId, text, concept: "brandPreference", field: "brand", value: signals.brands.length === 1 ? signals.brands[0]! : signals.brands, use: tentative ? "SOFT_RANK" : "HARD_FILTER" }));
  if (signals.models.length && !/(?:aracımı|arabamı|otomobilimi).*(?:değiştir|yenile)/iu.test(text)) next = supersedeActive(next, event({ state: { ...state, ledger: next }, messageId, text, concept: "modelPreference", field: "model", value: signals.models.length === 1 ? signals.models[0]! : signals.models, use: tentative ? "SOFT_RANK" : "HARD_FILTER" }));
  return next;
}

export function applySemanticContextSignals(state: V3ConversationState, ledger: readonly PreferenceEvent[], messageId: string, signals: readonly V3SemanticContextSignal[]): readonly PreferenceEvent[] {
  const conceptByKind: Readonly<Record<V3SemanticContextSignal["kind"], string>> = { FIRST_TIME_DRIVER: "firstTimeDriverContext", PURCHASE_RESEARCH: "purchaseResearchContext", CURRENT_VEHICLE_OWNER: "currentVehicleContext" };
  const next = [...ledger];
  for (const signal of signals) {
    const concept = conceptByKind[signal.kind];
    if (next.some((item) => item.concept === concept && item.status === "ACTIVE" && item.sourceMessageId === messageId)) continue;
    next.push({ id: `${messageId}:semantic:${signal.kind}:${next.length}`, sourceMessageId: messageId, sourceTurn: state.revision + 1, sourceSpan: signal.sourceSpan, concept, field: "conversationContext", normalizedValue: signal.kind, strength: "UNCONFIRMED_HYPOTHESIS", status: "ACTIVE", decisionUse: "NONE", confidence: signal.confidence, authority: "MODEL_INFERENCE", confirmationRequired: false });
  }
  return next;
}

export function activeDecisionPreferences(ledger: readonly PreferenceEvent[]) {
  const terminal = new Map<string, PreferenceEvent>();
  for (const item of ledger) if (item.status === "ACTIVE") terminal.set(item.concept, item); else if (item.status === "CLEARED" || item.status === "REJECTED") terminal.delete(item.concept);
  return [...terminal.values()].filter((item) => ["EXPLICIT_HARD", "EXPLICIT_STRONG", "CONFIRMED_STRONG"].includes(item.strength) && ["HARD_FILTER", "SOFT_RANK"].includes(item.decisionUse));
}

export function latestActiveLedgerEvent(ledger: readonly PreferenceEvent[], concept: string) {
  const terminal = new Map<string, PreferenceEvent>(); for (const item of ledger) if (item.status === "ACTIVE") terminal.set(item.concept, item); else if (["CLEARED", "REJECTED"].includes(item.status)) terminal.delete(item.concept); return terminal.get(concept);
}
