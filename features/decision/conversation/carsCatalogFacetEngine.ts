import { activeCatalogPayload as catalogPayload } from "@/data/production/catalog/activeCatalog.generated";
import type { PublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import type { CarsConversationTrace, CarsQuestionPurpose } from "@/types/carsConversation";
import {
  carsDecisionFacetDefinitions,
  declarativeFacetPredicate,
  validateDecisionFacetCoverage,
  valueAtPath,
} from "./carsDecisionFacetCatalog";
import { scoreVehiclePersonaTraits } from "@/features/vehicle-data/vehiclePersona";
import { getTechnicalDailyLifeMappings, resolveTechnicalDailyLifeMappings } from "@/features/vehicle-data/technicalDailyLifeResolver";

type RecordItem = PublishedCatalog["records"][number];

export interface CatalogFacetCandidate {
  readonly id: string;
  readonly record: RecordItem;
  readonly brand: string;
  readonly model: string;
  readonly trim: string;
  readonly body: string;
  readonly fuel: string;
  readonly transmission: "AUTOMATIC" | "MANUAL" | "OTHER";
  readonly drivetrain: string;
  readonly priceTry: number;
  readonly powerKw: number;
  readonly seats?: number;
  readonly luggageLitres?: number;
  readonly consumption?: number;
}

export interface CatalogFacetQuestion {
  readonly purpose: CarsQuestionPurpose;
  readonly text: string;
  readonly options: readonly string[];
  readonly partitions: Readonly<Record<string, number>>;
  readonly technicalDailyLifeMappingIds?: readonly string[];
}

export interface CatalogFacetEvaluation {
  readonly initialCount: number;
  readonly candidates: readonly CatalogFacetCandidate[];
  readonly appliedFilters: readonly { readonly key: string; readonly value: string | number; readonly before: number; readonly after: number }[];
  readonly nextQuestion?: CatalogFacetQuestion;
  readonly unsupportedAccelerationSeconds?: number;
}

const records = (catalogPayload.records as unknown as PublishedCatalog["records"]);

function transmission(value: string): CatalogFacetCandidate["transmission"] {
  if (/automatic|dual-clutch|reduction|cvt|dct|edc|steptronic|dsg|e-cvt/iu.test(value)) return "AUTOMATIC";
  if (/manual/iu.test(value)) return "MANUAL";
  return "OTHER";
}

function candidate(record: RecordItem): CatalogFacetCandidate {
  const variant = record.variant;
  return {
    id: variant.id,
    record,
    brand: variant.brand.value,
    model: variant.model.value,
    trim: variant.trim.value,
    body: variant.bodyStyle.value.toLocaleUpperCase("tr-TR"),
    fuel: variant.powertrain.fuelType.value,
    transmission: transmission(variant.powertrain.transmission.value),
    drivetrain: variant.powertrain.drivenWheels?.value ?? "UNKNOWN",
    priceTry: record.activeNewPrice.amountTry,
    powerKw: variant.powertrain.powerKw.value,
    seats: variant.dimensions.seats?.value,
    luggageLitres: variant.dimensions.luggageLitres?.value,
    consumption: variant.efficiency.combinedLitresPer100Km?.value,
  };
}

const allCandidates = Object.freeze(records.map(candidate));
validateDecisionFacetCoverage(records, carsDecisionFacetDefinitions);

function latest(trace: CarsConversationTrace, key: string) {
  return [...trace.requirements].reverse().find((entry) => entry.key === key);
}

function bodyMatches(body: string, value: string | number): boolean {
  if (value === "SUV_CROSSOVER") return /SUV|CROSSOVER/iu.test(body);
  if (value === "HATCHBACK") return /HATCHBACK|LIFTBACK/iu.test(body);
  if (value === "SEDAN") return /SEDAN/iu.test(body);
  if (value === "PICKUP") return /PICKUP/iu.test(body);
  if (value === "COUPE") return /COUPE|CONVERTIBLE/iu.test(body);
  return true;
}

function fuelGroup(fuel: string): string {
  if (fuel === "BEV") return "ELECTRIC";
  if (["HEV", "MHEV", "PHEV"].includes(fuel)) return "HYBRID";
  if (fuel === "DIESEL") return "DIESEL";
  return "GASOLINE";
}

function applyFilter(
  current: readonly CatalogFacetCandidate[],
  filters: CatalogFacetEvaluation["appliedFilters"],
  key: string,
  value: string | number,
  predicate: (item: CatalogFacetCandidate) => boolean,
): readonly CatalogFacetCandidate[] {
  const next = current.filter(predicate);
  (filters as { key: string; value: string | number; before: number; after: number }[]).push({ key, value, before: current.length, after: next.length });
  return next;
}

function categoricalQuestion(
  candidates: readonly CatalogFacetCandidate[],
  purpose: CarsQuestionPurpose,
  values: readonly { label: string; matches: (item: CatalogFacetCandidate) => boolean }[],
  text: string,
): CatalogFacetQuestion | undefined {
  const partitions = values.reduce<Record<string, number>>((result, { label, matches }) => {
    const count = candidates.filter(matches).length;
    if (count > 0) result[label] = count;
    return result;
  }, {});
  const options = Object.keys(partitions);
  if (options.length < 2) return undefined;
  return { purpose, text, options, partitions };
}

function questionScore(question: CatalogFacetQuestion, total: number): number {
  const largest = Math.max(...Object.values(question.partitions));
  return total - largest;
}

const FACET_DAILY_LIFE_FIELDS: Readonly<Record<string, string>> = {
  power_min_kw: "motorPower",
  seats_min: "seats",
  luggage_min_l: "luggageVolume",
  consumption_max_l_100km: "combinedFuelConsumption",
};

function sentenceCase(text: string): string {
  return text ? `${text[0].toLocaleUpperCase("tr-TR")}${text.slice(1)}` : text;
}

function dailyLifeQuestionContent(definitionId: string): { text: string; options: readonly string[]; mappingIds: readonly string[] } | undefined {
  const technicalField = FACET_DAILY_LIFE_FIELDS[definitionId];
  if (!technicalField) return undefined;
  const mappings = getTechnicalDailyLifeMappings(technicalField).filter((mapping) => (
    mapping.interpretationClass === "GUIDED_APPROXIMATION"
    && mapping.technicalCondition.operator === "RANGE"
    && mapping.decisionUse.includes("ASK_USER_FRIENDLY_QUESTION")
  ));
  if (mappings.length < 2) return undefined;
  const firstSignals = mappings.map((mapping) => mapping.userIntentSignals[0] ?? "");
  const signalsAreDistinct = new Set(firstSignals.map((signal) => signal.toLocaleLowerCase("tr-TR"))).size === mappings.length;
  const options = mappings.map((mapping, index) => sentenceCase(
    signalsAreDistinct
      ? firstSignals[index]
      : mapping.userFacingExplanations.find((item) => item.level === "SHORT")?.text.replace(/\s*\([^)]*\)\.?$/u, "") ?? firstSignals[index],
  ));
  const question = mappings.flatMap((mapping) => mapping.advisorQuestions)
    .find((item) => item.tone === "FRIENDLY")?.text
    ?? mappings[0].advisorQuestions[0]?.text;
  return question ? { text: question, options, mappingIds: mappings.map((mapping) => mapping.mappingId) } : undefined;
}

