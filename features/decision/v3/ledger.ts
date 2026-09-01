import type {
  PendingConfirmation,
  PreferenceEvent,
  V3ConversationState,
  V3SemanticContextSignal,
  V3SemanticPreferenceSignal,
} from "./types";
import { deriveElectricRouteRangeRequirement } from "./electricRouteRange";
import { resolveEquipmentRequirement } from "../../vehicle-data/equipmentEvidenceResolver";
import { detectExplicitUsagePurpose } from "./usageSemantics";

const whole = (text: string) => ({ start: 0, end: text.length, text });
const withoutCurrentVehicleBodyContext = (text: string): string =>
  text.replace(
    /(?:(?:şu an|halen|hâlen|mevcut(?:ta)?|halihazırda)\s+)?(?:kullandığım|sahip olduğum|bindiğim)\s+(?:(?:eski|mevcut)\s+)?(?:panel\s*van|panelvan|minibüs|yolcu van|pick\s*up|kamyonet|mpv|coupe|coupé|hatchback|sedan|suv|crossover)(?:\s+(?:araç|araba|otomobil))?[^.!?]*/giu,
    (match) => " ".repeat(match.length),
  );
const normalizedBody = (
  text: string,
): string | readonly string[] | undefined => {
  text = withoutCurrentVehicleBodyContext(text);
  if (/panel\s*van|panelvan/iu.test(text)) return "PANEL VAN";
  const explicit = [
    [/(?:minibüs|yolcu van)/iu, "PASSENGER VAN"],
    [/(?:pick(?:\s|-)*up|kamyonet)/iu, "PICKUP"],
    [/\bmpv\b/iu, "MPV"],
    [/coupe|coupé/iu, "COUPE"],
    [/hatchback/iu, "HATCHBACK"],
    [/sedan/iu, "SEDAN"],
    [/(?:suv|crossover)/iu, "SUV"],
  ] as const;
  const matches = explicit
    .filter(([pattern]) => pattern.test(text))
    .map(([, value]) => value);
  if (matches.length > 1) return matches;
  if (matches.length === 1) return matches[0];
  return /kompakt|parkı kolay|küçük bir yapı/iu.test(text)
    ? "HATCHBACK"
    : /(?:daha yüksek\s+(?:bir\s+)?(?:araç|gövde|oturma|sürüş|yapı)|ferah.{0,20}yüksek)/iu.test(text)
      ? "SUV"
      : undefined;
};
const normalizedFuel = (text: string) => {
  const withoutElectricalEquipment = text.replace(
    /elektrikli\s+(?:kayar\s+kapı|koltuk|bagaj(?:\s+kapağı)?|ayna)/giu,
    "",
  );
  const desiredElectric =
    /(?:tam\s+elektrikli|elektrikli\s+(?:araç|otomobil|model|suv|hatchback|sedan)|^\s*elektrikli\b)/iu.test(
      withoutElectricalEquipment,
    );
  const hybridDescribesCurrentVehicle =
    /hibrit\s+(?:aracımı|arabamı|otomobilimi).*(?:değiştir|yenile)/iu.test(
      withoutElectricalEquipment,
    );
  const values = [
    /hibrit|hibrid/iu.test(withoutElectricalEquipment) &&
    !hybridDescribesCurrentVehicle
      ? "HEV"
      : undefined,
    desiredElectric || /elektrikli/iu.test(withoutElectricalEquipment)
      ? "BEV"
      : undefined,
    /dizel/iu.test(withoutElectricalEquipment) ? "DIESEL" : undefined,
    /benzinli/iu.test(withoutElectricalEquipment) ? "GASOLINE" : undefined,
  ].filter((value): value is string => Boolean(value));
  return values.length > 1 ? values : values[0];
};
const normalizedTransmission = (text: string) =>
  /manuel/iu.test(text)
    ? "MANUAL"
    : /otomatik(?!\s*(?:park|klima))|dsg|dct|cvt|e-?dct|tork konvertör/iu.test(
          text,
        )
      ? "AUTOMATIC"
      : undefined;
const normalizedEquipments = (text: string): readonly string[] =>
  [
    [/270\s*(?:derece)?.*arka kapı/iu, "REAR_DOOR_OPENING_270"],
    [/180\s*(?:derece)?.*arka kapı/iu, "REAR_DOOR_OPENING_180"],
    [/elektrikli kayar (?:yan )?kapı/iu, "POWER_SLIDING_SIDE_DOOR"],
    [
      /(?:tavan taşıyıcı|portbagaj).{0,40}(?:uyum|takıl|montaj|destek)|(?:uyumlu|takılabilen).{0,30}(?:tavan taşıyıcı|portbagaj)/iu,
      "ROOF_RACK_COMPATIBILITY",
    ],
    [
      /(?:bagaj|yük) filesi.{0,40}(?:uyum|takıl|bağlan|montaj|destek)|(?:uyumlu|takılabilen).{0,30}(?:bagaj|yük) filesi/iu,
      "CARGO_NET_COMPATIBILITY",
    ],
    [/tavan ray/iu, "ROOF_RAILS"],
    [/bagaj file/iu, "CARGO_NET"],
    [/yük sabitleme|bağlama nokt|sabitleme kanca/iu, "CARGO_TIE_DOWN_POINTS"],
    [
      /arka kapı güneşlik|entegre.*güneşlik/iu,
      "INTEGRATED_REAR_DOOR_SUNSHADES",
    ],
    [/360\s*(?:derece)?|çevre görüş/iu, "SURROUND_VIEW_CAMERA_360"],
    [/geri görüş kameras/iu, "REAR_VIEW_CAMERA"],
    [
      /kendi kendine park|otomatik park|park asistan/iu,
      "AUTOMATIC_PARK_ASSIST",
    ],
    [/(?:ön|arka)?\s*park sensör/iu, "PARKING_SENSORS"],
    [
      /adaptif hız|adaptive cruise|mesafeyi koruyan.*hız|öndeki araçla mesafe/iu,
      "ADAPTIVE_CRUISE_CONTROL",
    ],
    [/(?:şerit takip|şeritte tut)/iu, "LANE_KEEP_ASSIST"],
    [/kör nokta/iu, "BLIND_SPOT_MONITOR"],
    [/isofix|çocuk koltuğu bağlant/iu, "ISOFIX_REAR_OUTER"],
    [/anahtarsız (?:çalıştırma|başlatma)/iu, "KEYLESS_START"],
    [/ısıtmalı arka koltuk|arka koltuk ısıtma/iu, "HEATED_REAR_SEATS"],
    [
      /ısıtmalı (?:ön )?koltuk|(?<!arka )(?:(?:ön )?koltuk ısıtma)/iu,
      "HEATED_FRONT_SEATS",
    ],
    [/panoramik|cam tavan|sunroof|açılır tavan/iu, "PANORAMIC_GLASS_ROOF"],
    [/kablosuz (?:telefon )?şarj/iu, "WIRELESS_PHONE_CHARGING"],
    [
      /koltuk (?:soğutma|havalandırma)|soğutmalı koltuk|havalandırmalı (?:ön )?koltuk/iu,
      "VENTILATED_FRONT_SEATS",
    ],
    [
      /arka diferansiyel kilidi|arka diff kilidi/iu,
      "LOCKING_REAR_DIFFERENTIAL",
    ],
    [
      /merkez diferansiyel kilidi|orta diferansiyel kilidi/iu,
      "LOCKING_CENTER_DIFFERENTIAL",
    ],
  ].flatMap(([pattern, value]) =>
    (pattern as RegExp).test(text) ? [value as string] : [],
  );
