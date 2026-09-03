import type { AuthoritativeSemanticPlan, InterpretationResult, ProposedConstraintMutation, ProposedPersonaMutation, ProviderActAuthority, UserAct } from "./types";
import { normalizeFuelInterpretation } from "./policy";
import { detectHumanContext } from "./humanContextPolicy";

const BODY_STYLES = ["Sedan", "Hatchback", "SUV", "Coupe", "Convertible", "Crossover", "Liftback", "Station Wagon", "Pickup", "Panel Van", "Passenger Van", "MPV"] as const;
const BODY_STYLE_ALIASES: readonly (readonly [RegExp, string])[] = [
  [/\b(?:pick[ -]?up|pikap)(?:'?(?:a|e|ı|i|u|ü|ya|ye))?\b/iu, "Pickup"],
  [/\b(?:panel[ -]?van|kapalı kasa ticari)(?:'?(?:a|e|ı|i|u|ü|ya|ye))?\b/iu, "Panel Van"],
  [/(?<!\p{L})(?:yolcu vanı|minibüs)(?:'?(?:a|e|ı|i|u|ü|ya|ye))?(?!\p{L})/iu, "Passenger Van"],
  [/\b(?:station[ -]?wagon|istasyon vagon)(?:'?(?:a|e|ı|i|u|ü|ya|ye))?\b/iu, "Station Wagon"],
  [/(?<!\p{L})(?:üstü açılır|cabrio)(?:'?(?:a|e|ı|i|u|ü|ya|ye))?(?!\p{L})/iu, "Convertible"],
  [/(?<!\p{L})şasi kabin(?:'?(?:a|e|ı|i|u|ü|ya|ye))?(?!\p{L})/iu, "Chassis Cab"],
];
export function detectedBodyStyles(text: string): readonly string[] {
  const semanticTexts = [text.normalize("NFKC").toLocaleLowerCase("tr-TR"), text.normalize("NFKD").toLocaleLowerCase("en-US").replace(/[\u0300-\u036f]/gu, "")];
  return Object.freeze([...new Set([
    ...BODY_STYLES.filter((style) => semanticTexts.some((value) => new RegExp(`\\b${style.replace(" ", "[ -]?")}(?:'?(?:a|e|ya|ye))?\\b`, "iu").test(value))),
    ...BODY_STYLE_ALIASES.filter(([pattern]) => semanticTexts.some((value) => pattern.test(value))).map(([, style]) => style),
  ])]);
}
export function isControlledBodyStyleVehicleRequest(text: string): boolean {
  if (detectedBodyStyles(text).length !== 1 || /\?/u.test(text)) return false;
  return /^(?:(?:selam|merhaba)(?:\s+(?:dostum|arkadaşım))?[,.]?\s+)?(?:bir\s+)?[\p{L} -]+?(?:\s+bir)?\s+(?:araç|araba|otomobil)\s+(?:arıyorum|bakıyorum|istiyorum)[.!]*$/iu.test(text.trim());
}
export function isControlledCatalogAttributeAvailabilityRequest(text: string): boolean {
  if (!/(?:var mı|mevcut mu)[?\s]*$/iu.test(text.trim())) return false;
  return detectedBodyStyles(text).length > 0 || normalizeFuelInterpretation(text) !== null;
}
export function detectControlledUsageScenario(text: string, openMaterialQuestionField?: string): string | undefined {
  const semanticText = text.normalize("NFKC").toLocaleLowerCase("tr-TR");
  return /şehir içi (?:mal|kargo|koli) dağıt|mal dağıt|koli dağıt|\bdağıtım\b/iu.test(text) ? "URBAN_DELIVERY"
    : /yolcu taşı|servis|transfer/iu.test(text) ? "PASSENGER_TRANSPORT"
    : /genel yük|yük taşı|ticari yük/iu.test(text) ? "GENERAL_CARGO"
    : /ciddi arazi|zorlu arazi|arazi arac[ıi]|off[- ]?road/iu.test(text) ? "SERIOUS_OFF_ROAD"
    : /çamur|karlı? yol|kar(?:da|lı)|mud/iu.test(text) ? "MUD_SNOW"
    : /bozuk yol|köy(?:de| yolu?| yolunda| kullanım)|kırsal(?:da| kullanım)|bağ[ -]?bahçe/iu.test(text) ? "ROUGH_ROAD"
    : /uzun yol|şehirler ?arası/iu.test(text) ? "LONG_DISTANCE"
    : /aile|çocuk(?:lar)?la/iu.test(text) ? "FAMILY"
    : openMaterialQuestionField === "usageScenario" && /^(?:günlük|gündelik)(?:\s+.{1,60})?[.!]?$/iu.test(text) ? "URBAN_DAILY"
    : /günlük (?:şehir içi |şehir dışı )?kullanım|günlük kullan|her gün kullan|işe gidip gel|gündelik işler|günlük şehir içi|şehir içinde (?:günlük )?kullan|şehir içi (?:araç|kullanım)|şehir içinde/u.test(semanticText) ? "URBAN_DAILY"
    : undefined;
}
export function isControlledUsageRecommendationRequest(text: string): boolean {
  return Boolean(detectControlledUsageScenario(text)) && (
    /(?:hangi|ne)\s+(?:aracı|arabayı|otomobili).*öner|(?:araç|araba|otomobil).*öner|ne önerirsin|tavsiye/iu.test(text)
    || /(?:araç|aracı|araba|arabayı|otomobil|otomobili)(?:\s+bakıyorum|\s+arıyorum|\s+istiyorum|\s+lazım|\s+gerekiyor)/iu.test(text)
    || /(?:aracımı|arabamı|otomobilimi).{0,60}(?:yenilemek|değiştirmek|yenileyeceğim|değiştireceğim)/iu.test(text)
  );
}
export function isControlledSocialMessage(text: string): boolean {
  return /^(?:(?:merhaba|selam|günaydın|iyi (?:günler|akşamlar))(?:[, ]+(?:nasılsın|naber|ne haber|iyi misin|dostum|arkadaşım))*|nasılsın|naber|ne haber|iyi misin)[?.!]*$/iu.test(text.trim());
}
export function isControlledTechnicalInformationRequest(text: string): boolean {
  const controlledTopic = /elektrik(?:li)?|hibrit|hibrid|benzinli|dizel|yakıt|şarj|menzil|batarya|çekiş|şanzıman|motor gücü|\bkw\b/iu.test(text);
  const informationRequest = /mantıklı mı|ne düşünüyorsun|ne düşünürsün|önerir misin|nasıl çalışır|nasıl şarj|bilgi verir misin|anlatır mısın|açıklar mısın|önemli mi|nedir|ne demek/iu.test(text);
  return controlledTopic && informationRequest;
}
export function isControlledVehicleSelectionStatement(text: string): boolean {
  const descriptor = "(?:elektrikli|hibrit|hibrid|benzinli|dizel|otomatik|manuel|dört çeker|4x4|awd|önden çekiş|fwd|arkadan itiş|arkadan çekiş|rwd|sedan|hatchback|suv|crossover|coupe|liftback|mpv|pikap|pick[ -]?up|panel[ -]?van|yolcu vanı)";
  return new RegExp(`^(?:bir\\s+)?(?:${descriptor}\\s+)*(?:bir\\s+)?(?:araç|araba|otomobil)\\s+(?:almak|arıyorum|bakıyorum|istiyorum)(?:\\s+istiyorum)?[.!]*$`, "iu").test(text.trim());
}
export function isControlledOpenEndedVehicleRequest(text: string): boolean {
  const vehiclePurchaseIntent = /\b(?:araba|araç|otomobil)\s+(?:almak istiyorum|alacağım|almam (?:gerekiyor|lazım)|arıyorum|bakıyorum)\b/iu.test(text);
  const deliberativeChoiceIntent = /\bhangi\s+(?:aracı|arabayı|otomobili)\s+(?:alsam|seçsem|tercih etsem)\b/iu.test(text);
  const decisionSupportContext = /(?:nereden başlayacağımı? (?:bilmiyorum|bilemiyorum)|nasıl başlayacağımı? (?:bilmiyorum|bilemiyorum)|karar veremiyorum|kararsızım|çok fazla seçenek var|seçenekler arasında kaldım|yardım(?:cı)? ol|yardım (?:et|eder))/iu.test(text);
  return (vehiclePurchaseIntent || deliberativeChoiceIntent) && decisionSupportContext;
}
const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];
const hasField = (items: readonly ProposedConstraintMutation[], fieldId: ProposedConstraintMutation["fieldId"]) => items.some((item) => item.fieldId === fieldId);
const ADVISORY_ACTS = new Set<UserAct>(["USAGE_STATEMENT", "PREFERENCE_STATEMENT", "HARD_REQUIREMENT", "BUDGET_STATEMENT", "MODEL_LOOKUP_REQUEST", "MODEL_COMPARISON_REQUEST", "MODEL_SUITABILITY_REQUEST", "ALTERNATIVE_REQUEST", "RECOMMENDATION_REQUEST", "TECHNICAL_EXPLANATION_REQUEST", "CORRECTION", "CANDIDATE_REJECTION", "OFFER_ACCEPTANCE", "OFFER_DECLINE", "QUESTION_ANSWER", "DONT_KNOW", "DECLINE_TO_ANSWER"]);
const SAFETY_ACTS = new Set<UserAct>(["ABUSE"]);
export const classifyProviderActAuthority = (act: UserAct): ProviderActAuthority => SAFETY_ACTS.has(act) ? "SAFETY_SIGNAL" : ADVISORY_ACTS.has(act) ? "ADVISORY" : "STRUCTURAL";
const mutation = (fieldId: ProposedConstraintMutation["fieldId"], normalizedValue: ProposedConstraintMutation["normalizedValue"], sourceSpan: string, operation: ProposedConstraintMutation["operation"] = "ADD", forceHard = false): ProposedConstraintMutation => ({ operation, fieldId, normalizedValue, explicitness: forceHard ? "EXPLICIT_REQUIREMENT" : "EXPLICIT_PREFERENCE", confidence: 1, sourceSpan, ...(operation === "CORRECT" ? { supersedesFieldId: fieldId } : {}) });

function money(text: string): number | undefined {
  const wordAmounts: Readonly<Record<string, number>> = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10 };
  const normalizedText = text.toLocaleLowerCase("tr-TR");
  const wordMatch = normalizedText.match(/\b(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on)\s+milyon\b/u);
  if (wordMatch) return wordAmounts[wordMatch[1]!]! * 1_000_000;
  const match = normalizedText.match(/(\d{1,3}(?:[.]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(milyon|mn|bin)?/u); if (!match) return undefined;
  const numericText = /\d{1,3}(?:[.]\d{3}){2,}/u.test(match[1]!) || (/\d{1,3}[.]\d{3}/u.test(match[1]!) && !match[2])
    ? match[1]!.replaceAll(".", "").replace(",", ".")
    : match[1]!.replace(",", ".");
  const raw = Number(numericText); if (!Number.isFinite(raw) || raw <= 0) return undefined;
  return Math.round(raw * (match[2]?.toLocaleLowerCase("tr-TR") === "bin" ? 1_000 : match[2] ? 1_000_000 : 1));
}

function budgetRange(text: string): { readonly minimum: number; readonly maximum: number } | undefined {
  const match = text.toLocaleLowerCase("tr-TR").match(/\b(\d+(?:[.,]\d+)?)\s*(milyon|mn|bin)?\s*(?:[-–]|ile)\s*(\d+(?:[.,]\d+)?)\s*(milyon|mn|bin)\b/u);
  if (!match) return undefined;
  const multiplier = (unit: string | undefined) => unit === "bin" ? 1_000 : unit ? 1_000_000 : 1;
  const trailingUnit = match[4];
  const minimum = Number(match[1]!.replace(",", ".")) * multiplier(match[2] ?? trailingUnit);
  const maximum = Number(match[3]!.replace(",", ".")) * multiplier(trailingUnit);
  return Number.isFinite(minimum) && Number.isFinite(maximum) && minimum > 0 && maximum >= minimum ? { minimum: Math.round(minimum), maximum: Math.round(maximum) } : undefined;
}

function personaTraits(text: string): ProposedPersonaMutation["traits"] {
  const words = new Set(text.normalize("NFKC").toLocaleLowerCase("tr-TR").split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  const traits: ProposedPersonaMutation["traits"][number][] = [];
  if (["premium", "prestijli", "ağırbaşlı"].some((word) => words.has(word))) traits.push("PRESTIGE");
  if (["şık", "tasarım", "zarif"].some((word) => words.has(word)) || /dikkat\s+çekici/iu.test(text)) traits.push("DESIGN");
  if (["sportif", "dinamik", "erkeksi"].some((word) => words.has(word))) traits.push("DRIVING_ENGAGEMENT");
  if (["teknolojik", "fütüristik"].some((word) => words.has(word))) traits.push("TECHNOLOGY");
  if (["gösterişsiz", "sade", "minimalist"].some((word) => words.has(word))) traits.push("MINIMALISM");
  if (words.has("maceracı") || /macera\s+ruh(?:u|lu)/iu.test(text)) traits.push("ADVENTURE");
  if (/ikinci el|değer kaybet|değerini koru/iu.test(text)) traits.push("VALUE");
  if (/(?:arkadaş|partner|eş|sevgili).*(?:etkile|beğen)|dikkat çek/iu.test(text)) traits.push("DESIGN", "PRESTIGE");
  return unique(traits);
}

export function enforceInterpretationSemanticCompleteness(input: { readonly result: InterpretationResult; readonly userText: string; readonly activeFieldIds: readonly string[]; readonly openMaterialQuestionField?: string; readonly revealedCandidateReferences?: readonly string[] }): InterpretationResult {
  const text = input.userText.trim();
  const semanticText = text.normalize("NFKC").toLocaleLowerCase("tr-TR");
  const catalogAttributeAvailabilityQuestion = isControlledCatalogAttributeAvailabilityRequest(text);
  const naturalConsent = /^(?:evet(?:[, ]+(?:göster|paylaş)(?: bakalım)?)?|göster(?: bakalım)?|paylaş(?: bakalım)?|görelim|hadi görelim|hadi göster|olur|tamam|bakalım|önerini görmek isterim|önerileri aç|seçenekleri göster|devam et(?: öyleyse)?|edelim)[.!]?$/iu;
  if (naturalConsent.test(text)) {
    // A short confirmation has no semantic value by itself. Offer acceptance is
    // bound earlier to a verified active offer; an open material question needs
    // an explicit answer instead of silently treating “tamam” as consent.
    if (input.openMaterialQuestionField) return Object.freeze({ ...input.result, acts: Object.freeze([]), constraintMutations: Object.freeze([]), budgetMutations: Object.freeze([]), modelReferences: Object.freeze([]), personaMutations: Object.freeze([]), candidateRejection: undefined, corrections: Object.freeze([]), ambiguities: Object.freeze([{ code: "UNBOUND_SHORT_CONFIRMATION", sourceSpan: text }]) });
    const acts: UserAct[] = ["OFFER_ACCEPTANCE"];
    return Object.freeze({ ...input.result, acts: Object.freeze(acts), constraintMutations: Object.freeze([]), budgetMutations: Object.freeze([]), modelReferences: Object.freeze([]), personaMutations: Object.freeze([]), candidateRejection: undefined, corrections: Object.freeze([]) });
  }
  if (/^(?:hayır|istemiyorum|önce biraz daha konuşalım)[.!]?$/iu.test(text)) { const acts: UserAct[] = ["OFFER_DECLINE"]; return Object.freeze({ ...input.result, acts: Object.freeze(acts), constraintMutations: Object.freeze([]), budgetMutations: Object.freeze([]), modelReferences: Object.freeze([]), personaMutations: Object.freeze([]), candidateRejection: undefined, corrections: Object.freeze([]) }); }
  const verifiedAbuse = /(salak|aptal|gerizek[aâ]lı|mal mısın|lanet|berbatsın)/iu.test(text); const socialHumor = /(şaka|😂|😄|🤣)/u.test(text);
  const negativeFeedback = /(?:hiçbir şey|hiç bir şey|beni)\s+anlamıyorsun|anlamadın|yardımcı olmuyorsun|aynı şeyi tekrar|cevap vermiyorsun/iu.test(text);
  const conversationalRepair = /(?:nasılsın diye sormadım|sana güvenmiyorum|hangi tercih\??)/iu.test(text);
  const acts: UserAct[] = input.result.acts.filter((act) => !["HARD_REQUIREMENT", "PREFERENCE_STATEMENT", "CORRECTION", "BUDGET_STATEMENT", "OFF_TOPIC", "ABUSE"].includes(act));
  if (verifiedAbuse) acts.push("ABUSE"); if (input.result.offTopicSignal?.detected && !socialHumor) acts.push("OFF_TOPIC"); if (socialHumor && !acts.includes("SOCIAL_MESSAGE")) acts.push("SOCIAL_MESSAGE");
  if (negativeFeedback && !acts.includes("NEGATIVE_FEEDBACK")) acts.push("NEGATIVE_FEEDBACK");
  if (conversationalRepair && !acts.includes("SOCIAL_MESSAGE")) acts.push("SOCIAL_MESSAGE");
  const criticalFields = new Set(["usageScenario", "relativePriceSegment", "runningCostPreference", "fuelType", "transmission", "bodyStyle", "drivenWheels", "seats", "usageArchitecture", "rearSeatPreference"]);
  const constraints = input.result.constraintMutations.filter((item) => !criticalFields.has(item.fieldId)); const budgets = [] as typeof input.result.budgetMutations[number][]; const personas = [] as typeof input.result.personaMutations[number][]; const references = [...input.result.modelReferences];
  const directAnswerRequests = [...input.result.directAnswerRequests];
  const addAct = (act: UserAct) => { if (!acts.includes(act)) acts.push(act); };
  const enforceConstraint = (value: ProposedConstraintMutation) => { const index = constraints.findIndex((item) => item.fieldId === value.fieldId); if (index >= 0) constraints[index] = value; else constraints.push(value); };

  const shortIndifference = /^(?:fark etmez|önemli değil|tercihim yok)[.!]?$/iu.test(text);
  const shortUnknown = /^(?:fikrim yok|bilmiyorum|emin değilim)[.!]?$/iu.test(text);
  if (input.openMaterialQuestionField && (shortIndifference || shortUnknown)) {
    if (input.openMaterialQuestionField === "budget") {
      budgets.push({ operation: "EXCLUDE_FROM_DECISION", field: "BUDGET_UNKNOWN", sourceSpan: text });
    } else {
      enforceConstraint(mutation(input.openMaterialQuestionField as ProposedConstraintMutation["fieldId"], null, text, "DECLINE"));
    }
    addAct(shortUnknown ? "DONT_KNOW" : "DECLINE_TO_ANSWER");
    addAct("QUESTION_ANSWER");
  }

  const usageScenario = detectControlledUsageScenario(text, input.openMaterialQuestionField);
  if (usageScenario && !hasField(constraints, "usageScenario")) {
    constraints.push(mutation("usageScenario", usageScenario, text, input.activeFieldIds.includes("usageScenario") ? "CORRECT" : "ADD"));
    addAct("USAGE_STATEMENT");
  }

  const relativePriceSegment = /(?:ucuz\s+(?:bir\s+)?(?:araç|araba|otomobil)|en\s+ucuzlardan|(?:daha\s+)?uygun\s+fiyatlı|(?:daha\s+)?ucuz|daha\s+hesaplı|düşük\s+fiyatlı|düşük\s+bütçeli|satın\s+alma\s+fiyatı\s+erişilebilir)/u.test(semanticText) ? "LOWEST_20"
    : /(?:ekonomik\s+fiyatlı|fiyatı\s+ekonomik|fiyat\s+açısından\s+ekonomik)/u.test(semanticText) ? "VALUE_20_40"
    : /(?:orta\s+fiyat\s+grubunda|fiyat\s+olarak\s+orta\s+seviye)/u.test(semanticText) ? "MID_40_60"
    : /(?:üst\s+fiyat\s+grubunda|fiyat\s+olarak\s+üst\s+seviyede)/u.test(semanticText) ? "UPPER_60_80"
    : /(?:premium\s+fiyat\s+grubunda|fiyat\s+olarak\s+en\s+üst\s+grupta)/u.test(semanticText) ? "HIGHEST_80_100" : undefined;
  if (relativePriceSegment) { enforceConstraint(mutation("relativePriceSegment", relativePriceSegment, text, input.activeFieldIds.includes("relativePriceSegment") ? "CORRECT" : "ADD")); addAct("PREFERENCE_STATEMENT"); }

  const answersEconomicMeaning = input.openMaterialQuestionField === "relativePriceMeaning";
  const bothEconomicMeanings = answersEconomicMeaning && /ikisi\s+de\s+önemli/u.test(semanticText);
  const purchasePriceCorrection = /satın\s+alma\s+fiyatını\s+kastediyordum/iu.test(text);
  const purchasePriceAnswer = (answersEconomicMeaning && /satın\s+alma\s+fiyatı\s+erişilebilir/iu.test(text)) || purchasePriceCorrection || bothEconomicMeanings;
  const runningCostAnswer = answersEconomicMeaning && (/kullanım\s+ve\s+yakıt\s+maliyeti\s+düşük/iu.test(text) || bothEconomicMeanings);
  if (purchasePriceAnswer && !relativePriceSegment) {
    enforceConstraint(mutation("relativePriceSegment", "LOWEST_20", text, input.activeFieldIds.includes("relativePriceSegment") ? "CORRECT" : "ADD"));
    if (purchasePriceCorrection && input.activeFieldIds.includes("runningCostPreference")) enforceConstraint(mutation("runningCostPreference", null, text, "CLEAR"));
    addAct(input.activeFieldIds.includes("relativePriceSegment") ? "CORRECTION" : "PREFERENCE_STATEMENT");
  }
  if (runningCostAnswer) {
    enforceConstraint(mutation("runningCostPreference", "LOW_RUNNING_COST", text, input.activeFieldIds.includes("runningCostPreference") ? "CORRECT" : "ADD"));
    addAct(input.activeFieldIds.includes("runningCostPreference") ? "CORRECTION" : "PREFERENCE_STATEMENT");
  }

  const noElectric = /elektrikli\s+(?:istemiyorum|olmasın)/iu.test(text); const noHybrid = /hibrit\s+(?:istemiyorum|olmasın)/iu.test(text);
  const remainingFuelText = text.replace(/elektrikli\s+(?:istemiyorum|olmasın)/giu, "").replace(/hibrit\s+(?:istemiyorum|olmasın)/giu, "");
  const informationalFuelMention = /(?:nasıl\s+şarj|şarj\s+ol|bu konuda|bilgi verir|ne düşünüyorsun|ne düşünürsün|açıklar mısın|anlatır mısın|tam olarak nasıl|menzil|şarj etmek)/iu.test(text);
  const positiveFuel = informationalFuelMention ? null : normalizeFuelInterpretation(remainingFuelText);
  const fuel = positiveFuel ?? (noElectric ? { operator: "EXCLUDES" as const, value: ["BEV"] } : noHybrid ? { operator: "EXCLUDES" as const, value: ["MHEV", "HEV", "PHEV"] } : null);
  if (/yakıt\s+(?:fark etmez|önemli değil)/iu.test(text)) { enforceConstraint(mutation("fuelType", null, text, input.activeFieldIds.includes("fuelType") ? "CLEAR" : "DECLINE")); addAct(input.activeFieldIds.includes("fuelType") ? "CORRECTION" : "DECLINE_TO_ANSWER"); }
  else if (fuel) { const fuelHard = catalogAttributeAvailabilityQuestion || input.openMaterialQuestionField === "fuelType" || /(?:kesinlikle|mutlaka)\s+(?:hibrit|elektrikli|benzinli|dizel)|(?:hibrit|elektrikli|benzinli|dizel)(?:\s+dışında)?\s+(?:olmalı|şart|olmazsa olmaz|istemiyorum|olmasın)/iu.test(text); enforceConstraint(mutation("fuelType", fuel, text, input.activeFieldIds.includes("fuelType") ? "CORRECT" : "ADD", fuelHard)); addAct(input.activeFieldIds.includes("fuelType") ? "CORRECTION" : fuelHard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT"); }

  const transmissionMentions = [...text.matchAll(/\b(otomati(?:k|ğe)|manuel(?:e)?)\b/giu)];
  const transmissionToken = transmissionMentions.at(-1)?.[1];
  const transmission = transmissionToken ? (/manuel/iu.test(transmissionToken) ? "MANUAL" : "AUTOMATIC") : undefined;
  if (transmission) { const transmissionHard = input.openMaterialQuestionField === "transmission" || /(?:kesinlikle|mutlaka)\s+(?:otomatik|manuel)|(?:otomatik|manuel)\s+(?:olmalı|şart|olmazsa olmaz)|(?:otomatik|manuel)\s+dışında\s+istemiyorum/iu.test(text); const operation = input.activeFieldIds.includes("transmission") ? "CORRECT" : "ADD"; enforceConstraint({ ...mutation("transmission", { operator: "EQUALS", value: transmission }, text, operation), explicitness: transmissionHard ? "EXPLICIT_REQUIREMENT" : "EXPLICIT_PREFERENCE" }); addAct(operation === "CORRECT" ? "CORRECTION" : transmissionHard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT"); }

  // Keep natural-language spelling variants in one catalog-wide body-style
  // lexicon. These are semantic aliases, not one-off conversation repairs.
  const mentionedBodies = detectedBodyStyles(text);
  if (/gövde(?:\s+tipi)?\s+(?:fark etmez|önemli değil)/iu.test(text)) { enforceConstraint(mutation("bodyStyle", null, text, input.activeFieldIds.includes("bodyStyle") ? "CLEAR" : "DECLINE")); addAct(input.activeFieldIds.includes("bodyStyle") ? "CORRECTION" : "DECLINE_TO_ANSWER"); }
  const replacementTail = text.match(/\byerine\s+(.+)$/iu)?.[1];
  const replacementBodies = replacementTail ? detectedBodyStyles(replacementTail) : [];
  const affirmativeBodies = (replacementBodies.length ? replacementBodies : mentionedBodies).filter((style) => !new RegExp(`${style.replace(" ", "[ -]?")}(?:'?(?:den|dan))?\\s+(?:değil|demedim|istemi(?:yor|yorum)|vazgeç)`, "iu").test(text));
  const affirmativeBody = affirmativeBodies.at(-1);
  if (affirmativeBody) {
    const correctionMeaning = /\b(dedim|demedim|düzelt|yerine|artık|vazgeç)\b/iu.test(text); const hasActiveBody = input.activeFieldIds.includes("bodyStyle");
    const bodyHard = catalogAttributeAvailabilityQuestion || input.openMaterialQuestionField === "bodyStyle" || correctionMeaning || new RegExp(`(?:${affirmativeBody}.*(?:şart|olmazsa olmaz|mutlaka)|(?:kesinlikle|mutlaka).*${affirmativeBody})`, "iu").test(text);
    const bodyValue = affirmativeBodies.length === 1 ? { operator: "EQUALS", value: affirmativeBody } : { operator: "ONE_OF", value: affirmativeBodies };
    enforceConstraint({ ...mutation("bodyStyle", bodyValue, text, hasActiveBody ? "CORRECT" : "ADD", bodyHard), explicitness: bodyHard ? "EXPLICIT_REQUIREMENT" : "EXPLICIT_PREFERENCE" });
    addAct(correctionMeaning || hasActiveBody ? "CORRECTION" : bodyHard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT");
  }

  const seatRangeMatch = text.match(/\b(\d+)\s*[-–]\s*(\d+)\s*(?:kişilik|koltuk)\b/iu);
  const seatMatch = text.match(/\b(?:en az\s+)?(\d+|dört|beş|altı|yedi|sekiz|dokuz)\s+(?:kişilik|koltuk(?:\s+kapasitesine\s+sahip)?)\b/iu);
  if (seatRangeMatch || seatMatch) {
    const seatWords: Readonly<Record<string, number>> = { dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9 };
    const token = (seatRangeMatch?.[1] ?? seatMatch?.[1])!.toLocaleLowerCase("tr-TR"); const count = Number(token) || seatWords[token];
    if (count) {
      const authoritativeAnswer = input.openMaterialQuestionField === "seats";
      const hard = authoritativeAnswer || input.activeFieldIds.includes("seats") || /şart|gerekli|olmazsa olmaz|en az|lazım|koltuk(?: kapasitesine)? sahip olsun/iu.test(text);
      enforceConstraint(mutation("seats", { operator: authoritativeAnswer || seatRangeMatch || /en az/iu.test(text) ? "MINIMUM" : "EQUALS", value: count, unit: "COUNT" }, text, input.activeFieldIds.includes("seats") ? "CORRECT" : "ADD", hard));
      addAct(hard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT");
    }
  }
  const controlledNumericFields = Object.freeze({
    luggageLitres: { unit: "LITRE" as const, pattern: /(?:([\d.,]+)\s*(?:litre|lt)\s*(?:bagaj)?|bagaj\s*(?:hacmi)?\s*([\d.,]+)\s*(?:litre|lt)?)/iu },
    cargoVolumeLitres: { unit: "LITRE" as const, pattern: /(?:([\d.,]+)\s*(?:litre|lt)\s*(?:yük|kargo)(?:\s+hacmi)?|(?:yük|kargo)(?:\s+hacmi)?\s*([\d.,]+)\s*(?:litre|lt)?)/iu },
    payloadKg: { unit: "KG" as const, pattern: /(?:([\d.,]+)\s*(?:kg|kilogram)\s*(?:yük|taşıma)?|(?:yük|taşıma)(?:\s+kapasitesi)?\s*([\d.,]+)\s*(?:kg|kilogram)?)/iu },
    powerKw: { unit: "KW" as const, pattern: /([\d.,]+)\s*(?:kw|kilowatt)/iu },
    electricRangeKm: { unit: "KM" as const, pattern: /([\d.,]+)\s*(?:km|kilometre)\s*(?:elektrikli\s+)?menzil/iu },
  });
  for (const [fieldId, definition] of Object.entries(controlledNumericFields) as [keyof typeof controlledNumericFields, (typeof controlledNumericFields)[keyof typeof controlledNumericFields]][]) {
    if (input.openMaterialQuestionField !== fieldId) continue;
    const matched = text.match(definition.pattern);
    const raw = matched?.[1] ?? matched?.[2];
    if (!raw) continue;
    const value = Number(raw.replaceAll(".", "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;
    enforceConstraint(mutation(fieldId, { operator: "MINIMUM", value, unit: definition.unit }, text, input.activeFieldIds.includes(fieldId) ? "CORRECT" : "ADD", true));
    addAct("HARD_REQUIREMENT");
  }
  const drivenWheels = /önden\s+çekiş|\bfwd\b/iu.test(text) ? "FWD" : /arkadan\s+(?:itiş|çekiş)|\brwd\b/iu.test(text) ? "RWD" : /dört\s+çeker|4x4|tüm\s+tekerleklerden\s+çekiş|\bawd\b/iu.test(text) ? "AWD" : undefined;
  const driveConceptUnclear = /(?:bilmiyorum|anlamıyorum|ne fark|farkı ne|ne önemi|neden önemli)/iu.test(text);
  if (drivenWheels && !driveConceptUnclear) { const hard = input.openMaterialQuestionField === "drivenWheels" || /şart|gerekli|olmazsa olmaz|mutlaka/iu.test(text); enforceConstraint(mutation("drivenWheels", { operator: "EQUALS", value: drivenWheels }, text, input.activeFieldIds.includes("drivenWheels") ? "CORRECT" : "ADD", hard)); addAct(hard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT"); }
  if (/aile\s+tatili\s+yük/iu.test(text)) { enforceConstraint({ ...mutation("luggageLitres", { operator: "MINIMUM", value: 500, unit: "LITRE" }, text), explicitness: "GUIDED_APPROXIMATION" }); addAct("PREFERENCE_STATEMENT"); }
  else if (/[İi]ki\s+büyük\s+(?:bavul|valiz)/u.test(text)) { enforceConstraint({ ...mutation("luggageLitres", { operator: "MINIMUM", value: 400, unit: "LITRE" }, text), explicitness: "GUIDED_APPROXIMATION" }); addAct("PREFERENCE_STATEMENT"); }

  const cargoMeaning = /(şehir içi dağıtım|şehir dağıtım|kargo dağıtım|mal dağıt|mal taşı|koli dağıt|yük alanı|yük öncelikli|kapalı kasa|panel ?van|caddy tarz|cargo[- ]first)/iu.test(text);
  if (cargoMeaning && !hasField(constraints, "usageArchitecture")) {
    const explicitArchitecture = /kapalı yük alanı|kapalı kasa|panel ?van|caddy tarz/iu.test(text);
    const architectureHard = explicitArchitecture && /(?:şart|olmazsa olmaz|kesinlikle|mutlaka|istiyorum|olsun|olmalı)/iu.test(text);
    if (explicitArchitecture) constraints.push(mutation("usageArchitecture", { operator: "EQUALS", value: "ENCLOSED_CARGO" }, text, input.activeFieldIds.includes("usageArchitecture") && /düzelt|artık|vazgeç/iu.test(text) ? "CORRECT" : "ADD", architectureHard));
    addAct("USAGE_STATEMENT"); if (architectureHard) addAct("HARD_REQUIREMENT");
  }
  if (/arka koltuk(?:ları)?\s+istemiyorum/iu.test(text)) enforceConstraint(mutation("rearSeatPreference", "MUST_NOT_HAVE", text, input.activeFieldIds.includes("rearSeatPreference") ? "CORRECT" : "ADD", true));
  else if (/arka koltuk(?:lara)? (?:gerek yok|gerekli değil)/iu.test(text) && !hasField(constraints, "rearSeatPreference")) constraints.push(mutation("rearSeatPreference", "NOT_NEEDED", text));

  if (/[\p{L}\p{N}'’.-]+\s+tarzı(?=\s|[,.!?]|$)/iu.test(text)) {
    for (let index = acts.length - 1; index >= 0; index -= 1) if (["MODEL_LOOKUP_REQUEST", "MODEL_COMPARISON_REQUEST", "MODEL_SUITABILITY_REQUEST"].includes(acts[index]!)) acts.splice(index, 1);
    for (let index = directAnswerRequests.length - 1; index >= 0; index -= 1) if (["MODEL_AVAILABILITY", "MODEL_COMPARISON", "MODEL_SUITABILITY"].includes(directAnswerRequests[index]!.kind)) directAnswerRequests.splice(index, 1);
  }

  if (/bütçe (?:önemli değil|fark etmez|sorun değil|problem değil|limitsiz|sınırsız)|bütçe sınır(?:ım)? yok|bütçeyi? .*(?:hariç|dahil etme|katma|uygulama)/iu.test(text) && !budgets.some((item) => item.operation === "EXCLUDE_FROM_DECISION")) budgets.push({ operation: "EXCLUDE_FROM_DECISION", field: "BUDGET_UNKNOWN", sourceSpan: /bütçe (?:sorun değil|problem değil|limitsiz|sınırsız)|bütçe sınır(?:ım)? yok/iu.test(text) ? "bütçe fark etmez" : text });
  const range = budgetRange(text);
  const amount = range ? undefined : money(text);
  const answeringBudgetQuestion = input.openMaterialQuestionField === "budget";
  const financingLanguage = /kredi|finansman/iu.test(text);
  if (range) {
    budgets.push({ operation: input.activeFieldIds.includes("MINIMUM_BUDGET") ? "CORRECT" : "SET", field: "MINIMUM_BUDGET", value: { amount: range.minimum, currency: "TRY" }, sourceSpan: text });
    budgets.push({ operation: input.activeFieldIds.includes("MAXIMUM_HARD_CEILING") ? "CORRECT" : "SET", field: "MAXIMUM_HARD_CEILING", value: { amount: range.maximum, currency: "TRY" }, sourceSpan: text });
  }
  if (amount && /\bnakit(?:im|im var| var| mevcut)?\b|\bmilyonum var\b|\bparam var\b/iu.test(text) && (!answeringBudgetQuestion || financingLanguage) && !budgets.some((item) => item.field === "AVAILABLE_CASH")) budgets.push({ operation: "SET", field: "AVAILABLE_CASH", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (/kredi (?:kullanabilirim|olabilir)|finansman(?:a)? (?:açığım|uygun)/iu.test(text) && !budgets.some((item) => item.field === "FINANCE_FLEXIBILITY")) { budgets.push({ operation: "SET", field: "FINANCE_FLEXIBILITY", value: "YES", sourceSpan: text }); budgets.push({ operation: "SET", field: "UNRESOLVED_FINANCED_CEILING", value: true, sourceSpan: text }); }
  const explicitBudgetCeiling = /(?:en fazla|max(?:imum)?|maksimum|üstüne çıkmam|üstüne çıkamam|üzerine çıkmam|üzerine çıkamam|tavan|kesin bütçe|kesin bütçem)/iu.test(text)
    || (/(?:sadece|yalnızca)/iu.test(text) && /(?:bütçe|bütçem|param|ayırdım|verebilirim)/iu.test(text));
  if (amount && explicitBudgetCeiling && !budgets.some((item) => item.field === "MAXIMUM_HARD_CEILING")) budgets.push({ operation: input.activeFieldIds.includes("MAXIMUM_HARD_CEILING") ? "CORRECT" : "SET", field: "MAXIMUM_HARD_CEILING", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (amount && /civarı|yaklaşık/iu.test(text) && !budgets.some((item) => item.field === "PREFERRED_BUDGET")) budgets.push({ operation: "SET", field: "PREFERRED_BUDGET", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (amount && /bütçem|bütçe[mn]?s*(?:de|olarak)?/iu.test(text) && !budgets.some((item) => ["AVAILABLE_CASH", "PREFERRED_BUDGET", "MAXIMUM_HARD_CEILING"].includes(item.field))) budgets.push({ operation: "SET", field: "PREFERRED_BUDGET", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (amount && input.openMaterialQuestionField === "budget" && !budgets.some((item) => ["AVAILABLE_CASH", "PREFERRED_BUDGET", "MAXIMUM_HARD_CEILING"].includes(item.field))) budgets.push({ operation: "SET", field: "PREFERRED_BUDGET", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (budgets.some((item) => item.operation === "SET" || item.operation === "CORRECT") && !budgets.some((item) => item.field === "BUDGET_UNKNOWN")) budgets.push({ operation: "SET", field: "BUDGET_UNKNOWN", value: false, sourceSpan: text });
  if (budgets.length > input.result.budgetMutations.length) addAct("BUDGET_STATEMENT");

  const traits = personaTraits(text);
  if (traits.length && !personas.some((item) => item.operation === "ACTIVATE")) personas.push({ operation: "ACTIVATE", traits, sourceSpan: text });
  if (/\b(fark etmez|önemli değil|en mantıklısını seç)\b/iu.test(text) && !input.openMaterialQuestionField && !personas.some((item) => item.operation === "DEACTIVATE")) personas.push({ operation: "DEACTIVATE", traits: [], sourceSpan: text });
  if (/\b(?:kapatıyorum|görüşmeyi bitir|hoşça kal|güle güle|çıkıyorum)\b/iu.test(text)) addAct("CLOSING");

  const lookup = text.match(/^\s*([\p{L}\p{N}][\p{L}\p{N}'’.-]*(?:\s+[\p{L}\p{N}][\p{L}\p{N}'’.-]*){0,2})\s+(?:katalogda\s+)?(?:var mı|mevcut mu)\??\s*$/iu);
  if (lookup && references.length === 0) { references.push({ rawText: lookup[1]!, parsedModelText: lookup[1]!, purpose: "LOOKUP_ONLY" }); addAct("MODEL_LOOKUP_REQUEST"); }
  const descriptiveAvailabilityQuestion = catalogAttributeAvailabilityQuestion || /(?:arazi arac[ıi]).*(?:var mı|mevcut mu)/iu.test(text);
  if (descriptiveAvailabilityQuestion) {
    for (let index = acts.length - 1; index >= 0; index -= 1) if (["MODEL_LOOKUP_REQUEST", "MODEL_SUITABILITY_REQUEST"].includes(acts[index]!)) acts.splice(index, 1);
    for (let index = references.length - 1; index >= 0; index -= 1) if (["LOOKUP_ONLY", "PREFERENCE"].includes(references[index]!.purpose)) references.splice(index, 1);
    for (let index = directAnswerRequests.length - 1; index >= 0; index -= 1) if (["MODEL_AVAILABILITY", "MODEL_SUITABILITY"].includes(directAnswerRequests[index]!.kind)) directAnswerRequests.splice(index, 1);
    addAct("VEHICLE_INTENT"); addAct("RECOMMENDATION_REQUEST");
    if (!directAnswerRequests.some((request) => request.kind === "RECOMMENDATION_REQUEST")) directAnswerRequests.push({ kind: "RECOMMENDATION_REQUEST" });
  }
  const comparison = text.match(/\b([\p{L}\p{N}][\p{L}\p{N}'’.-]{1,40})\s+m[ıiuü]\s+([\p{L}\p{N}][\p{L}\p{N}'’.-]{1,40})\s+m[ıiuü](?=\s|[?.!,]|$)/iu);
  if (comparison) {
    const names = [comparison[1]!, comparison[2]!];
    for (const name of names) if (!references.some((reference) => reference.rawText.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) references.push({ rawText: name, parsedModelText: name, purpose: "COMPARISON_SCOPE" });
    for (let index = 0; index < references.length; index += 1) if (names.some((name) => name.toLocaleLowerCase("tr-TR") === references[index]!.rawText.toLocaleLowerCase("tr-TR"))) references[index] = { ...references[index]!, purpose: "COMPARISON_SCOPE" };
    addAct("MODEL_COMPARISON_REQUEST");
    const withoutGenericRecommendation = directAnswerRequests.filter((request) => request.kind !== "RECOMMENDATION_REQUEST");
    directAnswerRequests.splice(0, directAnswerRequests.length, { kind: "MODEL_COMPARISON" }, ...withoutGenericRecommendation.filter((request) => request.kind !== "MODEL_COMPARISON"));
  }
  const revealedSetReference = /(?:bunu|bu aracı|aynı aracı|bunlar(?:ı)?|bu araçlar(?:ı)?|bu modeller(?:i)?|hepsi(?:ni)?|üçü(?:nü)?|ikisi(?:ni)?)/iu.test(text);
  const priceBasedRejection = revealedSetReference && /(?:çok pahalı|pahalı geldi|bütçemi aşıyor|bütçemin üzerinde|bütçeme uymuyor)/iu.test(text);
  const explicitRejection = /\b(?:istemiyorum|beğenmedim|ele|çıkar|olmasın)\b/iu.test(text) || priceBasedRejection;
  const concreteTechnicalConcept = /\b(?:kw|kilowatt|tork|nm|litre|bagaj|tüketim|l\s*\/\s*100|menzil|şarj|batarya|0\s*-?\s*100|beygir|hp|ps|çekiş|şanzıman)\b/iu.test(text);
  const explicitTechnicalExplanationRequest = /\b(?:anlat|açıkla|yönlendir|izah et)\b/iu.test(text);
  const genericTechnicalNoviceContext = /(?:teknik (?:terim|değer|konu)[\p{L}]* .*?(?:bilmiyorum|anlamıyorum|h[aâ]kim değil)|teknik bilgim yok)/iu.test(text) && !concreteTechnicalConcept && !explicitTechnicalExplanationRequest;
  const technicalVehicleRecommendation = /(?:elektrik(?:li)?|h[ıi]bri[td]|benzinli|dizel|yakıt|motor|şanzıman|çekiş|menzil|şarj|batarya|pickup|pikap|suv|sedan).*(?:önerir misin|ne önerirsin|mantıklı mı)/iu.test(text);
  const chargingDurationQuestion = /(?:şarj|batarya).*(?:ne kadar|süre|uzun|doldur|dolum|hızlı)|(?:ne kadar).*(?:şarj|batarya)/iu.test(text);
  const asksWhyOpenChoiceMatters = Boolean(input.openMaterialQuestionField) && /(?:ne önemi var|neden önemli|ne fark(?:ı var| ediyor)?|farkı ne)/iu.test(text);
  const technicalExplanation = !genericTechnicalNoviceContext && (asksWhyOpenChoiceMatters || isControlledTechnicalInformationRequest(text) || technicalVehicleRecommendation || chargingDurationQuestion || /(?:ne anlama (?:geldiğini?|geliyor)|neyi anlatır|ne demek|nedir|bunlar(?:ın)? ne|açıkla|farkını.*anlat|günlük örnek(?:le|lerle| ver)|nasıl okumalıyım|ne kadar .*alır|neler sığar|ne ifade ediyor|önemli mi|aynı şey mi|teknik terimlere? .*hakim değil|bilmiyorum.*yönlendir|(?:kullanmak|almak) mümkün mü|bilgi verir misin|ne düşünüyorsun|ikinci elde.*değer|değer kaybet)/iu.test(text));
  if (genericTechnicalNoviceContext) {
    for (let index = acts.length - 1; index >= 0; index -= 1) if (["TECHNICAL_EXPLANATION_REQUEST", "DONT_KNOW"].includes(acts[index]!)) acts.splice(index, 1);
    for (let index = directAnswerRequests.length - 1; index >= 0; index -= 1) if (directAnswerRequests[index]!.kind === "TECHNICAL_EXPLANATION") directAnswerRequests.splice(index, 1);
  }
  if (technicalExplanation) { addAct("TECHNICAL_EXPLANATION_REQUEST"); if (!directAnswerRequests.some((request) => request.kind === "TECHNICAL_EXPLANATION")) directAnswerRequests.unshift({ kind: "TECHNICAL_EXPLANATION" }); }
  const pureTechnicalInformationRequest = isControlledTechnicalInformationRequest(text)
    && !/(?:istiyorum|olsun|arıyorum|bakıyorum|almak istiyorum|almayı düşünüyorum|seçelim|öneri istiyorum)/iu.test(text);
  if (pureTechnicalInformationRequest) {
    for (let index = constraints.length - 1; index >= 0; index -= 1) if (criticalFields.has(constraints[index]!.fieldId)) constraints.splice(index, 1);
    personas.splice(0, personas.length);
    for (let index = acts.length - 1; index >= 0; index -= 1) if (["PREFERENCE_STATEMENT", "HARD_REQUIREMENT", "USAGE_STATEMENT"].includes(acts[index]!)) acts.splice(index, 1);
  }
  const implicitVehicleRequest = constraints.length > 0 && /(?:istiyorum|olsun|arıyorum|bakıyorum|düşünüyorum|kullanacağım|lazım|gerekiyor|bütçem|max(?:imum)?|maksimum)/iu.test(text);
  const explicitDiscoveryIntent = /(?:[İi]lk (?:arabamı?|aracımı?|otomobilimi?)|(?:kızım|oğlum|kızıma|oğluma).*(?:araba|araç|otomobil)|(?:aracımı|arabamı|otomobilimi).{0,60}(?:yenilemek|değiştirmek|yenileyeceğim|değiştireceğim)|(?:araba|araç|otomobil) (?:almak|almayı|alacağım|almam (?:lazım|gerekiyor)|almalıyım|arıyorum|bakıyorum|lazım|gerekiyor)|hangi\s+(?:aracı|arabayı|otomobili)\s+(?:alsam|seçsem|tercih etsem)|(?:panel[ -]?van|pick[ -]?up|pikap|caddy tarzı).*(?:istemiyorum|gerekmiyor|istiyorum|arıyorum|bakıyorum|düşünüyorum|lazım|gerekiyor)|(?:clio|civic|corolla|golf).*(?:önerdi|danış|kararsız)|(?:havalı|premium|şık).*(?:araç|araba|otomobil|bir şey)?.*(?:arıyorum|istiyorum))/iu.test(text);
  if (/(?:araç|araba|seçene(?:k|ğ)i?|model).*(?:arıyorum|istiyorum|öner|hazırla)|(?:öner|tavsiye).*(?:araç|araba|model)/iu.test(text) || implicitVehicleRequest || explicitDiscoveryIntent || isControlledUsageRecommendationRequest(text)) { addAct("VEHICLE_INTENT"); addAct("RECOMMENDATION_REQUEST"); if (!comparison && !directAnswerRequests.some((request) => request.kind === "RECOMMENDATION_REQUEST")) directAnswerRequests.push({ kind: "RECOMMENDATION_REQUEST" }); }
  const explicitModelRecommendation = acts.includes("RECOMMENDATION_REQUEST") && /(?:almak istiyorum|başlangıç noktası|seçeneği? hazırla|öner(?:meni|i)? istiyorum)/iu.test(text) && !/(?:var mı|mevcut mu)/iu.test(text);
  if (explicitModelRecommendation) {
    for (let index = acts.length - 1; index >= 0; index -= 1) if (["MODEL_LOOKUP_REQUEST", "MODEL_SUITABILITY_REQUEST"].includes(acts[index]!)) acts.splice(index, 1);
    for (let index = directAnswerRequests.length - 1; index >= 0; index -= 1) if (["MODEL_AVAILABILITY", "MODEL_SUITABILITY"].includes(directAnswerRequests[index]!.kind)) directAnswerRequests.splice(index, 1);
  }
  if (naturalConsent.test(text)) addAct("OFFER_ACCEPTANCE");
  if (/^(?:hayır|istemiyorum|önce biraz daha konuşalım)[.!]?$/iu.test(text)) addAct("OFFER_DECLINE");

  if (directAnswerRequests.length === 0) {
    if (acts.includes("MODEL_LOOKUP_REQUEST")) directAnswerRequests.push({ kind: "MODEL_AVAILABILITY" });
    else if (acts.includes("MODEL_COMPARISON_REQUEST")) directAnswerRequests.push({ kind: "MODEL_COMPARISON" });
    else if (acts.includes("MODEL_SUITABILITY_REQUEST")) directAnswerRequests.push({ kind: "MODEL_SUITABILITY" });
    else if (acts.includes("RECOMMENDATION_REQUEST")) directAnswerRequests.push({ kind: "RECOMMENDATION_REQUEST" });
    else if (acts.includes("TECHNICAL_EXPLANATION_REQUEST")) directAnswerRequests.push({ kind: "TECHNICAL_EXPLANATION" });
  }

  const explicitRejectionReference = explicitRejection ? references.find((reference) => new RegExp(`\\b${reference.rawText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "iu").test(text)) : undefined;
  const revealedSetRejection = explicitRejection && (input.revealedCandidateReferences?.length ?? 0) > 0 && revealedSetReference;
  const cheaperRevealedAlternative = (input.revealedCandidateReferences?.length ?? 0) > 0 && /(?:daha\s+(?:ucuz|hesaplı|uygun fiyatlı)|düşük\s+bütçeli|uygun fiyatlı\s+başka)/iu.test(text);
  if (cheaperRevealedAlternative) { addAct("ALTERNATIVE_REQUEST"); if (directAnswerRequests.length === 0) directAnswerRequests.push({ kind: "ALTERNATIVE_REQUEST" }); }
  const candidateRejection = revealedSetRejection || cheaperRevealedAlternative ? { scope: "AMBIGUOUS" as const, referenceText: "REVEALED_SET", sourceSpan: text } : input.result.candidateRejection ?? (explicitRejectionReference ? { scope: "MODEL_FAMILY_EXPLICIT" as const, referenceText: explicitRejectionReference.rawText, sourceSpan: text } : undefined);
  if (candidateRejection) addAct("CANDIDATE_REJECTION");
  const humanContext = detectHumanContext(text);
  const greeting = /^(?:selam(?:lar)?|merhaba(?:lar)?|günaydın|iyi (?:günler|akşamlar))\b/iu.test(text);
  const casualCheckIn = /^(?:nasılsın|naber|ne haber|iyi misin)[?.!]*$/iu.test(text);
  const deterministicSocialSignal = humanContext ? { kind: humanContext.kind }
    : greeting ? { kind: "GREETING" as const }
    : casualCheckIn ? { kind: "GENERAL" as const }
    : conversationalRepair ? { kind: "GENERAL" as const }
    : input.result.socialSignal;
  if (deterministicSocialSignal?.kind === "GREETING") addAct("GREETING");
  else if (deterministicSocialSignal && !acts.includes("SOCIAL_MESSAGE")) acts.push("SOCIAL_MESSAGE");
  const unresolvedAmbiguities = input.result.ambiguities.filter((ambiguity) => {
    const span = ambiguity.sourceSpan;
    const usageReference = /(?:şehir|günlük|yük|kargo|koli|dağıtım|yolcu|servis|transfer|arazi|off[- ]?road|çamur|kar|bozuk yol|köy|kırsal|bağ[ -]?bahçe|uzun yol|aile|çocuk)/iu.test(span);
    const controlledUsageResolved = usageReference && (Boolean(usageScenario) || input.activeFieldIds.includes("usageScenario"));
    const controlledBodyResolved = detectedBodyStyles(span).length > 0;
    const controlledFuelResolved = normalizeFuelInterpretation(span) !== null;
    const controlledTransmissionResolved = /\b(?:otomatik|manuel)\b/iu.test(span);
    const controlledDriveResolved = /(?:önden çekiş|arkadan itiş|dört çeker|4x4|\b(?:fwd|rwd|awd)\b)/iu.test(span);
    const controlledBudgetResolved = budgets.length > 0 && money(span) !== undefined;
    const controlledPersonaResolved = traits.length > 0 && /(?:ikinci el|değer kayb|değerini koru|etkile|etkilensin|dikkat çek|aşık olsun)/iu.test(span);
    const revealedReferenceResolved = (input.revealedCandidateReferences?.length ?? 0) > 0 && /(?:bunu|bu araç|aynı araç|bunlar|bu modeller)/iu.test(span);
    const controlledChargingQuestionResolved = technicalExplanation && /(?:şarj|batarya).*(?:süre|uzun|doldur|dolum|hızlı)|(?:ne kadar).*(?:şarj|batarya)/iu.test(span);
    return !(controlledUsageResolved || controlledBodyResolved || controlledFuelResolved || controlledTransmissionResolved || controlledDriveResolved || controlledBudgetResolved || controlledPersonaResolved || revealedReferenceResolved || controlledChargingQuestionResolved);
  });
  return Object.freeze({ ...input.result, acts: Object.freeze(unique(acts)), directAnswerRequests: Object.freeze(directAnswerRequests), constraintMutations: Object.freeze(constraints), budgetMutations: Object.freeze(budgets), modelReferences: Object.freeze(references), personaMutations: Object.freeze(personas), ...(candidateRejection ? { candidateRejection } : {}), technicalGuidanceRequest: genericTechnicalNoviceContext ? undefined : technicalExplanation ? { fieldId: input.result.technicalGuidanceRequest?.fieldId, mode: "GUIDE_WITH_DAILY_LIFE" as const } : input.result.technicalGuidanceRequest, socialSignal: deterministicSocialSignal, offTopicSignal: socialHumor ? undefined : input.result.offTopicSignal, abuseSignal: verifiedAbuse ? { detected: true as const } : undefined, ambiguities: Object.freeze(unresolvedAmbiguities) });
}

export type SemanticCompletenessCode = "CORRECTION_MUTATION_MISSING" | "HARD_REQUIREMENT_MUTATION_MISSING" | "PREFERENCE_MUTATION_MISSING" | "BUDGET_MUTATION_MISSING" | "MODEL_REFERENCE_MISSING" | "PERSONA_MUTATION_MISSING" | "REJECTION_MUTATION_MISSING";
export function assessInterpretationSemanticCompleteness(input: { readonly interpretation: AuthoritativeSemanticPlan; readonly userText: string; readonly activeFieldIds?: readonly string[] }): { readonly complete: boolean; readonly codes: readonly SemanticCompletenessCode[] } {
  const codes: SemanticCompletenessCode[] = []; const { result } = input.interpretation;
  if (result.acts.includes("CORRECTION") && !input.interpretation.acceptedConstraintMutations.some((item) => item.operation === "CORRECT" || item.operation === "CLEAR") && (input.activeFieldIds?.length ?? 0) > 0) codes.push("CORRECTION_MUTATION_MISSING");
  if (result.acts.includes("HARD_REQUIREMENT") && !input.interpretation.acceptedConstraintMutations.some((item) => item.deterministicDecisionUse === "HARD_CANDIDATE")) codes.push("HARD_REQUIREMENT_MUTATION_MISSING");
  if (result.acts.includes("PREFERENCE_STATEMENT") && input.interpretation.acceptedConstraintMutations.length === 0 && input.interpretation.acceptedPersonaMutations.length === 0) codes.push("PREFERENCE_MUTATION_MISSING");
  if (result.acts.includes("BUDGET_STATEMENT") && input.interpretation.acceptedBudgetMutations.length === 0) codes.push("BUDGET_MUTATION_MISSING");
  if (["MODEL_LOOKUP_REQUEST", "MODEL_COMPARISON_REQUEST", "MODEL_SUITABILITY_REQUEST"].some((act) => result.acts.includes(act as UserAct)) && result.modelReferences.length === 0) codes.push("MODEL_REFERENCE_MISSING");
  if (personaTraits(input.userText).length > 0 && input.interpretation.acceptedPersonaMutations.length === 0) codes.push("PERSONA_MUTATION_MISSING");
  if (result.acts.includes("CANDIDATE_REJECTION") && !result.candidateRejection) codes.push("REJECTION_MUTATION_MISSING");
  return Object.freeze({ complete: codes.length === 0, codes: Object.freeze(codes) });
}