function nextQuestion(trace: CarsConversationTrace, candidates: readonly CatalogFacetCandidate[]): CatalogFacetQuestion | undefined {
  const answered = new Set([...trace.answeredQuestionPurposes, ...trace.askedQuestionPurposes]);
  const conversationText = trace.requirements.map((entry) => entry.sourceText).join(" ");
  const transmissionMaterial = /otomatik|manuel|vites|şanzıman/iu.test(conversationText);
  const drivetrainMaterial = /4\s*[x×]\s*4|dört çeker|awd|rwd|fwd|çekiş|arazi|bozuk yol/iu.test(conversationText);
  const questions: CatalogFacetQuestion[] = [
    !latest(trace, "BODY_TYPE") && !answered.has("BODY_TYPE") ? categoricalQuestion(candidates, "BODY_TYPE", [
      { label: "SUV/crossover", matches: (item) => /SUV|CROSSOVER/iu.test(item.body) },
      { label: "Sedan", matches: (item) => /SEDAN/iu.test(item.body) },
      { label: "Hatchback", matches: (item) => /HATCHBACK|LIFTBACK/iu.test(item.body) },
      { label: "Coupe", matches: (item) => /COUPE|CONVERTIBLE/iu.test(item.body) },
      { label: "Pickup", matches: (item) => /PICKUP/iu.test(item.body) },
    ], "Sana uygun seçenekleri en çok gövde tipi ayırıyor. Hangisi sana daha yakın?") : undefined,
    !latest(trace, "FUEL") && !answered.has("FUEL") ? categoricalQuestion(candidates, "FUEL", [
      { label: "Benzin", matches: (item) => fuelGroup(item.fuel) === "GASOLINE" },
      { label: "Dizel", matches: (item) => fuelGroup(item.fuel) === "DIESEL" },
      { label: "Hibrit", matches: (item) => fuelGroup(item.fuel) === "HYBRID" },
      { label: "Elektrik", matches: (item) => fuelGroup(item.fuel) === "ELECTRIC" },
    ], "Kalan seçenekleri en çok yakıt tercihi ayırıyor. Benzin, dizel, hibrit veya elektrikten hangisini istersin?") : undefined,
    transmissionMaterial && !latest(trace, "TRANSMISSION") && !answered.has("TRANSMISSION") ? categoricalQuestion(candidates, "TRANSMISSION", [
      { label: "Otomatik", matches: (item) => item.transmission === "AUTOMATIC" },
      { label: "Manuel", matches: (item) => item.transmission === "MANUAL" },
    ], "Kalan araçlarda vites tercihi belirleyici. Otomatik mi, manuel mi istersin?") : undefined,
    drivetrainMaterial && !latest(trace, "DRIVETRAIN") && !answered.has("DRIVETRAIN") ? categoricalQuestion(candidates, "DRIVETRAIN", [
      { label: "Önden çekiş", matches: (item) => /FWD/iu.test(item.drivetrain) },
      { label: "Arkadan itiş", matches: (item) => /RWD/iu.test(item.drivetrain) },
      { label: "Dört çeker", matches: (item) => /AWD|4X4/iu.test(item.drivetrain) },
    ], "Kalan seçenekleri çekiş düzeni ayırıyor. Önden çekiş, arkadan itiş veya dört çeker tercihin var mı?") : undefined,
  ].filter((item): item is CatalogFacetQuestion => Boolean(item));
  for (const definition of carsDecisionFacetDefinitions) {
    const purpose = definition.questionPurpose as CarsQuestionPurpose;
    if (latest(trace, definition.requirementKey) || answered.has(purpose)) continue;
    if (definition.requirementKey === "MIN_SEATS" && latest(trace, "PARTY_SIZE")) continue;
    const questionTriggered = definition.askByDefault || definition.questionTriggers?.some((source) => new RegExp(source, "iu").test(conversationText));
    if (!questionTriggered) continue;
    const values = candidates
      .map((item) => valueAtPath(item.record, definition.valuePath))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      .sort((left, right) => left - right);
    const distinct = [...new Set(values)];
    if (distinct.length < 2) continue;
    const pivot = distinct[Math.floor(distinct.length / 2)];
    const lower = values.filter((value) => value <= pivot).length;
    const upper = values.filter((value) => value > pivot).length;
    if (lower === 0 || upper === 0) continue;
    const dailyLife = dailyLifeQuestionContent(definition.id);
    const questionText = dailyLife?.text ?? definition.question;
    const questionOptions = dailyLife?.options ?? definition.answerMappings?.map((mapping) => mapping.label) ?? [];
    questions.push({
      purpose,
      text: questionText,
      options: questionOptions,
      partitions: { [`≤ ${pivot}`]: lower, [`> ${pivot}`]: upper },
      technicalDailyLifeMappingIds: dailyLife?.mappingIds,
    });
  }
  return questions.sort((left, right) => questionScore(right, candidates.length) - questionScore(left, candidates.length))[0];
}