const weakConfirmationQuestions: Readonly<Record<string, string>> =
  Object.freeze({
    mixedRoadUse:
      "Hem günlük kullanımda rahat hem de bozuk yollarda daha uygun olabilecek SUV/crossover araçları değerlendirelim mi?",
    familyPracticality:
      "Bebek eşyaları için yükleme kolaylığı ve ferahlığı daha güçlü olan araçlara öncelik verelim mi?",
    longDistanceComfort:
      "Uzun yol rahatlığını seçimde belirleyici bir öncelik yapalım mı?",
    valueEconomy:
      "Satın alma fiyatını mı, kullanım giderlerini mi daha belirleyici tutalım?",
    performance: "Canlı hızlanmayı seçimde belirleyici bir öncelik yapalım mı?",
    ergonomicComfort:
      "Oturma, inip binme ve süspansiyon rahatlığını seçimde belirleyici tutalım mı?",
    cargoPracticality:
      "Yükleme kolaylığı ve kullanılabilir bagaj alanını seçimde belirleyici tutalım mı?",
    towingNeed:
      "Karavan çekme uygunluğunu, yalnız katalogda doğrulanabilen çekme verileriyle, temel seçim ölçütü yapalım mı?",
    cabinComfort:
      "Kabin sessizliği ve uzun yol konforunu seçimde belirleyici tutalım mı?",
    driverConfidence:
      "Görüş kolaylığı ve sürücü desteklerini seçimde belirleyici tutalım mı?",
    drivingEnjoyment:
      "Sürüş keyfini seçimde belirleyici bir öncelik yapalım mı?",
    safetyConfidence:
      "Doğrulanabilir güvenlik ve sürücü desteklerini seçimde belirleyici tutalım mı?",
    glassRoofPreference:
      "Panoramik veya açılır cam tavanı vazgeçilmez bir donanım olarak mı ele alalım?",
    cockpitAmbience:
      "Dijital kokpit ve ambiyans aydınlatmasını tasarım seçiminde öne alalım mı?",
    distinctiveDesign:
      "Şirin, sevimli veya karakterli görünümü seçimde belirleyici tutalım mı?",
    fuelEconomy:
      "Düşük enerji veya yakıt tüketimini seçimde temel öncelik yapalım mı?",
    rearSeatSpace:
      "Arka koltuk genişliği ve diz mesafesini temel öncelik yapalım mı?",
    highRideHeight:
      "Yüksek sürüş ve yerden yükseklik ihtiyacı için SUV/crossover gövdeyi öne alalım mı?",
    roofLoadLifestyle:
      "Tavan taşıma uyumluluğunu seçimde önemli bir doğrulama ölçütü yapalım mı?",
    premiumAudio:
      "Doğrulanabilir premium ses sistemini seçimde belirleyici tutalım mı?",
    marketSegment: "E-segmentte özellikle sedan gövdeyi mi hedefliyorsun?",
    sharedDriverEase:
      "İkinizin de kolay alışacağı, görüşü ve kumandaları rahat bir aracı temel öncelik yapalım mı?",
  });

