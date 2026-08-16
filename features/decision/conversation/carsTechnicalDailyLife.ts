import { loadActiveTechnicalDailyLifeLayer } from "@/features/vehicle-data/technicalDailyLifeResolver";
import type { CarsTechnicalDailyLifeInterpretation } from "@/types/carsConversation";
import type { CarsRequirementKey } from "@/types/carsConversation";
import type { TechnicalDailyLifeMapping, UsageContext } from "@/types/technicalDailyLife";

const { layer } = loadActiveTechnicalDailyLifeLayer();

const FIELD_TRIGGERS: Readonly<Record<string, RegExp>> = {
  luggageVolume: /bagaj|bavul|valiz|puset|bebek arabası|market poşet|kamp ekipman|spor çanta|aile tatili|çok sayıda parça/iu,
  motorPower: /motor gücü|performans|ara hızlan|canlı|atak|güç önceli|yokuş|sollama/iu,
  combinedFuelConsumption: /yakıt ekonom|tüketim|az yak|yakıt gider|ekonomik/iu,
  electricRange: /elektrikli menzil|menzil|her gün şarj|şarj aralığı|günlük kilometre/iu,
  maxDcChargePower: /hızlı şarj|şarj mola|kahve mola|dc şarj/iu,
  length: /dar sokak|paralel park|kısa park|garaj uzun|araç uzun/iu,
  width: /dar geçit|sütun ara|garaj giriş|araç geniş|aynalar açık/iu,
  seats: /koltuk|kaç kişi|kişilik|üçüncü sıra/iu,
};

const FACET_FIELDS: Readonly<Record<string, string>> = {
  power_min_kw: "motorPower",
  seats_min: "seats",
  luggage_min_l: "luggageVolume",
  consumption_max_l_100km: "combinedFuelConsumption",
};

export function technicalDailyLifeFieldForQuestionPurpose(purpose: string | undefined): string | undefined {
  return purpose?.startsWith("CATALOG_FACET:") ? FACET_FIELDS[purpose.slice("CATALOG_FACET:".length)] : undefined;
}

export function mentionedTechnicalDailyLifeFields(text: string): readonly string[] {
  return Object.entries(FIELD_TRIGGERS).filter(([, pattern]) => pattern.test(text)).map(([field]) => field);
}

const STOP_WORDS = new Set(["bir", "ve", "ile", "için", "gibi", "daha", "olan", "olarak", "bu", "mi", "mı", "mu", "mü"]);

function normalize(text: string): string {
  return text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function tokens(text: string): readonly string[] {
  return normalize(text).split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function contextsFromText(text: string): readonly UsageContext[] {
  const contexts: UsageContext[] = [];
  const add = (context: UsageContext, pattern: RegExp) => { if (pattern.test(text)) contexts.push(context); };
  add("CITY_DAILY", /şehir|günlük|işe gid/iu);
  add("HIGHWAY", /otoyol|uzun yol|şehirler arası/iu);
  add("FAMILY", /aile|çocuk|puset|bebek/iu);
  add("TRAVEL", /tatil|seyahat|bavul|valiz|havaliman/iu);
  add("SHOPPING", /market|alışveriş/iu);
  add("SPORT_HOBBY", /spor|hobi|kamp/iu);
  add("PARKING", /park|garaj|dar sokak|sütun/iu);
  add("PERFORMANCE", /performans|güç|hızlan|atak|canlı/iu);
  add("CHARGING_HOME", /evde şarj|işte şarj/iu);
  add("CHARGING_PUBLIC", /hızlı şarj|istasyon|şarj mola/iu);
  add("OPERATING_COST", /tüketim|yakıt|maliyet|ekonom/iu);
  return [...new Set(contexts)];
}

function mappingScore(text: string, mapping: TechnicalDailyLifeMapping): { score: number; signal?: string } {
  const normalizedText = normalize(text);
  const textTokens = new Set(tokens(text));
  const candidates = [
    ...mapping.userIntentSignals,
    ...mapping.dailyLifeExamples.map((example) => example.text),
  ];
  let best = 0;
  let matchedSignal: string | undefined;
  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate);
    const candidateTokens = tokens(candidate);
    const overlap = candidateTokens.filter((token) => textTokens.has(token)).length;
    const score = normalizedCandidate.length > 5 && normalizedText.includes(normalizedCandidate)
      ? 1
      : overlap / Math.max(2, Math.min(textTokens.size, candidateTokens.length));
    if (score > best) {
      best = score;
      matchedSignal = candidate;
    }
  }
  return { score: best, signal: matchedSignal };
}

