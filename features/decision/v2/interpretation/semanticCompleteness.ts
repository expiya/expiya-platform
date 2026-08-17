import type { AuthoritativeSemanticPlan, InterpretationResult, ProposedConstraintMutation, ProposedPersonaMutation, ProviderActAuthority, UserAct } from "./types";
import { normalizeFuelInterpretation } from "./policy";
import { detectHumanContext } from "./humanContextPolicy";

const BODY_STYLES = ["Sedan", "Hatchback", "SUV", "Coupe", "Convertible", "Crossover", "Liftback", "Station Wagon", "Pickup", "Panel Van", "Passenger Van", "MPV"] as const;
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
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(milyon|mn|bin)?/iu); if (!match) return undefined;
  const raw = Number(match[1]!.replace(",", ".")); if (!Number.isFinite(raw) || raw <= 0) return undefined;
  return Math.round(raw * (match[2]?.toLocaleLowerCase("tr-TR") === "bin" ? 1_000 : match[2] ? 1_000_000 : 1));
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
  return unique(traits);
}

export function enforceInterpretationSemanticCompleteness(input: { readonly result: InterpretationResult; readonly userText: string; readonly activeFieldIds: readonly string[]; readonly openMaterialQuestionField?: string; readonly revealedCandidateReferences?: readonly string[] }): InterpretationResult {
  const text = input.userText.trim();
  const semanticText = text.normalize("NFKC").toLocaleLowerCase("tr-TR");
  const naturalConsent = /^(?:evet|göster(?: bakalım)?|paylaş(?: bakalım)?|görelim|hadi görelim|hadi göster|olur|tamam|bakalım|önerini görmek isterim|önerileri aç|seçenekleri göster|devam et(?: öyleyse)?|edelim)[.!]?$/iu;
  if (naturalConsent.test(text)) { const acts: UserAct[] = ["OFFER_ACCEPTANCE"]; return Object.freeze({ ...input.result, acts: Object.freeze(acts), constraintMutations: Object.freeze([]), budgetMutations: Object.freeze([]), modelReferences: Object.freeze([]), personaMutations: Object.freeze([]), candidateRejection: undefined, corrections: Object.freeze([]) }); }
  if (/^(?:hayır|istemiyorum|önce biraz daha konuşalım)[.!]?$/iu.test(text)) { const acts: UserAct[] = ["OFFER_DECLINE"]; return Object.freeze({ ...input.result, acts: Object.freeze(acts), constraintMutations: Object.freeze([]), budgetMutations: Object.freeze([]), modelReferences: Object.freeze([]), personaMutations: Object.freeze([]), candidateRejection: undefined, corrections: Object.freeze([]) }); }
  const verifiedAbuse = /(salak|aptal|gerizek[aâ]lı|mal mısın|lanet)/iu.test(text); const socialHumor = /(şaka|😂|😄|🤣)/u.test(text);
  const conversationalRepair = /(?:nasılsın diye sormadım|sana güvenmiyorum|hangi tercih\??)/iu.test(text);
  const acts: UserAct[] = input.result.acts.filter((act) => !["HARD_REQUIREMENT", "PREFERENCE_STATEMENT", "CORRECTION", "BUDGET_STATEMENT", "OFF_TOPIC", "ABUSE"].includes(act));
  if (verifiedAbuse) acts.push("ABUSE"); if (input.result.offTopicSignal?.detected && !socialHumor) acts.push("OFF_TOPIC"); if (socialHumor && !acts.includes("SOCIAL_MESSAGE")) acts.push("SOCIAL_MESSAGE");
  if (conversationalRepair && !acts.includes("SOCIAL_MESSAGE")) acts.push("SOCIAL_MESSAGE");
  const criticalFields = new Set(["usageScenario", "relativePriceSegment", "runningCostPreference", "fuelType", "transmission", "bodyStyle", "drivenWheels", "seats", "usageArchitecture", "rearSeatPreference"]);
  const constraints = input.result.constraintMutations.filter((item) => !criticalFields.has(item.fieldId)); const budgets = [] as typeof input.result.budgetMutations[number][]; const personas = [] as typeof input.result.personaMutations[number][]; const references = [...input.result.modelReferences];
  const directAnswerRequests = [...input.result.directAnswerRequests];
  const addAct = (act: UserAct) => { if (!acts.includes(act)) acts.push(act); };
  const enforceConstraint = (value: ProposedConstraintMutation) => { const index = constraints.findIndex((item) => item.fieldId === value.fieldId); if (index >= 0) constraints[index] = value; else constraints.push(value); };

  const usageScenario = /şehir içi (?:mal|kargo|koli) dağıt|mal dağıt|koli dağıt/iu.test(text) ? "URBAN_DELIVERY"
    : /yolcu taşı|servis|transfer/iu.test(text) ? "PASSENGER_TRANSPORT"
    : /genel yük|yük taşı|ticari yük/iu.test(text) ? "GENERAL_CARGO"
    : /ciddi arazi|zorlu arazi|arazi arac[ıi]|off[- ]?road/iu.test(text) ? "SERIOUS_OFF_ROAD"
    : /çamur|karlı? yol|kar(?:da|lı)|mud/iu.test(text) ? "MUD_SNOW"
    : /bozuk yol|köy yol/iu.test(text) ? "ROUGH_ROAD"
    : /uzun yol|şehirler ?arası/iu.test(text) ? "LONG_DISTANCE"
    : /aile|çocuk(?:lar)?la/iu.test(text) ? "FAMILY"
    : /karma kullanım|hem şehir içi hem uzun yol/iu.test(text) ? "MIXED_PASSENGER"
    : input.openMaterialQuestionField === "usageScenario" && /^(?:günlük|gündelik)(?:\s+.{1,60})?[.!]?$/iu.test(text) ? "URBAN_DAILY"
    : /günlük (?:şehir içi |şehir dışı )?kullanım|günlük kullan|her gün kullan|işe gidip gel|gündelik işler|günlük şehir içi|şehir içinde (?:günlük )?kullan|şehir içi (?:araç|kullanım)|şehir içinde/u.test(semanticText) ? "URBAN_DAILY"
    : undefined;
  if (usageScenario && !hasField(constraints, "usageScenario")) {
    constraints.push(mutation("usageScenario", usageScenario, text, input.activeFieldIds.includes("usageScenario") ? "CORRECT" : "ADD"));
    addAct("USAGE_STATEMENT");
  }

  const relativePriceSegment = /(?:ucuz\s+(?:bir\s+)?(?:araç|araba|otomobil)|en\s+ucuzlardan|uygun\s+fiyatlı|düşük\s+fiyatlı|satın\s+alma\s+fiyatı\s+erişilebilir)/u.test(semanticText) ? "LOWEST_20"
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
  const positiveFuel = normalizeFuelInterpretation(remainingFuelText);
  const fuel = positiveFuel ?? (noElectric ? { operator: "EXCLUDES" as const, value: ["BEV"] } : noHybrid ? { operator: "EXCLUDES" as const, value: ["MHEV", "HEV", "PHEV"] } : null);
  if (/yakıt\s+(?:fark etmez|önemli değil)/iu.test(text)) { enforceConstraint(mutation("fuelType", null, text, input.activeFieldIds.includes("fuelType") ? "CLEAR" : "DECLINE")); addAct(input.activeFieldIds.includes("fuelType") ? "CORRECTION" : "DECLINE_TO_ANSWER"); }
  else if (fuel) { const fuelHard = /(?:kesinlikle|mutlaka)\s+(?:hibrit|elektrikli|benzinli|dizel)|(?:hibrit|elektrikli|benzinli|dizel)(?:\s+dışında)?\s+(?:olmalı|şart|olmazsa olmaz|istemiyorum|olmasın)/iu.test(text); enforceConstraint(mutation("fuelType", fuel, text, input.activeFieldIds.includes("fuelType") ? "CORRECT" : "ADD", fuelHard)); addAct(input.activeFieldIds.includes("fuelType") ? "CORRECTION" : fuelHard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT"); }

  const transmission = /\botomati(?:k|ğe)\b/iu.test(text) ? "AUTOMATIC" : /\bmanuel(?:e)?\b/iu.test(text) ? "MANUAL" : undefined;
  if (transmission) { const transmissionHard = /(?:kesinlikle|mutlaka)\s+(?:otomatik|manuel)|(?:otomatik|manuel)\s+(?:olmalı|şart|olmazsa olmaz)|(?:otomatik|manuel)\s+dışında\s+istemiyorum/iu.test(text); const operation = input.activeFieldIds.includes("transmission") ? "CORRECT" : "ADD"; enforceConstraint({ ...mutation("transmission", { operator: "EQUALS", value: transmission }, text, operation), explicitness: transmissionHard ? "EXPLICIT_REQUIREMENT" : "EXPLICIT_PREFERENCE" }); addAct(operation === "CORRECT" ? "CORRECTION" : transmissionHard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT"); }

  const mentionedBodies = BODY_STYLES.filter((style) => new RegExp(`\\b${style.replace(" ", "[ -]?")}(?:'?(?:a|e|ya|ye))?\\b`, "iu").test(text));
  if (/gövde(?:\s+tipi)?\s+(?:fark etmez|önemli değil)/iu.test(text)) { enforceConstraint(mutation("bodyStyle", null, text, input.activeFieldIds.includes("bodyStyle") ? "CLEAR" : "DECLINE")); addAct(input.activeFieldIds.includes("bodyStyle") ? "CORRECTION" : "DECLINE_TO_ANSWER"); }
  const affirmativeBodies = mentionedBodies.filter((style) => !new RegExp(`${style.replace(" ", "[ -]?")}(?:'?(?:den|dan))?\\s+(?:değil|demedim|istemi(?:yor|yorum)|vazgeç)`, "iu").test(text));
  const affirmativeBody = affirmativeBodies.at(-1);
  if (affirmativeBody) {
    const correctionMeaning = /\b(dedim|demedim|düzelt)\b/iu.test(text); const hasActiveBody = input.activeFieldIds.includes("bodyStyle");
    const bodyHard = correctionMeaning || new RegExp(`(?:${affirmativeBody}.*(?:şart|olmazsa olmaz|mutlaka)|(?:kesinlikle|mutlaka).*${affirmativeBody})`, "iu").test(text);
    const bodyValue = affirmativeBodies.length === 1 ? { operator: "EQUALS", value: affirmativeBody } : { operator: "ONE_OF", value: affirmativeBodies };
    enforceConstraint({ ...mutation("bodyStyle", bodyValue, text, hasActiveBody ? "CORRECT" : "ADD", bodyHard), explicitness: bodyHard ? "EXPLICIT_REQUIREMENT" : "EXPLICIT_PREFERENCE" });
    addAct(correctionMeaning || hasActiveBody ? "CORRECTION" : bodyHard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT");
  }

  const seatMatch = text.match(/\b(?:en az\s+)?(\d+|beş|yedi)\s+(?:kişilik|koltuk)\b/iu);
  if (seatMatch) {
    const seatWords: Readonly<Record<string, number>> = { beş: 5, yedi: 7 };
    const token = seatMatch[1]!.toLocaleLowerCase("tr-TR"); const count = Number(token) || seatWords[token];
    if (count) { const hard = /şart|gerekli|olmazsa olmaz|en az/iu.test(text); enforceConstraint(mutation("seats", { operator: /en az/iu.test(text) ? "MINIMUM" : "EQUALS", value: count, unit: "COUNT" }, text, input.activeFieldIds.includes("seats") ? "CORRECT" : "ADD", hard)); addAct(hard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT"); }
  }
  if (/dört\s+çeker|4x4|tüm\s+tekerleklerden\s+çekiş/iu.test(text)) { const hard = /şart|gerekli|olmazsa olmaz|mutlaka/iu.test(text); enforceConstraint(mutation("drivenWheels", { operator: "EQUALS", value: "AWD" }, text, input.activeFieldIds.includes("drivenWheels") ? "CORRECT" : "ADD", hard)); addAct(hard ? "HARD_REQUIREMENT" : "PREFERENCE_STATEMENT"); }
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

  if (/bütçe (?:önemli değil|fark etmez)|bütçeyi? .*hariç/iu.test(text) && !budgets.some((item) => item.operation === "EXCLUDE_FROM_DECISION")) budgets.push({ operation: "EXCLUDE_FROM_DECISION", field: "BUDGET_UNKNOWN", sourceSpan: text });
  const amount = money(text);
  if (amount && /nakit(?:im)?|(?:milyon|mn).*(?:var|nakit)/iu.test(text) && !budgets.some((item) => item.field === "AVAILABLE_CASH")) budgets.push({ operation: "SET", field: "AVAILABLE_CASH", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (/kredi (?:kullanabilirim|olabilir)|finansman(?:a)? (?:açığım|uygun)/iu.test(text) && !budgets.some((item) => item.field === "FINANCE_FLEXIBILITY")) { budgets.push({ operation: "SET", field: "FINANCE_FLEXIBILITY", value: "YES", sourceSpan: text }); budgets.push({ operation: "SET", field: "UNRESOLVED_FINANCED_CEILING", value: true, sourceSpan: text }); }
  const explicitBudgetCeiling = /(?:en fazla|max(?:imum)?|maksimum|üstüne çıkmam|üstüne çıkamam|üzerine çıkmam|üzerine çıkamam|tavan)/iu.test(text)
    || (/(?:sadece|yalnızca)/iu.test(text) && /(?:bütçe|bütçem|param|ayırdım|verebilirim)/iu.test(text));
  if (amount && explicitBudgetCeiling && !budgets.some((item) => item.field === "MAXIMUM_HARD_CEILING")) budgets.push({ operation: input.activeFieldIds.includes("MAXIMUM_HARD_CEILING") ? "CORRECT" : "SET", field: "MAXIMUM_HARD_CEILING", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (amount && /civarı|yaklaşık/iu.test(text) && !budgets.some((item) => item.field === "PREFERRED_BUDGET")) budgets.push({ operation: "SET", field: "PREFERRED_BUDGET", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (amount && /bütçem|bütçe[mn]?s*(?:de|olarak)?/iu.test(text) && !budgets.some((item) => ["AVAILABLE_CASH", "PREFERRED_BUDGET", "MAXIMUM_HARD_CEILING"].includes(item.field))) budgets.push({ operation: "SET", field: "PREFERRED_BUDGET", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (amount && input.openMaterialQuestionField === "budget" && !budgets.some((item) => ["AVAILABLE_CASH", "PREFERRED_BUDGET", "MAXIMUM_HARD_CEILING"].includes(item.field))) budgets.push({ operation: "SET", field: "PREFERRED_BUDGET", value: { amount, currency: "TRY" }, sourceSpan: text });
  if (budgets.some((item) => item.operation === "SET" || item.operation === "CORRECT") && !budgets.some((item) => item.field === "BUDGET_UNKNOWN")) budgets.push({ operation: "SET", field: "BUDGET_UNKNOWN", value: false, sourceSpan: text });
  if (budgets.length > input.result.budgetMutations.length) addAct("BUDGET_STATEMENT");

  const traits = personaTraits(text);
  if (traits.length && !personas.some((item) => item.operation === "ACTIVATE")) personas.push({ operation: "ACTIVATE", traits, sourceSpan: text });
  if (/\b(fark etmez|önemli değil|en mantıklısını seç)\b/iu.test(text) && !personas.some((item) => item.operation === "DEACTIVATE")) personas.push({ operation: "DEACTIVATE", traits: [], sourceSpan: text });

  const lookup = text.match(/^\s*([\p{L}\p{N}][\p{L}\p{N}'’.-]*(?:\s+[\p{L}\p{N}][\p{L}\p{N}'’.-]*){0,2})\s+(?:katalogda\s+)?(?:var mı|mevcut mu)\??\s*$/iu);
  if (lookup && references.length === 0) { references.push({ rawText: lookup[1]!, parsedModelText: lookup[1]!, purpose: "LOOKUP_ONLY" }); addAct("MODEL_LOOKUP_REQUEST"); }
  const descriptiveAvailabilityQuestion = /(?:arazi arac[ıi]|elektrikli araç|dizel araç|benzinli araç|hibrit araç).*(?:var mı|mevcut mu)/iu.test(text);
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
  const revealedSetReference = /(?:bunlar(?:ı)?|bu araçlar(?:ı)?|bu modeller(?:i)?|hepsi(?:ni)?|üçü(?:nü)?|ikisi(?:ni)?)/iu.test(text);
  const priceBasedRejection = revealedSetReference && /(?:çok pahalı|pahalı geldi|bütçemi aşıyor|bütçemin üzerinde|bütçeme uymuyor)/iu.test(text);
  const explicitRejection = /\b(?:istemiyorum|beğenmedim|ele|çıkar|olmasın)\b/iu.test(text) || priceBasedRejection;
  const concreteTechnicalConcept = /\b(?:kw|kilowatt|tork|nm|litre|bagaj|tüketim|l\s*\/\s*100|menzil|şarj|batarya|0\s*-?\s*100|beygir|hp|ps|çekiş|şanzıman)\b/iu.test(text);
  const explicitTechnicalExplanationRequest = /\b(?:anlat|açıkla|yönlendir|izah et)\b/iu.test(text);
  const genericTechnicalNoviceContext = /(?:teknik (?:terim|değer|konu)[\p{L}]* .*?(?:bilmiyorum|anlamıyorum|h[aâ]kim değil)|teknik bilgim yok)/iu.test(text) && !concreteTechnicalConcept && !explicitTechnicalExplanationRequest;
  const technicalExplanation = !genericTechnicalNoviceContext && /(?:ne anlama (?:geldiğini?|geliyor)|neyi anlatır|ne demek|nedir|bunlar(?:ın)? ne|açıkla|farkını.*anlat|günlük örnek(?:le|lerle| ver)|nasıl okumalıyım|ne kadar .*alır|neler sığar|ne ifade ediyor|önemli mi|aynı şey mi|teknik terimlere? .*hakim değil|bilmiyorum.*yönlendir)/iu.test(text);
  if (genericTechnicalNoviceContext) {
    for (let index = acts.length - 1; index >= 0; index -= 1) if (["TECHNICAL_EXPLANATION_REQUEST", "DONT_KNOW"].includes(acts[index]!)) acts.splice(index, 1);
    for (let index = directAnswerRequests.length - 1; index >= 0; index -= 1) if (directAnswerRequests[index]!.kind === "TECHNICAL_EXPLANATION") directAnswerRequests.splice(index, 1);
  }
  if (technicalExplanation) { addAct("TECHNICAL_EXPLANATION_REQUEST"); if (!directAnswerRequests.some((request) => request.kind === "TECHNICAL_EXPLANATION")) directAnswerRequests.unshift({ kind: "TECHNICAL_EXPLANATION" }); }
  const implicitVehicleRequest = constraints.length > 0 && /(?:istiyorum|olsun|arıyorum|bütçem|max(?:imum)?|maksimum)/iu.test(text);
  const explicitDiscoveryIntent = /(?:[İi]lk (?:arabamı?|aracımı?|otomobilimi?)|(?:kızım|oğlum|kızıma|oğluma).*(?:araba|araç|otomobil)|(?:araba|araç|otomobil) (?:almak|almayı|alacağım|almam (?:lazım|gerekiyor)|almalıyım|arıyorum|bakıyorum|lazım|gerekiyor))/iu.test(text);
  if (/(?:araç|araba|seçenek|model).*(?:arıyorum|istiyorum|öner|hazırla)|(?:öner|tavsiye).*(?:araç|araba|model)/iu.test(text) || implicitVehicleRequest || explicitDiscoveryIntent) { addAct("VEHICLE_INTENT"); addAct("RECOMMENDATION_REQUEST"); if (!comparison && !directAnswerRequests.some((request) => request.kind === "RECOMMENDATION_REQUEST")) directAnswerRequests.push({ kind: "RECOMMENDATION_REQUEST" }); }
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
  const candidateRejection = revealedSetRejection ? { scope: "AMBIGUOUS" as const, referenceText: "REVEALED_SET", sourceSpan: text } : input.result.candidateRejection ?? (explicitRejectionReference ? { scope: "MODEL_FAMILY_EXPLICIT" as const, referenceText: explicitRejectionReference.rawText, sourceSpan: text } : undefined);
  if (candidateRejection) addAct("CANDIDATE_REJECTION");
  const humanContext = detectHumanContext(text);
  const deterministicSocialSignal = humanContext ? { kind: humanContext.kind }
    : conversationalRepair ? { kind: "GENERAL" as const }
    : input.result.socialSignal;
  if (deterministicSocialSignal && !acts.includes("SOCIAL_MESSAGE") && deterministicSocialSignal.kind !== "GREETING") acts.push("SOCIAL_MESSAGE");
  return Object.freeze({ ...input.result, acts: Object.freeze(unique(acts)), directAnswerRequests: Object.freeze(directAnswerRequests), constraintMutations: Object.freeze(constraints), budgetMutations: Object.freeze(budgets), modelReferences: Object.freeze(references), personaMutations: Object.freeze(personas), ...(candidateRejection ? { candidateRejection } : {}), technicalGuidanceRequest: genericTechnicalNoviceContext ? undefined : technicalExplanation ? { fieldId: input.result.technicalGuidanceRequest?.fieldId, mode: "GUIDE_WITH_DAILY_LIFE" as const } : input.result.technicalGuidanceRequest, socialSignal: deterministicSocialSignal, offTopicSignal: socialHumor ? undefined : input.result.offTopicSignal, abuseSignal: verifiedAbuse ? { detected: true as const } : undefined });
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