const nextWeakConfirmation = (
  ledger: readonly PreferenceEvent[],
  excludedConcept?: string,
): PendingConfirmation | undefined => {
  const weak = ledger.find(
    (item) =>
      item.status === "ACTIVE" &&
      item.strength === "WEAK_SIGNAL" &&
      item.decisionUse === "QUESTION_INPUT" &&
      item.concept !== excludedConcept &&
      !ledger.some(
        (candidate) =>
          candidate.concept === item.concept &&
          candidate.status === "ACTIVE" &&
          candidate.strength === "CONFIRMED_STRONG",
      ),
  );
  const question = weak && weakConfirmationQuestions[weak.concept];
  return weak && question
    ? {
        eventId: weak.id,
        concept: weak.concept,
        proposedValue: String(weak.normalizedValue),
        question,
      }
    : undefined;
};
const desiredBrand = (text: string) =>
  text.match(/(?:^|\s)([\p{Lu}][\p{L}\d.-]+)\s+marka\b/u)?.[1] ??
  text.match(
    /\byine\s+([\p{Lu}][\p{L}\d.-]+)(?:['’](?:nın|nin|nun|nün))?/u,
  )?.[1] ??
  text.match(/^([\p{Lu}][\p{L}\d.-]+)(?:['’](?:nın|nin|nun|nün))\s+/u)?.[1];
const desiredModel = (text: string) => {
  const candidate = text.match(
    /^([\p{Lu}][\p{L}\d.-]*(?:\s+[\p{Lu}\d][\p{L}\d.-]*){0,2})\s+(?:modelini\s+)?(?:satın\s+)?almak\s+istiyorum[.!]?$/u,
  )?.[1];
  return candidate &&
    !/^(?:araç|araba|otomobil|yeni araç|yeni araba|yeni otomobil)$/iu.test(
      candidate,
    )
    ? candidate
    : undefined;
};
function budgetAmount(text: string, allowBareNumber: boolean) {
  const normalized = text.replace(/(\d+)\.\s+(\d+)\s*m\b/giu, "$1.$2 milyon");
  const first = normalized.match(
    allowBareNumber
      ? /(\d{1,3}(?:[.]\d{3})+|\d+(?:[.,]\d+)?)\s*(milyon|bin|m)?(?:\s*(?:tl|₺))?/iu
      : /(\d{1,3}(?:[.]\d{3})+|\d+(?:[.,]\d+)?)\s*(milyon|bin|m|tl|₺)/iu,
  );
  if (!first) return undefined;
  const unit = first[2]?.toLocaleLowerCase("tr");
  const token = first[1]!;
  const raw = Number(
    /^\d{1,3}(?:\.\d{3})+$/u.test(token)
      ? token.replace(/\./g, "")
      : token.replace(",", "."),
  );
  let value =
    unit === "milyon" || unit === "m"
      ? raw * 1_000_000
      : unit === "bin"
        ? raw * 1_000
        : raw;
  if (unit === "milyon" || unit === "m") {
    const tail = normalized
      .slice((first.index ?? 0) + first[0].length)
      .match(/(\d+(?:[.,]\d+)?)\s*bin/iu);
    if (tail) value += Number(tail[1]!.replace(",", ".")) * 1_000;
  }
  return value;
}

function event(input: {
  state: V3ConversationState;
  messageId: string;
  text: string;
  concept: string;
  field?: string;
  value: string | number | readonly string[];
  weak?: boolean;
  use?: PreferenceEvent["decisionUse"];
  authority?: PreferenceEvent["authority"];
}): PreferenceEvent {
  const authority = input.authority ?? "USER_EXPLICIT";
  return {
    id: `${input.messageId}:${input.concept}:${input.state.ledger.length}`,
    sourceMessageId: input.messageId,
    sourceTurn: input.state.revision + 1,
    sourceSpan: whole(input.text),
    concept: input.concept,
    field: input.field,
    normalizedValue: input.value,
    strength: input.weak
      ? "WEAK_SIGNAL"
      : authority === "USER_CONFIRMED"
        ? "CONFIRMED_STRONG"
        : "EXPLICIT_STRONG",
    status: "ACTIVE",
    decisionUse: input.weak ? "QUESTION_INPUT" : (input.use ?? "HARD_FILTER"),
    confidence: input.weak ? 0.72 : 0.96,
    authority,
    confirmationRequired: Boolean(input.weak),
  };
}

function supersedeActive(
  ledger: readonly PreferenceEvent[],
  next: PreferenceEvent,
  sameConcept = next.concept,
): PreferenceEvent[] {
  const prior = [...ledger]
    .reverse()
    .find((item) => item.concept === sameConcept && item.status === "ACTIVE");
  if (!prior) return [...ledger, next];
  if (
    prior.sourceMessageId === next.sourceMessageId &&
    JSON.stringify(prior.normalizedValue) === JSON.stringify(next.normalizedValue)
  )
    return [...ledger];
  return [
    ...ledger,
    {
      ...prior,
      id: `${next.id}:supersede`,
      status: "SUPERSEDED",
      supersedes: prior.id,
      decisionUse: "NONE",
      sourceMessageId: next.sourceMessageId,
      sourceTurn: next.sourceTurn,
      sourceSpan: next.sourceSpan,
    },
    { ...next, supersedes: prior.id },
  ];
}

function supersedeMatchingEquipment(
  ledger: readonly PreferenceEvent[],
  next: PreferenceEvent,
): PreferenceEvent[] {
  const prior = [...ledger]
    .reverse()
    .find(
      (item) =>
        item.concept === "equipmentFeature" &&
        item.status === "ACTIVE" &&
        item.normalizedValue === next.normalizedValue,
    );
  if (!prior) return [...ledger, next];
  return [
    ...ledger,
    {
      ...prior,
      id: `${next.id}:supersede`,
      status: "SUPERSEDED",
      supersedes: prior.id,
      decisionUse: "NONE",
      sourceMessageId: next.sourceMessageId,
      sourceTurn: next.sourceTurn,
      sourceSpan: next.sourceSpan,
    },
    { ...next, supersedes: prior.id },
  ];
}

export function applyPreferenceMessage(
  state: V3ConversationState,
  messageId: string,
  text: string,
): { ledger: readonly PreferenceEvent[]; pending?: PendingConfirmation } {
  let ledger = [...state.ledger];
  let pending = state.pendingConfirmation;
  let resolvedValueEconomy = false;
  const clearActiveConcept = (concept: string) => {
    const active = [...ledger]
      .reverse()
      .find((item) => item.concept === concept && item.status === "ACTIVE");
    if (active)
      ledger.push({
        ...active,
        id: `${messageId}:clear:${concept}`,
        sourceMessageId: messageId,
        sourceTurn: state.revision + 1,
        sourceSpan: whole(text),
        status: "CLEARED",
        decisionUse: "NONE",
        supersedes: active.id,
      });
  };
  if (
    /(?:gövde|kasa|suv|hatchback|sedan).*(?:fark etmez|esnet|önemli değil)/iu.test(
      text,
    )
  )
    clearActiveConcept("bodyStyle");
  if (/(?:yakıt|motor türü).*(?:fark etmez|esnet|önemli değil)/iu.test(text))
    clearActiveConcept("fuelType");
  if (/(?:vites|şanzıman).*(?:fark etmez|esnet|önemli değil)/iu.test(text))
    clearActiveConcept("transmission");
  const refusesEquipmentRelaxation =
    /(?:çıkarma|çıkarmayalım|çıkartma|koru|vazgeçme|şartı koru)/iu.test(text);
  if (
    state.pendingAction === "RELAX_UNSUPPORTED_EQUIPMENT" &&
    !refusesEquipmentRelaxation &&
    /(?:evet|olur|tamam|çıkar(?:\s|[.!?,]|$)|esnet|vazgeç|önemli değil|şart değil)/iu.test(
      text,
    )
  ) {
    const activeEquipment = [...ledger]
      .reverse()
      .find(
        (item) =>
          ["equipmentFeature", "unmappedEquipmentRequirement"].includes(
            item.concept,
          ) && item.status === "ACTIVE",
      );
    if (activeEquipment)
      ledger.push({
        ...activeEquipment,
        id: `${messageId}:clear:${activeEquipment.concept}`,
        sourceMessageId: messageId,
        sourceTurn: state.revision + 1,
        sourceSpan: whole(text),
        status: "CLEARED",
        decisionUse: "NONE",
        supersedes: activeEquipment.id,
      });
    return { ledger, pending };
  }
  if (
    state.pendingAction === "RELAX_BRAND_FOR_POWERTRAIN" &&
    /(?:evet|olur|tamam|esnet|başka marka|marka fark etmez|seçelim)/iu.test(
      text,
    )
  ) {
    const activeBrand = [...ledger]
      .reverse()
      .find(
        (item) =>
          item.concept === "brandPreference" && item.status === "ACTIVE",
      );
    if (activeBrand)
      ledger.push({
        ...activeBrand,
        id: `${messageId}:clear:brandPreference`,
        sourceMessageId: messageId,
        sourceTurn: state.revision + 1,
        sourceSpan: whole(text),
        status: "CLEARED",
        decisionUse: "NONE",
        supersedes: activeBrand.id,
      });
    return { ledger, pending };
  }
  if (
    pending &&
    /^(?:evet|olur|olabilir|uygun|değerlendirelim|yapalım|tutalım|öne alalım|temel öncelik yapalım|tamam)\b/iu.test(
      text.trim(),
    )
  ) {
    const source = ledger.find((item) => item.id === pending!.eventId);
    if (source)
      ledger = [
        ...ledger,
        event({
          state: { ...state, ledger },
          messageId,
          text,
          concept: source.concept,
          field: source.field,
          value: pending.proposedValue,
          use: source.field ? "HARD_FILTER" : "SOFT_RANK",
          authority: "USER_CONFIRMED",
        }),
      ];
    return { ledger, pending: nextWeakConfirmation(ledger, source?.concept) };
  }
  if (pending && /^(?:hayır|istemem|olmasın|gerek yok)/iu.test(text.trim())) {
    const source = ledger.find((item) => item.id === pending!.eventId);
    if (source)
      ledger = [
        ...ledger,
        {
          ...source,
          id: `${messageId}:reject:${source.concept}`,
          sourceMessageId: messageId,
          sourceTurn: state.revision + 1,
          sourceSpan: whole(text),
          status: "REJECTED",
          decisionUse: "NONE",
          supersedes: source.id,
        },
      ];
    return { ledger, pending: undefined };
  }
  if (
    pending?.concept === "valueEconomy" &&
    /(?:her ikisi|ikisi ?de|ikiside|toplam maliyet)/iu.test(text)
  ) {
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "totalCostPriority",
        field: "costPriority",
        value: "TOTAL_COST",
        use: "SOFT_RANK",
        authority: "USER_CONFIRMED",
      }),
    );
    return { ledger, pending: undefined };
  }
  if (
    pending?.concept === "valueEconomy" &&
    /(?:bilmiyorum|sence|sen söyle|sen seç)/iu.test(text)
  ) {
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "totalCostPriority",
        field: "costPriority",
        value: "TOTAL_COST",
        use: "SOFT_RANK",
        authority: "PRODUCT_POLICY",
      }),
    );
    return { ledger, pending: undefined };
  }
  if (
    pending?.concept === "valueEconomy" &&
    /(?:(?:yakıt|kullanım|işletme) gider|az yak|düşük tüketim)/iu.test(text)
  ) {
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "operatingCostPriority",
        field: "costPriority",
        value: "OPERATING_COST",
        use: "SOFT_RANK",
        authority: "USER_CONFIRMED",
      }),
    );
    pending = undefined;
    resolvedValueEconomy = true;
  }
  const budgetNotImportant =
    /(?:bütçe (?:önemli|sorun) değil|bütçe kısıtlamam yok|bütçeyi (?:önemseme|boşver)|fiyat (?:önemli|sorun) değil|net bütçe(?:m| rakamım)? (?:henüz )?yok|bütçe(?:m)? (?:henüz )?net değil)/iu.test(
      text,
    );
  const clearBudget = /(?:bütçeyi (?:boşver|kaldır)|bütçe önemli değil)/iu.test(
    text,
  );
  if (clearBudget) {
    for (const concept of ["budgetMax", "budgetTarget"])
      clearActiveConcept(concept);
  }
  if (budgetNotImportant)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "budgetNotImportant",
        value: "NOT_IMPORTANT",
        use: "NONE",
      }),
    );
  if (
    /(?:fiyat|bütçe).*(?:rakam|sayı|net (?:bir )?sınır).*(?:veremem|söyleyemem|bilmiyorum)|rakam veremem/iu.test(
      text,
    )
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "budgetUnspecified",
        value: "UNSPECIFIED",
        use: "NONE",
      }),
    );
  if (
    (state.lastQuestionKey === "budget" ||
      state.lastQuestionKey === "exactBudget") &&
    /(?:net (?:bir )?rakam|rakamı|bütçe).*(?:belirlemedim|belli değil|henüz yok)/iu.test(
      text,
    )
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "budgetUnspecified",
        value: "UNSPECIFIED",
        use: "NONE",
      }),
    );
  if (
    state.lastQuestionKey === "exactBudget" &&
    !budgetAmount(text, true) &&
    /(?:öner|seç|göster|paylaş|marka.?model)/iu.test(text)
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "budgetUnspecified",
        value: "UNSPECIFIED",
        use: "NONE",
        authority: "PRODUCT_POLICY",
      }),
    );
  const usage = detectExplicitUsagePurpose(text);
  if (usage)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "primaryUsage",
        field: "usagePurpose",
        value: usage.value,
      }),
    );
  const routeRange = deriveElectricRouteRangeRequirement(text);
  if (routeRange)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "minimumElectricRange",
        field: "electricRangeKmMin",
        value: routeRange.minimumCatalogRangeKm,
      }),
    );
  if (/(?:bozuk(?:\s+ve\s+\p{L}+)?\s+yol|stabilize\s+yol|toprak\s+yol|mıcır(?:lı)?\s+yol|asfaltsız\s+yol|engebeli\s+yol|çamurlu\s+yol)/iu.test(text))
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "roadCondition",
        value: "ROUGH_UNPAVED",
        use: "NONE",
      }),
    );
  if (
    !/(?:yük\s+taşıma).{0,50}(?:nereden|neden|ne alaka|demedim|söylemedim)|(?:nereden|neden|ne alaka).{0,50}(?:yük\s+taşıma)/iu.test(text) &&
    /(?:yük|koli|ürün|kargo|malzeme|ekipman|fide|toprak).{0,60}(?:taşı|götür|getir|yükle)|(?:taşı|götür|getir|yükle).{0,60}(?:yük|koli|ürün|kargo|malzeme|ekipman|fide|toprak)/iu.test(text)
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "cargoRequirement",
        value: "GOODS_TRANSPORT",
        use: "NONE",
      }),
    );
  const body = normalizedBody(text);
  const answeredBody =
    state.lastQuestionKey === "bodyStyle"
      ? /park|kompakt|küçük/iu.test(text)
        ? "HATCHBACK"
        : /ferah|yüksek|geniş/iu.test(text)
          ? "SUV"
          : undefined
      : state.lastQuestionKey === "commercialConfiguration"
        ? /panelvan|kapalı.*yük/iu.test(text)
          ? "PANEL VAN"
          : /pick.?up|açık kasa/iu.test(text)
            ? "PICKUP"
            : /yolcu.*yük|birlikte/iu.test(text)
              ? "PASSENGER VAN"
              : undefined
        : state.lastQuestionKey === "mixedRoadBody"
          ? /pick(?:\s|-)*up|açık kasa/iu.test(text)
            ? "PICKUP"
            : /suv|kapalı bagaj/iu.test(text)
              ? "SUV"
              : /(?:her\s*)?ikisi de/iu.test(text)
                ? ["SUV", "PICKUP"]
                : undefined
          : undefined;
  if (body ?? answeredBody)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "bodyStyle",
        field: "bodyStyle",
        value: (body ?? answeredBody)!,
      }),
    );
  if (
    (state.lastQuestionKey === "bodyStyle" ||
      state.askedQuestionKeys.includes("bodyStyle")) &&
    /(?:ekonomik.*yeterli|gövde.*(?:fark etmez|önemli değil)|hangisi olursa)/iu.test(
      text,
    )
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "bodyNotImportant",
        value: "FLEXIBLE",
        use: "NONE",
      }),
    );
  if (
    (state.lastQuestionKey === "bodyStyle" ||
      state.askedQuestionKeys.includes("bodyStyle")) &&
    /(?:(?:[iİ]kisi de|hiçbiri).*(?:önceliğim değil|önemli değil|fark etmez)|(?:gövde|yapı).*(?:önceliğim değil|fark etmez))/iu.test(
      text,
    )
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "bodyNotImportant",
        value: "FLEXIBLE",
        use: "NONE",
      }),
    );
  if (
    state.lastQuestionKey === "bodyStyle" &&
    /(?:bunlar|bunların|bu sordukların).*(?:önemli değil|önemi yok|bir önemi yok)/iu.test(
      text,
    )
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "bodyNotImportant",
        value: "FLEXIBLE",
        use: "NONE",
      }),
    );
  if (
    state.lastQuestionKey === "bodyStyle" &&
    /^(?:her\s*)?ikisi de(?:\s+(?:önemli|olabilir))?[.! ]*$/iu.test(text.trim())
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "bodyNotImportant",
        value: "FLEXIBLE",
        use: "NONE",
      }),
    );
  const fuel = normalizedFuel(text);
  if (fuel)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "fuelType",
        field: "fuelType",
        value: fuel,
      }),
    );
  if (
    state.lastQuestionKey === "fuelType" &&
    !fuel &&
    /(?:bilmiyorum|senin önerin|sen öner|sen seç|birlikte değerlendirelim|şimdilik açık bırakalım|fark etmez|yakıt türü önemli değil)/iu.test(
      text,
    )
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "fuelDelegated",
        value: "ADVISOR_GUIDANCE",
        use: "NONE",
      }),
    );
  const personaDiscriminator: Readonly<Record<string, { concept: string; pattern: RegExp }>> = {
    COMFORT: { concept: "candidateComfortPriority", pattern: /uzun yol konforu/iu },
    PRACTICALITY: { concept: "candidatePracticalityPriority", pattern: /günlük pratiklik|kullanışlılık/iu },
    TECHNOLOGY: { concept: "candidateTechnologyPriority", pattern: /teknoloji/iu },
    SUSTAINABILITY: { concept: "candidateSustainabilityPriority", pattern: /sürdürülebilir|elektrikli.*karakter/iu },
    DRIVING_ENGAGEMENT: { concept: "candidateDrivingPriority", pattern: /sürüş keyfi/iu },
    FAMILY: { concept: "candidateFamilyPriority", pattern: /aile pratikliği/iu },
    DESIGN: { concept: "candidateDesignPriority", pattern: /tasarım karakteri/iu },
  };
  if (state.lastQuestionKey?.startsWith("personaDiscriminator:") && !/(?:hiçbiri|bunlar.*belirleyici değil)/iu.test(text)) {
    const selected = state.lastQuestionKey.slice("personaDiscriminator:".length).split("|").map((code) => personaDiscriminator[code]).filter((item) => item?.pattern.test(text));
    for (const item of selected) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: item.concept, value: "USER_SELECTED", use: "SOFT_RANK" }));
  }
  if (state.lastQuestionKey === "referenceVehicleTraits:DODGE_VIPER") {
    const selections: readonly [RegExp, string, string][] = [
      [/tasarım/iu, "candidateDesignPriority", "USER_SELECTED"],
      [/performans|hızlanma/iu, "candidatePowerPriority", "USER_SELECTED"],
      [/sürüş karakteri|sürüş keyfi/iu, "candidateDrivingPriority", "USER_SELECTED"],
    ];
    for (const [, concept, value] of selections.filter(([pattern]) => pattern.test(text)))
      ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept, value, use: "SOFT_RANK" }));
    if (/alçak spor/iu.test(text))
      ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "bodyStyle", field: "bodyStyle", value: "COUPE", use: "HARD_FILTER" }));
  }
  const technicalDiscriminator: Readonly<Record<string, { concept: string; pattern: RegExp }>> = {
    COMPACT: { concept: "candidateCompactPriority", pattern: /kısa|kolay manevra|kompakt/iu },
    LUGGAGE: { concept: "candidateLuggagePriority", pattern: /büyük bagaj|bagaj/iu },
    POWER: { concept: "candidatePowerPriority", pattern: /motor gücü|güç/iu },
    PRICE: { concept: "candidatePricePriority", pattern: /satın alma fiyatı|daha düşük.*fiyat/iu },
    RANGE: { concept: "candidateRangePriority", pattern: /elektrikli menzil|menzil/iu },
    WIDTH: { concept: "candidateWidthPriority", pattern: /gövde genişliği|dar yer/iu },
    HEIGHT: { concept: "candidateHeightPriority", pattern: /yüksek gövde/iu },
    WHEELBASE: { concept: "candidateWheelbasePriority", pattern: /aks mesafesi/iu },
    TORQUE: { concept: "candidateTorquePriority", pattern: /tork/iu },
    PAYLOAD: { concept: "candidatePayloadPriority", pattern: /taşıma kapasitesi/iu },
    TOWING: { concept: "candidateTowingPriority", pattern: /römork|çekme kapasitesi/iu },
    CONSUMPTION: { concept: "candidateConsumptionPriority", pattern: /enerji.*tüketim|yakıt tüketim|düşük tüketim/iu },
    BATTERY: { concept: "candidateBatteryPriority", pattern: /batarya kapasitesi/iu },
    CHARGING: { concept: "candidateChargingPriority", pattern: /dc şarj|şarj gücü/iu },
  };
  if (state.lastQuestionKey?.startsWith("technicalDiscriminator:") && !/(?:hiçbiri|bunlar.*belirleyici değil)/iu.test(text)) {
    const selected = state.lastQuestionKey.slice("technicalDiscriminator:".length).split("|").map((code) => technicalDiscriminator[code]).filter((item) => item?.pattern.test(text));
    for (const item of selected) ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: item.concept, value: "USER_SELECTED", use: "SOFT_RANK" }));
  }
  const requestsMaximumPassengerCapacity =
    /(?:en fazla|en yüksek|maksimum).{0,32}(?:kişi|kişilik|koltuk)|(?:kişi|kişilik|koltuk).{0,32}(?:en fazla|en yüksek|maksimum)/iu.test(text)
    || (state.lastQuestionKey === "passengerCapacity"
      && /(?:en fazla|en yüksek|maksimum).{0,24}kapasite/iu.test(text));
  if (requestsMaximumPassengerCapacity)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "candidateSeatsPriority",
        value: "MAXIMIZE",
        use: "SOFT_RANK",
      }),
    );
  const directExtremePriorities: readonly {
    readonly concept: string;
    readonly pattern: RegExp;
    readonly value: "MAXIMIZE" | "MINIMIZE";
  }[] = [
    { concept: "candidateRangePriority", pattern: /(?:en yüksek|en uzun|maksimum).{0,28}menzil/iu, value: "MAXIMIZE" },
    { concept: "candidatePayloadPriority", pattern: /(?:en yüksek|maksimum).{0,28}(?:taşıma kapasite(?:si|li)|yük kapasite(?:si|li)|tonaj|istiap)/iu, value: "MAXIMIZE" },
    { concept: "candidateTowingPriority", pattern: /(?:en yüksek|maksimum).{0,28}(?:çekme kapasitesi|römork)/iu, value: "MAXIMIZE" },
    { concept: "candidatePowerPriority", pattern: /(?:en yüksek|en güçlü|maksimum).{0,28}(?:motor gücü|güç|kw)/iu, value: "MAXIMIZE" },
    { concept: "candidateTorquePriority", pattern: /(?:en yüksek|maksimum).{0,28}tork/iu, value: "MAXIMIZE" },
    { concept: "candidateLuggagePriority", pattern: /(?:en yüksek|en büyük|maksimum).{0,28}bagaj/iu, value: "MAXIMIZE" },
    { concept: "candidatePricePriority", pattern: /(?:en düşük|en ucuz|minimum).{0,28}(?:fiyat|satın alma)/iu, value: "MINIMIZE" },
    { concept: "candidateConsumptionPriority", pattern: /(?:en düşük|minimum).{0,28}(?:tüketim|yakıt|enerji)/iu, value: "MINIMIZE" },
  ];
  if (/(?:göster|öner|seç|hangisi|hangi araç|istiyorum)/iu.test(text)) {
    for (const priority of directExtremePriorities.filter((item) => item.pattern.test(text)))
      ledger = supersedeActive(
        ledger,
        event({
          state: { ...state, ledger },
          messageId,
          text,
          concept: priority.concept,
          value: priority.value,
          use: "SOFT_RANK",
        }),
      );
  }
  if (/(?:daha az yakan|daha düşük tüketim|daha ekonomik|yakıtı daha ekonomik)/iu.test(text))
    ledger = supersedeActive(ledger, event({ state: { ...state, ledger }, messageId, text, concept: "candidateConsumptionPriority", value: "MINIMIZE", use: "SOFT_RANK" }));
  const transmission = normalizedTransmission(text);
  if (transmission)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "transmission",
        field: "transmission",
        value: transmission,
      }),
    );
  const brand = desiredBrand(text);
  if (brand && /(?:satın al|değiştir|istiyorum|öner|seç)/iu.test(text))
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "brandPreference",
        field: "brand",
        value: brand,
      }),
    );
  const model = desiredModel(text);
  if (model)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "modelPreference",
        field: "model",
        value: model,
      }),
    );
  if (/(?:aracımı|arabamı|otomobilimi).*(?:değiştir|yenile)/iu.test(text))
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "currentVehicleContext",
        field: "currentVehicle",
        value: text.trim(),
        use: "NONE",
      }),
    );
  if (
    /(?:ehliyet(?:imi)?(?: bugün)? aldım|ilk arac[ıi]m[ıi])/u.test(
      text.toLocaleLowerCase("tr"),
    )
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "firstTimeDriverContext",
        field: "conversationContext",
        value: "FIRST_TIME_DRIVER",
        use: "NONE",
      }),
    );
  const normalizedEquipment = normalizedEquipments(text);
  const offeredEquipment = state.lastQuestionKey?.startsWith(
    "verifiedEquipment:",
  )
    ? state.lastQuestionKey.slice("verifiedEquipment:".length).split("|")
    : [];
  const resolvedEquipmentMatches = resolveEquipmentRequirement(text);
  const negatedEquipment = new Set([
    ...resolvedEquipmentMatches
      .filter((item) => item.polarity === "NEGATED" && item.featureCode)
      .map((item) => item.featureCode!),
    ...text
      .split(/[,.!?;]+/u)
      .filter((clause) =>
        /(?:olmasın|istemiyorum|gerek yok|önemli değil|sorun değil|vazgeçtim)/iu.test(
          clause,
        ),
      )
      .flatMap(normalizedEquipments),
  ]);
  const resolvedEquipment = /^(?:hepsi|tümü)(?:\s+olsun)?[.! ]*$/iu.test(
    text.trim(),
  )
    ? offeredEquipment
    : resolvedEquipmentMatches
        .filter((item) => item.polarity === "AFFIRMED" && item.featureCode)
        .map((item) => item.featureCode!);
  const equipments = [
    ...new Set(
      [
        ...normalizedEquipment,
        ...resolvedEquipment,
        /tavan ray/iu.test(text) ? "ROOF_RAILS" : undefined,
        /bagaj file/iu.test(text) ? "CARGO_NET" : undefined,
      ].filter(
        (value): value is string =>
          Boolean(value) && !negatedEquipment.has(value!),
      ),
    ),
  ];
  if (negatedEquipment.size) {
    for (const value of negatedEquipment) {
      const activeEquipment = [...ledger]
        .reverse()
        .find(
          (item) =>
            item.concept === "equipmentFeature" &&
            item.status === "ACTIVE" &&
            item.normalizedValue === value,
        );
      if (activeEquipment)
        ledger.push({
          ...activeEquipment,
          id: `${messageId}:clear:equipmentFeature:${value}`,
          sourceMessageId: messageId,
          sourceTurn: state.revision + 1,
          sourceSpan: whole(text),
          status: "CLEARED",
          decisionUse: "NONE",
          supersedes: activeEquipment.id,
        });
    }
  }
  for (const value of equipments)
    ledger = supersedeMatchingEquipment(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "equipmentFeature",
        field: "equipmentFeature",
        value,
      }),
    );
  const statedEquipment = !normalizedEquipment.length
    ? text
        .match(
          /donanım(?:da| olarak)\s+(.{2,80}?)(?=\s+(?:kesinlikle|mutlaka|şart|olmalı|olsun|istiyorum|bulunmalı)|[,.]|$)/iu,
        )?.[1]
        ?.trim()
    : undefined;
  if (statedEquipment)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "unmappedEquipmentRequirement",
        value: statedEquipment,
        use: "NONE",
      }),
    );
  const unmappedEquipment = [
    [
      /(?:12\s*v|12v).{0,24}(?:bagaj\s*)?(?:soket|priz)|(?:bagaj\s*)?(?:soket|priz).{0,24}(?:12\s*v|12v)/iu,
      "12V bagaj soketi",
    ],
    [/arka (?:klima )?havalandırma/iu, "arka koltuk havalandırması"],
    [/(?<!adaptif )(?<!adaptive )hız sabitleyici/iu, "hız sabitleyici"],
    [/hızlı şarj/iu, "hızlı şarj desteği"],
    [/ısı pompası/iu, "ısı pompası"],
    [/(?:çift|iki) sürgülü (?:yan )?kapı/iu, "çift sürgülü yan kapı"],
  ].flatMap(([pattern, label]) =>
    (pattern as RegExp).test(text) ? [label as string] : [],
  );
  if (unmappedEquipment.length)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "unmappedEquipmentRequirement",
        value: [...new Set(unmappedEquipment)].join(", "),
        use: "NONE",
      }),
    );
  if (
    /(?:bunlar|donanım|özellik|özel (?:bir )?(?:park )?donanımı).*(?:önemli değil|min(?:i|u)mum|gerek yok|şart(?:ım)? (?:değil|yok)|temel .* yeterli)/iu.test(text) ||
    (state.lastQuestionKey?.startsWith("verifiedEquipment:") === true &&
      /(?:seçenek(?:ler)?(?:den)?|bunlar(?:dan)?|gruptaki(?:ler)?).*(?:hiçbiri|hiç biri).*(?:şart|gerekli|vazgeçilmez|önemli).*(?:değil|yok)|(?:hiçbiri|hiç biri).*(?:şart|gerekli|vazgeçilmez|önemli).*(?:değil|yok)/iu.test(text))
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "equipmentNotImportant",
        value: "MINIMAL",
        use: "NONE",
      }),
    );
  if (/yakıt tasarrufu|kullanım gider|işletme gider/iu.test(text))
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "operatingCostPriority",
        field: "costPriority",
        value: "OPERATING_COST",
        use: "SOFT_RANK",
      }),
    );
  if (
    !fuel &&
    /(?:az yakan|yakıtı (?:adeta )?kokla|yakıt tasarrufu)/iu.test(text)
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "fuelDelegated",
        value: "EFFICIENCY_FIRST",
        use: "NONE",
        authority: "PRODUCT_POLICY",
      }),
    );
  const priorBudget = [...ledger]
    .reverse()
    .find(
      (item) =>
        (item.concept === "budgetMax" || item.concept === "budgetTarget") &&
        item.status === "ACTIVE",
    );
  const percentageIncrease = text.match(
    /bütçe(?:mi|yi)?(?:\s+limitini)?\s*%\s*(\d+(?:[.,]\d+)?)\s*(?:artır|arttir|yükselt)/iu,
  );
  const relativeBudget =
    priorBudget && percentageIncrease
      ? Math.round(
          Number(priorBudget.normalizedValue) *
            (1 + Number(percentageIncrease[1]!.replace(",", ".")) / 100),
        )
      : undefined;
  const allowsBareBudget =
    state.lastQuestionKey === "budget" ||
    state.lastQuestionKey === "exactBudget" ||
    /bütçe(?:mi|yi|m)?.*(?:çıkar|çıkart|artır|yükselt|yap|olsun|üst sınır|limit)/iu.test(
      text,
    );
  const budget = relativeBudget ?? budgetAmount(text, allowsBareBudget);
  if (
    budget !== undefined &&
    !clearBudget &&
    !budgetNotImportant &&
    (state.lastQuestionKey === "budget" ||
      state.lastQuestionKey === "exactBudget" ||
      /bütçe|fiyat|milyon|bin|₺|tl/iu.test(text))
  ) {
    const soft =
      /(?:yaklaşık|civarı|civarında|kabaca|aşağı yukarı|ortalama|esnek|sanırım|net değil|emin değil)/iu.test(
        text,
      );
    const concept = soft ? "budgetTarget" : "budgetMax";
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept,
        field: "price",
        value: budget,
        use: soft ? "SOFT_RANK" : "HARD_FILTER",
      }),
    );
  }
  if (
    state.lastQuestionKey === "brandModel" &&
    !/(?:bilmiyorum|fark etmez|sen seç|yok|istemiyorum|alternatif|öner|göster|seç|kamera|sensör|isofix|donanım|hız sabitle|kör nokta)/iu.test(
      text,
    ) &&
    text.trim().length > 1
  )
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "brandModelPreference",
        field: "brandModel",
        value: text.trim(),
        use: "SOFT_RANK",
      }),
    );
  const party =
    text.match(/(\d+)\s*kiş/iu) ??
    (state.lastQuestionKey === "passengerCapacity"
      ? text.match(/^\s*(\d{1,2})\s*$/u)
      : null);
  if (party)
    ledger = supersedeActive(
      ledger,
      event({
        state: { ...state, ledger },
        messageId,
        text,
        concept: "minimumSeats",
        field: "seats",
        value: Number(party[1]),
      }),
    );
  const weakSignals: [RegExp, string, string | undefined, string, string][] = [
    [
      /(?:dar sokak|paralel park|manevrası kolay|park etme çilesi)/iu,
      "urbanManeuverability",
      "bodyStyle",
      "HATCHBACK",
      "Dar sokaklarda manevra ve park kolaylığı için kompakt hatchback gövdeyi öne alalım mı?",
    ],
    [
      /bozuk yol/iu,
      "mixedRoadUse",
      "bodyStyle",
      "SUV",
      "Hem günlük kullanımda rahat hem de bozuk yollarda daha uygun olabilecek SUV/crossover araçları değerlendirelim mi?",
    ],
    [
      /bebeğimiz olacak|bebek/iu,
      "familyPracticality",
      undefined,
      "PRACTICALITY",
      "Bebek eşyaları için yükleme kolaylığı ve ferahlığı daha güçlü olan araçlara öncelik verelim mi?",
    ],
    [
      /uzun yolda yormasın/iu,
      "longDistanceComfort",
      undefined,
      "COMFORT",
      "Uzun yol rahatlığını seçimde belirleyici bir öncelik yapalım mı?",
    ],
    [
      /ekonomik|bütçemiz fazla değil/iu,
      "valueEconomy",
      undefined,
      "VALUE",
      "Satın alma fiyatını mı, kullanım giderlerini mi daha belirleyici tutalım?",
    ],
    [
      /\bperformans(?:lı| arab| otomobil| sürüş| öncel)/iu,
      "performance",
      undefined,
      "PERFORMANCE",
      "Canlı hızlanmayı seçimde belirleyici bir öncelik yapalım mı?",
    ],
    [
      /(?:bel fıtığı|koltuk.*(?:rahat|pamuk)|süspansiyon.*(?:konfor|çukur|sarsınt)|inip bin|binerken|inerken|tekerlekli sandalye)/iu,
      "ergonomicComfort",
      undefined,
      "ERGONOMIC_COMFORT",
      "Oturma, inip binme ve süspansiyon rahatlığını seçimde belirleyici tutalım mı?",
    ],
    [
      /(?:bisiklet|bebek arabası|puset|valiz|seyahat çanta|kamp (?:malzem|ekipman)|kocaman bagaj|dev bir bagaj|(?:pratik|kullanışlı|geniş).{0,24}bagaj|bagaj (?:hacmi|derinliği|bölümü)|bagaj.{0,24}(?:yükleme|geniş)|yatay (?:bir )?alan|yükleme kolay|araç(?:ın)? içinde (?:yat|uyu|konakla))/iu,
      "cargoPracticality",
      undefined,
      "CARGO_PRACTICALITY",
      "Yükleme kolaylığı ve kullanılabilir bagaj alanını seçimde belirleyici tutalım mı?",
    ],
    [
      /(?:karavan çek|çeki demir|yüksek tork)/iu,
      "towingNeed",
      undefined,
      "TOWING",
      "Karavan çekme uygunluğunu, yalnız katalogda doğrulanabilen çekme verileriyle, temel seçim ölçütü yapalım mı?",
    ],
    [
      /(?:sessiz|yalıtım|yolda yorm|bacak.*uyuş)/iu,
      "cabinComfort",
      undefined,
      "CABIN_COMFORT",
      "Kabin sessizliği ve uzun yol konforunu seçimde belirleyici tutalım mı?",
    ],
    [
      /(?:görüş açı|ön kaput.*bit|geri geri.*stres|park.*kork|yeni sürücü|acemili)/iu,
      "driverConfidence",
      undefined,
      "DRIVER_CONFIDENCE",
      "Görüş kolaylığı ve sürücü desteklerini seçimde belirleyici tutalım mı?",
    ],
    [
      /(?:sürüşü keyif|sürüş hissi.*dinamik|virajlarda|gaz pedal|yüzümde tebessüm|motorun.*ses|heyecan yaşat)/iu,
      "drivingEnjoyment",
      undefined,
      "DRIVING_ENJOYMENT",
      "Sürüş keyfini seçimde belirleyici bir öncelik yapalım mı?",
    ],
    [
      /(?:güvende|güvenli|hata.*tolere|yokuşta.*kaydır)/iu,
      "safetyConfidence",
      undefined,
      "SAFETY_CONFIDENCE",
      "Doğrulanabilir güvenlik ve sürücü desteklerini seçimde belirleyici tutalım mı?",
    ],
    [
      /(?:panoramik|cam tavan|sunroof|açılır tavan)/iu,
      "glassRoofPreference",
      "equipmentFeature",
      "PANORAMIC_GLASS_ROOF",
      "Panoramik veya açılır cam tavanı vazgeçilmez bir donanım olarak mı ele alalım?",
    ],
    [
      /(?:ambiyans aydınlat|uçak kokpiti|gece sürüşünde.*ışık)/iu,
      "cockpitAmbience",
      undefined,
      "COCKPIT_AMBIENCE",
      "Dijital kokpit ve ambiyans aydınlatmasını tasarım seçiminde öne alalım mı?",
    ],
    [
      /(?:şirin|sevimli|sempatik|tatlı görünümlü|retro görünümlü|dikkat çekici|dikkat çeken|karizma|karizmatik|dönüp.*bak|spor görünüş|farklı.*tasarım|zamansız.*tasarım)/iu,
      "distinctiveDesign",
      undefined,
      "DISTINCTIVE_DESIGN",
      "Şirin, sevimli veya karakterli görünümü seçimde belirleyici tutalım mı?",
    ],
    [
      /(?:az yakan|yakıt ibresi|yakıt cimrisi|koklayan bir araç)/iu,
      "fuelEconomy",
      undefined,
      "FUEL_ECONOMY",
      "Düşük enerji veya yakıt tüketimini seçimde temel öncelik yapalım mı?",
    ],
    [
      /(?:arkası geniş|diz mesafesi|arka koltuk.*geniş|uzun boylu.*biner)/iu,
      "rearSeatSpace",
      undefined,
      "REAR_SEAT_SPACE",
      "Arka koltuk genişliği ve diz mesafesini temel öncelik yapalım mı?",
    ],
    [
      /(?:altı vur|yüksek bir araç|yüksekte otur)/iu,
      "highRideHeight",
      "bodyStyle",
      "SUV",
      "Yüksek sürüş ve yerden yükseklik ihtiyacı için SUV/crossover gövdeyi öne alalım mı?",
    ],
    [
      /(?:sörf tahtası|kayak.*tavan|tavan.*kayak)/iu,
      "roofLoadLifestyle",
      undefined,
      "ROOF_LOAD",
      "Tavan taşıma uyumluluğunu seçimde önemli bir doğrulama ölçütü yapalım mı?",
    ],
    [
      /(?:ses sistemi|harman kardon|müziği son ses)/iu,
      "premiumAudio",
      undefined,
      "PREMIUM_AUDIO",
      "Doğrulanabilir premium ses sistemini seçimde belirleyici tutalım mı?",
    ],
    [
      /(?:e[- ]?segment)/iu,
      "marketSegment",
      undefined,
      "E_SEGMENT",
      "E-segmentte özellikle sedan gövdeyi mi hedefliyorsun?",
    ],
    [
      /(?:ortak kullan|ikimizin de|ikimizin.*rahat|orta yol bulalım)/iu,
      "sharedDriverEase",
      undefined,
      "SHARED_DRIVER_EASE",
      "İkinizin de kolay alışacağı, görüşü ve kumandaları rahat bir aracı temel öncelik yapalım mı?",
    ],
  ];
  if (pending) {
    const repeated = weakSignals.find(
      ([pattern, concept]) =>
        concept === pending?.concept && pattern.test(text),
    );
    const source = ledger.find((item) => item.id === pending?.eventId);
    if (repeated && source) {
      ledger.push(
        event({
          state: { ...state, ledger },
          messageId,
          text,
          concept: source.concept,
          field: source.field,
          value: pending.proposedValue,
          use: source.field ? "HARD_FILTER" : "SOFT_RANK",
          authority: "USER_CONFIRMED",
        }),
      );
      pending = undefined;
    }
  }
  if (!pending) {
    const priority = [
      "rearSeatSpace",
      "cargoPracticality",
      "cabinComfort",
      "ergonomicComfort",
      "sharedDriverEase",
      "driverConfidence",
      "safetyConfidence",
      "glassRoofPreference",
      "cockpitAmbience",
      "distinctiveDesign",
      "drivingEnjoyment",
      "fuelEconomy",
      "premiumAudio",
      "highRideHeight",
      "roofLoadLifestyle",
      "marketSegment",
      "towingNeed",
      "longDistanceComfort",
      "mixedRoadUse",
      "familyPracticality",
      "valueEconomy",
      "performance",
    ];
    const matched = weakSignals
      .filter(
        ([pattern, concept]) =>
          pattern.test(text) &&
          !(resolvedValueEconomy && concept === "valueEconomy"),
      )
      .sort((a, b) => priority.indexOf(a[1]) - priority.indexOf(b[1]));
    for (const [, concept, field, value, question] of matched) {
      if (field === "equipmentFeature" && normalizedEquipment.length) continue;
      if (
        ledger.some(
          (item) => item.concept === concept && item.status === "ACTIVE",
        )
      )
        continue;
      const weak = event({
        state: { ...state, ledger },
        messageId,
        text,
        concept,
        field,
        value,
        weak: true,
      });
      ledger.push(weak);
      pending ??= { eventId: weak.id, concept, proposedValue: value, question };
    }
  }
  return { ledger, pending };
}