export function interpretTechnicalDailyLifeText(
  text: string,
  sourceTurn: number,
): CarsTechnicalDailyLifeInterpretation | undefined {
  const candidateFields = layer.fields.filter((field) => FIELD_TRIGGERS[field.technicalField]?.test(text));
  let best: { field: string; mapping: TechnicalDailyLifeMapping; score: number; signal?: string } | undefined;
  for (const field of candidateFields) {
    for (const mapping of field.usageMappings) {
      if (mapping.interpretationClass === "DECISION_SAFE"
        || (!mapping.decisionUse.includes("INTERPRET_USER_NEED") && !mapping.decisionUse.includes("ASK_USER_FRIENDLY_QUESTION"))) continue;
      const scored = mappingScore(text, mapping);
      if (scored.score >= 0.34 && (!best || scored.score > best.score)) {
        best = { field: field.technicalField, mapping, score: scored.score, signal: scored.signal };
      }
    }
  }
  if (!best) return undefined;
  return {
    mappingId: best.mapping.mappingId,
    technicalField: best.field,
    interpretationClass: best.mapping.interpretationClass,
    rankingEffect: best.mapping.rankingEffect,
    approximationConfidence: best.mapping.approximationConfidence,
    sourceTurn,
    sourceText: text,
    activationSource: "USER_TEXT",
    matchedSignal: best.signal,
    selectedUsageContexts: contextsFromText(text),
    confirmedForHardFilter: false,
    sourceAuthority: "OWNER_EDITORIAL",
    decisionUse: best.mapping.decisionUse,
  };
}

export function interpretationFromOption(
  semanticValue: string,
  sourceTurn: number,
  sourceText: string,
): CarsTechnicalDailyLifeInterpretation | undefined {
  if (!semanticValue.startsWith("TECHNICAL_DAILY_LIFE:")) return undefined;
  const mappingId = semanticValue.slice("TECHNICAL_DAILY_LIFE:".length);
  for (const field of layer.fields) {
    const mapping = field.usageMappings.find((item) => item.mappingId === mappingId);
    if (!mapping) continue;
    return {
      mappingId,
      technicalField: field.technicalField,
      interpretationClass: mapping.interpretationClass,
      rankingEffect: mapping.rankingEffect,
      approximationConfidence: mapping.approximationConfidence,
      sourceTurn,
      sourceText,
      activationSource: "ADVISOR_OPTION",
      selectedUsageContexts: mapping.usageContext,
      confirmedForHardFilter: false,
      sourceAuthority: "OWNER_EDITORIAL",
      decisionUse: mapping.decisionUse,
    };
  }
  return undefined;
}

const REQUIREMENT_FIELDS: Partial<Record<CarsRequirementKey, string>> = {
  BUDGET_MAX_TRY: "newVehiclePrice",
  BODY_TYPE: "bodyStyle",
  FUEL: "fuelType",
  MIN_POWER_KW: "motorPower",
  TRANSMISSION: "transmission",
  DRIVETRAIN: "drivenWheels",
  MIN_SEATS: "seats",
  MIN_CARGO_L: "luggageVolume",
  MAX_CONSUMPTION_L_100KM: "combinedFuelConsumption",
};

export function directTechnicalDailyLifeInterpretations(
  keys: readonly CarsRequirementKey[],
  sourceTurn: number,
  sourceText: string,
): readonly CarsTechnicalDailyLifeInterpretation[] {
  const interpretations: CarsTechnicalDailyLifeInterpretation[] = [];
  for (const key of keys) {
    const technicalField = REQUIREMENT_FIELDS[key];
    if (!technicalField) continue;
    const mapping = layer.fields.find((field) => field.technicalField === technicalField)?.usageMappings
      .find((item) => item.interpretationClass === "DECISION_SAFE");
    if (!mapping) continue;
    interpretations.push({
      mappingId: mapping.mappingId,
      technicalField,
      interpretationClass: mapping.interpretationClass,
      rankingEffect: mapping.rankingEffect,
      approximationConfidence: mapping.approximationConfidence,
      sourceTurn,
      sourceText,
      activationSource: "USER_TEXT",
      selectedUsageContexts: ["USER_EXPLICIT_TECHNICAL_REQUIREMENT"],
      confirmedForHardFilter: true,
      sourceAuthority: "OWNER_EDITORIAL",
      decisionUse: mapping.decisionUse,
    });
  }
  return interpretations;
}