export function evaluateCatalogFacets(trace: CarsConversationTrace): CatalogFacetEvaluation {
  let candidates: readonly CatalogFacetCandidate[] = allCandidates;
  const appliedFilters: { key: string; value: string | number; before: number; after: number }[] = [];
  const rejectedIds = new Set(trace.rejectedRecommendationIds.map((id) => id.replace(/^CATALOG:/u, "")));
  if (rejectedIds.size > 0) {
    candidates = applyFilter(candidates, appliedFilters, "REJECTED_CANDIDATES", rejectedIds.size, (item) => !rejectedIds.has(item.id));
  }
  for (const definition of carsDecisionFacetDefinitions) {
    const requirement = latest(trace, definition.requirementKey)?.value;
    if (requirement === undefined) continue;
    const predicate = declarativeFacetPredicate(definition, requirement);
    candidates = applyFilter(candidates, appliedFilters, definition.requirementKey, requirement, (item) => predicate(item.record));
  }
  const body = latest(trace, "BODY_TYPE")?.value;
  if (body !== undefined) candidates = applyFilter(candidates, appliedFilters, "BODY_TYPE", body, (item) => bodyMatches(item.body, body));
  const fuel = latest(trace, "FUEL")?.value;
  if (fuel !== undefined) candidates = applyFilter(candidates, appliedFilters, "FUEL", fuel, (item) => fuelGroup(item.fuel) === fuel);
  const excludedFuel = latest(trace, "FUEL_EXCLUDED")?.value;
  if (excludedFuel !== undefined) candidates = applyFilter(candidates, appliedFilters, "FUEL_EXCLUDED", excludedFuel, (item) => fuelGroup(item.fuel) !== excludedFuel);
  const gearbox = latest(trace, "TRANSMISSION")?.value;
  if (gearbox !== undefined) candidates = applyFilter(candidates, appliedFilters, "TRANSMISSION", gearbox, (item) => item.transmission === gearbox);
  const drivetrain = latest(trace, "DRIVETRAIN")?.value;
  if (drivetrain === "AWD_OR_4X4") candidates = applyFilter(candidates, appliedFilters, "DRIVETRAIN", drivetrain, (item) => /AWD|4X4/iu.test(item.drivetrain));
  if (drivetrain === "FWD") candidates = applyFilter(candidates, appliedFilters, "DRIVETRAIN", drivetrain, (item) => /FWD/iu.test(item.drivetrain));
  if (drivetrain === "RWD") candidates = applyFilter(candidates, appliedFilters, "DRIVETRAIN", drivetrain, (item) => /RWD/iu.test(item.drivetrain));
  const partySize = latest(trace, "PARTY_SIZE")?.value;
  if (typeof partySize === "number" && !latest(trace, "MIN_SEATS")) candidates = applyFilter(candidates, appliedFilters, "PARTY_SIZE", partySize, (item) => item.seats !== undefined && item.seats >= partySize);
  const acceleration = latest(trace, "MAX_ACCELERATION_0_100_S")?.value;
  return {
    initialCount: allCandidates.length,
    candidates,
    appliedFilters,
    nextQuestion: candidates.length > 1 ? nextQuestion(trace, candidates) : undefined,
    unsupportedAccelerationSeconds: typeof acceleration === "number" ? acceleration : undefined,
  };
}