export function applyCatalogEntitySignals(
  state: V3ConversationState,
  ledger: readonly PreferenceEvent[],
  messageId: string,
  text: string,
  signals: {
    readonly brands: readonly string[];
    readonly models: readonly string[];
  },
): readonly PreferenceEvent[] {
  let next = [...ledger];
  const tentative = /(?:olabilir|olsa da olur|örneğin|gibi|benzer|muadil|alternatif)/iu.test(text);
  const rejected = /(?:istemiyorum|olmasın|hariç|dışında|sevmiyorum|tercih etmiyorum)/iu.test(text);
  if (signals.brands.length)
    next = supersedeActive(
      next,
      event({
        state: { ...state, ledger: next },
        messageId,
        text,
        concept: rejected ? "excludedBrand" : "brandPreference",
        field: rejected ? "excludedBrand" : "brand",
        value:
          signals.brands.length === 1 ? signals.brands[0]! : signals.brands,
        use: tentative ? "SOFT_RANK" : "HARD_FILTER",
      }),
    );
  if (
    signals.models.length &&
    !/(?:aracımı|arabamı|otomobilimi).*(?:değiştir|yenile)/iu.test(text)
  )
    next = supersedeActive(
      next,
      event({
        state: { ...state, ledger: next },
        messageId,
        text,
        concept: rejected ? "excludedModel" : "modelPreference",
        field: rejected ? "excludedModel" : "model",
        value:
          signals.models.length === 1 ? signals.models[0]! : signals.models,
        use: tentative ? "SOFT_RANK" : "HARD_FILTER",
      }),
    );
  return next;
}

