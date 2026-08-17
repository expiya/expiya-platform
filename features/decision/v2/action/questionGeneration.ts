import type { CatalogSnapshot, CatalogVariantSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { ActiveConstraintProjection } from "../filter/types";
import { QUESTION_STAGE_ORDER, type QuestionCandidate, type QuestionStage } from "./types";
import { projectQuestionStageCompletion, stagePrerequisitesComplete } from "./stageCompletion";

const FUEL_LABELS: Readonly<Record<string, string>> = Object.freeze({ GASOLINE: "Benzin", DIESEL: "Dizel", LPG: "LPG", MHEV: "Hafif hibrit", HEV: "Tam hibrit", PHEV: "Şarj edilebilir hibrit", BEV: "Elektrik", HYDROGEN: "Hidrojen" });
const BODY_LABELS: Readonly<Record<string, string>> = Object.freeze({ Sedan: "Sedan", Hatchback: "Hatchback", SUV: "SUV/crossover", Crossover: "SUV/crossover", Coupe: "Coupe", Convertible: "Üstü açılır", Liftback: "Liftback", "Station Wagon": "Station wagon", Pickup: "Pickup", "Panel Van": "Kapalı kasa ticari", "Chassis Cab": "Şasi kabin", "Passenger Van": "Yolcu vanı", MPV: "MPV" });
const USAGE_OPTIONS = Object.freeze([
  ["URBAN_DAILY", "Günlük şehir içi"], ["FAMILY", "Aile ve yolcu kullanımı"], ["LONG_DISTANCE", "Uzun yol"],
  ["URBAN_DELIVERY", "Şehir içi dağıtım"], ["GENERAL_CARGO", "Yük taşıma"], ["ROUGH_ROAD", "Bozuk yol / köy yolu"],
  ["PASSENGER_TRANSPORT", "Yolcu taşıma"], ["MUD_SNOW", "Çamur veya kar"], ["SERIOUS_OFF_ROAD", "Ciddi arazi"], ["MIXED_PASSENGER", "Karma kullanım"],
] as const);

function activeFields(constraints: ActiveConstraintProjection): Set<string> {
  return new Set([...constraints.activeHardConstraints, ...constraints.activeNonHardConstraints].map((item) => item.fieldId));
}

function valueFor(variant: CatalogVariantSnapshot, field: string): string | undefined {
  if (field === "bodyStyle") return variant.decisionFacts.bodyStyle.value === "Crossover" ? "SUV" : variant.decisionFacts.bodyStyle.value;
  if (field === "fuelType") return variant.decisionFacts.powertrain.fuelType.value;
  if (field === "transmission") return /manual/iu.test(variant.decisionFacts.powertrain.transmission.value) ? "MANUAL" : "AUTOMATIC";
  if (field === "drivenWheels") return variant.decisionFacts.powertrain.drivenWheels?.value;
  if (field === "seats") return variant.decisionFacts.dimensions.seats?.value.toString();
  return undefined;
}

function label(field: string, value: string): string {
  if (field === "fuelType") return FUEL_LABELS[value] ?? value;
  if (field === "bodyStyle") return BODY_LABELS[value] ?? value;
  if (field === "transmission") return value === "MANUAL" ? "Manuel" : "Otomatik";
  if (field === "seats") return `${value} koltuk`;
  if (field === "drivenWheels") return value === "FWD" ? "Önden çekiş" : value === "RWD" ? "Arkadan itiş" : value === "AWD" ? "Dört çeker" : value;
  return value;
}

const previousStages = (stage: QuestionStage): readonly QuestionStage[] => Object.freeze(QUESTION_STAGE_ORDER.slice(0, QUESTION_STAGE_ORDER.indexOf(stage)));

export function generateMaterialQuestionCandidates(input: {
  readonly snapshot: CatalogSnapshot;
  readonly candidateIds: readonly string[];
  readonly memory: ConversationMemory;
  readonly constraints: ActiveConstraintProjection;
  readonly comparisonScope: boolean;
}): { readonly unansweredDecisionFields: readonly string[]; readonly questionCandidates: readonly QuestionCandidate[]; readonly stageCompletion: readonly import("./types").QuestionStageCompletion[] } {
  const candidateSet = new Set(input.candidateIds);
  const variants = input.snapshot.variants.filter((variant) => candidateSet.has(variant.id));
  const answered = activeFields(input.constraints);
  // A concrete cargo/passenger architecture already answers the practical
  // body-shape question. Asking Sedan/SUV/Panel Van again would contradict the
  // user's stated use case even though the two facts live on separate axes.
  if (answered.has("usageArchitecture")) answered.add("bodyStyle");
  const closed = new Set([
    ...input.memory.materialQuestionHistory.filter((item) => ["ANSWERED", "DECLINED", "SUPERSEDED"].includes(item.answerStatus)).map((item) => item.field),
    ...input.memory.events.filter((event): event is Extract<typeof event, { eventType: "CONSTRAINT" }> => event.eventType === "CONSTRAINT" && (event.kind === "DECLINED" || event.decisionEffect === "NONE")).map((event) => event.field),
  ]);
  const usageTemporarilyDeferred = input.memory.materialQuestionHistory.some((item) => item.field === "usageScenario" && item.answerStatus === "DEFERRED");
  const usageAnswered = answered.has("usageScenario") || answered.has("usageArchitecture") || closed.has("usageScenario") || usageTemporarilyDeferred || input.comparisonScope;
  const usageScenario = input.constraints.activeHardConstraints.find((item) => item.fieldId === "usageScenario")?.value
    ?? input.constraints.activeNonHardConstraints.find((item) => item.fieldId === "usageScenario")?.normalizedValue;
  const activeFuelPreference = input.constraints.activeHardConstraints.find((item) => item.fieldId === "fuelType")?.value
    ?? input.constraints.activeNonHardConstraints.find((item) => item.fieldId === "fuelType")?.normalizedValue;
  const batteryElectricSelected = typeof activeFuelPreference === "object" && activeFuelPreference !== null && "value" in activeFuelPreference
    && (activeFuelPreference as { value?: unknown }).value === "BEV";
  const architectureAnswered = answered.has("usageArchitecture") || answered.has("bodyStyle") || input.comparisonScope;
  const fields = ["bodyStyle", "seats", "drivenWheels", "fuelType", "transmission"] as const;
  const candidates: QuestionCandidate[] = [];
  const unanswered: string[] = [];

  const candidateIds = Object.freeze([...candidateSet].sort());
  const makeCandidate = (inputCandidate: Pick<QuestionCandidate, "question" | "stage" | "materiality" | "informationGain" | "conversationalRelevance" | "reasonCodes" | "candidateReductionValue" | "compatibleCandidateIds"> & { readonly eligible?: boolean }): QuestionCandidate => Object.freeze({
    ...inputCandidate,
    eligible: inputCandidate.eligible ?? true,
    blockedUntilStagesComplete: previousStages(inputCandidate.stage),
    decisionChangeProbability: inputCandidate.materiality,
    conflictResolutionValue: 0,
    contextualRelevance: inputCandidate.conversationalRelevance,
    answerability: 1,
    cognitiveLoad: inputCandidate.question.options.length > 4 ? 0.5 : 0.2,
    repetitionRisk: 0,
    timingPenalty: 0,
    technicalMismatchPenalty: 0,
  });

  if (!usageAnswered && !closed.has("usageScenario")) {
    unanswered.push("usageScenario");
    candidates.push(makeCandidate({
      stage: "USAGE_CONTEXT", materiality: 3, informationGain: 1, conversationalRelevance: 3,
      reasonCodes: Object.freeze(["USAGE_CONTEXT_REQUIRED_BEFORE_TECHNICAL_DISCOVERY"]), candidateReductionValue: 0, compatibleCandidateIds: candidateIds,
      question: Object.freeze({ id: `v2q.usageScenario.${input.memory.turn + 1}`, stableSemanticKey: "discovery.usageScenario", field: "usageScenario", promptIntent: "CLARIFY_REQUIREMENT", options: Object.freeze(USAGE_OPTIONS.map(([value, userFacingLabel]) => Object.freeze({ id: `v2q.usage.${value.toLocaleLowerCase("tr-TR")}`, semanticValue: value, userFacingLabel, provenance: Object.freeze({ source: "CURRENT_CANDIDATE_POOL" as const, candidatePoolFingerprint: input.memory.decisionFingerprint, supportingCandidateIds: candidateIds, authorityReference: input.snapshot.authority.catalogFingerprint }) }))), answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: "Önce aracın gerçek yaşamda hangi işi yapacağını belirler." }),
    }));
  }

  for (const field of fields) {
    if (answered.has(field) || closed.has(field)) continue;
    if (field === "transmission" && batteryElectricSelected) continue;
    const groups = new Map<string, string[]>();
    for (const variant of variants) {
      const value = valueFor(variant, field);
      if (!value) continue;
      groups.set(value, [...(groups.get(value) ?? []), variant.id]);
    }
    if (groups.size < 2) continue;
    const stage: QuestionStage = field === "bodyStyle" ? "VEHICLE_ARCHITECTURE" : field === "seats" || field === "drivenWheels" ? "FUNCTIONAL_NEEDS" : field === "fuelType" ? "ENERGY_FIT" : "TECHNICAL_PREFERENCES";
    if (field === "bodyStyle" && !usageAnswered) continue;
    if (field === "bodyStyle" && architectureAnswered) continue;
    const cargoScenario = ["URBAN_DELIVERY", "GENERAL_CARGO"].includes(String(usageScenario));
    if (field === "bodyStyle" && cargoScenario) {
      for (const [value] of [...groups]) if (!["Panel Van", "Pickup", "Chassis Cab"].includes(value)) groups.delete(value);
      if (groups.size < 2) continue;
    }
    const passengerTransport = String(usageScenario) === "PASSENGER_TRANSPORT";
    if (field === "bodyStyle" && passengerTransport) {
      for (const [value] of [...groups]) if (!["Passenger Van", "MPV"].includes(value)) groups.delete(value);
      if (groups.size < 2) continue;
    }
    const terrainScenario = ["ROUGH_ROAD", "MUD_SNOW", "SERIOUS_OFF_ROAD"].includes(String(usageScenario));
    if (field === "bodyStyle" && terrainScenario) {
      for (const [value] of [...groups]) if (!["SUV", "Crossover", "Pickup"].includes(value)) groups.delete(value);
      if (groups.size < 2) continue;
    }
    if ((field === "seats" && !["FAMILY", "PASSENGER_TRANSPORT"].includes(String(usageScenario))) || (field === "drivenWheels" && !["ROUGH_ROAD", "MUD_SNOW", "SERIOUS_OFF_ROAD"].includes(String(usageScenario)))) continue;
    unanswered.push(field);
    const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "tr"));
    const options = sorted.slice(0, 5).map(([value, ids]) => Object.freeze({
      id: `v2q.${field}.${value.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/gu, "-")}`,
      semanticValue: value,
      userFacingLabel: label(field, value),
      provenance: Object.freeze({ source: "CURRENT_CANDIDATE_POOL" as const, candidatePoolFingerprint: input.memory.decisionFingerprint, supportingCandidateIds: Object.freeze(ids.sort()), authorityReference: input.snapshot.authority.catalogFingerprint }),
    }));
    const largest = sorted[0]?.[1].length ?? variants.length;
    const reduction = variants.length ? 1 - largest / variants.length : 0;
    candidates.push(makeCandidate({
      question: Object.freeze({ id: `v2q.${field}.${input.memory.turn + 1}`, stableSemanticKey: `discovery.${field}`, field, promptIntent: "DISCRIMINATE_CANDIDATES", options: Object.freeze(options), answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: input.comparisonScope ? "İki model kapsamındaki varyantları ayırır." : "Mevcut aday havuzunu anlamlı biçimde daraltır." }),
      stage, materiality: input.comparisonScope ? 1.5 : field === "bodyStyle" ? 2 : 1,
      informationGain: reduction, conversationalRelevance: field === "bodyStyle" ? 2 : 1,
      reasonCodes: Object.freeze([`${stage}_CANDIDATE_DISCRIMINATOR`]), candidateReductionValue: reduction * 4,
      compatibleCandidateIds: candidateIds,
    }));
  }

  if (!input.memory.budget.budgetExcluded && input.memory.budget.budgetUnknown && !closed.has("budget")) {
    unanswered.push("budget");
    candidates.push(makeCandidate({
      question: Object.freeze({ id: `v2q.budget.${input.memory.turn + 1}`, stableSemanticKey: "discovery.budget", field: "budget", promptIntent: "CLARIFY_REQUIREMENT", options: Object.freeze([]), answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: "Fiyatı değerlendirilebilen adayların bütçe uygunluğunu ayırır." }),
      stage: "BUDGET", materiality: input.candidateIds.length <= 10 ? 2 : 0.5, informationGain: 0,
      conversationalRelevance: input.candidateIds.length <= 10 ? 2 : 0.5,
      reasonCodes: Object.freeze([input.candidateIds.length <= 10 ? "BUDGET_MATERIAL_AFTER_NARROWING" : "BUDGET_DEFERRED_DURING_DISCOVERY"]),
      candidateReductionValue: input.candidateIds.length <= 10 ? 3 : 1, compatibleCandidateIds: candidateIds,
    }));
  }

  const provisionalCompletion = projectQuestionStageCompletion({ memory: input.memory, activeFields: answered, candidates, comparisonScope: input.comparisonScope });
  const gatedCandidates = candidates.map((candidate) => Object.freeze({ ...candidate, eligible: candidate.eligible && stagePrerequisitesComplete(candidate, provisionalCompletion) }));
  const stageCompletion = projectQuestionStageCompletion({ memory: input.memory, activeFields: answered, candidates: gatedCandidates, comparisonScope: input.comparisonScope });
  return Object.freeze({ unansweredDecisionFields: Object.freeze([...new Set(unanswered)]), questionCandidates: Object.freeze(gatedCandidates), stageCompletion });
}