export function selectCatalogFacetWinner(trace: CarsConversationTrace, candidates: readonly CatalogFacetCandidate[]): CatalogFacetCandidate | undefined {
  if (candidates.length === 0) return undefined;
  const text = trace.requirements.map((entry) => entry.sourceText).join(" ");
  const ranked = [...candidates];
  const dailyLifePreferences = (trace.technicalDailyLifeInterpretations ?? []).filter((item) => item.rankingEffect === "SOFT_UNTIL_CONFIRMED");
  const dailyLifeValue = (item: CatalogFacetCandidate, technicalField: string): unknown => {
    if (technicalField === "motorPower") return item.powerKw;
    if (technicalField === "luggageVolume") return item.luggageLitres;
    if (technicalField === "combinedFuelConsumption") return item.consumption;
    if (technicalField === "seats") return item.seats;
    return undefined;
  };
  const dailyLifeDifference = (a: CatalogFacetCandidate, b: CatalogFacetCandidate) => dailyLifePreferences.reduce((difference, preference) => {
    if (difference !== 0) return difference;
    const dependent = (item: CatalogFacetCandidate) => ({ fuelType: item.fuel, bodyStyle: item.body, seats: item.seats });
    const matches = (item: CatalogFacetCandidate) => resolveTechnicalDailyLifeMappings({
      technicalField: preference.technicalField,
      technicalValue: dailyLifeValue(item, preference.technicalField),
      dependentFieldValues: dependent(item),
    }).some((mapping) => mapping.mappingId === preference.mappingId);
    return Number(matches(b)) - Number(matches(a));
  }, 0);
  const requestedTraits = trace.personaPreference?.activated ? trace.personaPreference.requestedTraits : [];
  const personaDifference = (a: CatalogFacetCandidate, b: CatalogFacetCandidate) => requestedTraits.length > 0
    ? scoreVehiclePersonaTraits(b.brand, b.model, requestedTraits).score - scoreVehiclePersonaTraits(a.brand, a.model, requestedTraits).score
    : 0;
  if (/0\s*[-–]?\s*100|performans|güç|hız/iu.test(text)) ranked.sort((a, b) => dailyLifeDifference(a, b) || b.powerKw - a.powerKw || personaDifference(a, b) || a.priceTry - b.priceTry || a.id.localeCompare(b.id));
  else if (/az yak|tüketim|ekonomi/iu.test(text)) ranked.sort((a, b) => dailyLifeDifference(a, b) || (a.consumption ?? Number.POSITIVE_INFINITY) - (b.consumption ?? Number.POSITIVE_INFINITY) || personaDifference(a, b) || a.priceTry - b.priceTry || a.id.localeCompare(b.id));
  else if (/bagaj|bavul|valiz|puset/iu.test(text)) ranked.sort((a, b) => dailyLifeDifference(a, b) || (b.luggageLitres ?? -1) - (a.luggageLitres ?? -1) || personaDifference(a, b) || a.priceTry - b.priceTry || a.id.localeCompare(b.id));
  else ranked.sort((a, b) => dailyLifeDifference(a, b) || personaDifference(a, b) || a.priceTry - b.priceTry || b.powerKw - a.powerKw || a.id.localeCompare(b.id));
  return ranked[0];
}