export function applySemanticContextSignals(
  state: V3ConversationState,
  ledger: readonly PreferenceEvent[],
  messageId: string,
  signals: readonly V3SemanticContextSignal[],
): readonly PreferenceEvent[] {
  const conceptByKind: Readonly<
    Record<V3SemanticContextSignal["kind"], string>
  > = {
    FIRST_TIME_DRIVER: "firstTimeDriverContext",
    PURCHASE_RESEARCH: "purchaseResearchContext",
    CURRENT_VEHICLE_OWNER: "currentVehicleContext",
    NO_CURRENT_VEHICLE: "noCurrentVehicleContext",
    NEW_PARENT_CONTEXT: "newParentContext",
  };
  const next = [...ledger];
  for (const signal of signals) {
    const concept = conceptByKind[signal.kind];
    if (
      next.some(
        (item) =>
          item.concept === concept &&
          item.status === "ACTIVE" &&
          item.sourceMessageId === messageId,
      )
    )
      continue;
    next.push({
      id: `${messageId}:semantic:${signal.kind}:${next.length}`,
      sourceMessageId: messageId,
      sourceTurn: state.revision + 1,
      sourceSpan: signal.sourceSpan,
      concept,
      field: "conversationContext",
      normalizedValue: signal.kind,
      strength: "UNCONFIRMED_HYPOTHESIS",
      status: "ACTIVE",
      decisionUse: "NONE",
      confidence: signal.confidence,
      authority: "MODEL_INFERENCE",
      confirmationRequired: false,
    });
  }
  return next;
}

export function applySemanticPreferenceSignals(
  state: V3ConversationState,
  ledger: readonly PreferenceEvent[],
  messageId: string,
  signals: readonly V3SemanticPreferenceSignal[],
): readonly PreferenceEvent[] {
  let next = [...ledger];
  for (const signal of signals) {
    const rejectedOrQuotedUsage =
      /(?:nereden çıktı|neden çıktı|ne alaka|demedim|söylemedim|istemiyorum|değil)/iu.test(
        signal.sourceSpan.text,
      );
    if (
      !signal.explicit ||
      signal.confidence < 0.75 ||
      rejectedOrQuotedUsage ||
      latestActiveLedgerEvent(next, signal.concept)?.sourceMessageId ===
        messageId
    )
      continue;
    next = supersedeActive(next, {
      id: `${messageId}:semantic:${signal.concept}:${next.length}`,
      sourceMessageId: messageId,
      sourceTurn: state.revision + 1,
      sourceSpan: signal.sourceSpan,
      concept: signal.concept,
      field: "usagePurpose",
      normalizedValue: signal.normalizedValue,
      strength: "EXPLICIT_STRONG",
      status: "ACTIVE",
      decisionUse: "HARD_FILTER",
      confidence: signal.confidence,
      authority: "USER_EXPLICIT",
      confirmationRequired: false,
    });
  }
  return next;
}

export function activeDecisionPreferences(ledger: readonly PreferenceEvent[]) {
  const terminal = new Map<string, PreferenceEvent>();
  const keyOf = (item: PreferenceEvent) =>
    item.concept === "equipmentFeature"
      ? `${item.concept}:${String(item.normalizedValue)}`
      : item.concept;
  for (const item of ledger)
    if (item.status === "ACTIVE") terminal.set(keyOf(item), item);
    else if (item.status === "CLEARED" || item.status === "REJECTED")
      terminal.delete(keyOf(item));
  return [...terminal.values()].filter(
    (item) =>
      ["EXPLICIT_HARD", "EXPLICIT_STRONG", "CONFIRMED_STRONG"].includes(
        item.strength,
      ) && ["HARD_FILTER", "SOFT_RANK"].includes(item.decisionUse),
  );
}

export function latestActiveLedgerEvent(
  ledger: readonly PreferenceEvent[],
  concept: string,
) {
  const terminal = new Map<string, PreferenceEvent>();
  for (const item of ledger)
    if (item.status === "ACTIVE") terminal.set(item.concept, item);
    else if (["CLEARED", "REJECTED"].includes(item.status))
      terminal.delete(item.concept);
  return terminal.get(concept);
}
