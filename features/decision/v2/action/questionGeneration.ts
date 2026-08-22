import type { CatalogSnapshot, CatalogVariantSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { ActiveConstraintProjection } from "../filter/types";
import { QUESTION_STAGE_ORDER, type QuestionCandidate, type QuestionStage } from "./types";
import { projectQuestionStageCompletion, stagePrerequisitesComplete } from "./stageCompletion";
import type { PersonaLayerSnapshot } from "../layers/types";

const FUEL_LABELS: Readonly<Record<string, string>> = Object.freeze({ GASOLINE: "Benzin", DIESEL: "Dizel", LPG: "LPG", MHEV: "Hafif hibrit", HEV: "Tam hibrit", PHEV: "Şarj edilebilir hibrit", BEV: "Elektrik", HYDROGEN: "Hidrojen" });
const BODY_LABELS: Readonly<Record<string, string>> = Object.freeze({ Sedan: "Sedan", Hatchback: "Hatchback", SUV: "SUV/crossover", Crossover: "SUV/crossover", Coupe: "Coupe", Convertible: "Üstü açılır", Liftback: "Liftback", "Station Wagon": "Station wagon", Pickup: "Pickup", "Panel Van": "Kapalı kasa ticari", "Chassis Cab": "Şasi kabin", "Passenger Van": "Yolcu vanı", MPV: "MPV" });
const USAGE_OPTIONS = Object.freeze([
  ["URBAN_DAILY", "Günlük şehir içi"], ["FAMILY", "Aile ve yolcu kullanımı"], ["LONG_DISTANCE", "Uzun yol"],
  ["URBAN_DELIVERY", "Şehir içi dağıtım"], ["GENERAL_CARGO", "Yük taşıma"], ["ROUGH_ROAD", "Kırsalda kullanım"],
  ["PASSENGER_TRANSPORT", "Yolcu taşıma"], ["MUD_SNOW", "Çamur veya kar"], ["SERIOUS_OFF_ROAD", "Ciddi arazi"],
] as const);

function activeFields(constraints: ActiveConstraintProjection): Set<string> {
  return new Set([...constraints.activeHardConstraints, ...constraints.activeNonHardConstraints].map((item) => item.fieldId));
}

function activeConstraintValue(constraints: ActiveConstraintProjection, fieldId: string): unknown {
  const raw = constraints.activeHardConstraints.find((item) => item.fieldId === fieldId)?.value
    ?? constraints.activeNonHardConstraints.find((item) => item.fieldId === fieldId)?.normalizedValue;
  return typeof raw === "object" && raw !== null && "value" in raw ? (raw as { value: unknown }).value : raw;
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

function boundedFacetStatistics(groups: ReadonlyMap<string, readonly string[]>, candidateCount: number): Readonly<{ informationGain: number; expectedReduction: number }> {
  if (candidateCount <= 1 || groups.size <= 1) return Object.freeze({ informationGain: 0, expectedReduction: 0 });
  const probabilities = [...groups.values()].map((ids) => ids.length / candidateCount).filter((probability) => probability > 0);
  const entropy = -probabilities.reduce((sum, probability) => sum + probability * Math.log2(probability), 0);
  const maximumEntropy = Math.log2(groups.size);
  return Object.freeze({
    informationGain: maximumEntropy > 0 ? entropy / maximumEntropy : 0,
    expectedReduction: 1 - probabilities.reduce((sum, probability) => sum + probability ** 2, 0),
  });
}

const USAGE_DESCRIPTIONS: Readonly<Record<string, string>> = Object.freeze({
  URBAN_DAILY: "🏙️ Kısa mesafe, park kolaylığı ve günlük pratiklik.", FAMILY: "👨‍👩‍👧 Yolcu, arka koltuk ve bagaj ihtiyacı.", LONG_DISTANCE: "🛣️ Uzun sürüşlerde konfor ve kullanışlılık.",
  URBAN_DELIVERY: "📦 Şehir içinde mal veya paket dağıtımı.", GENERAL_CARGO: "🧰 Yük alanı ve ticari taşıma önceliği.", PASSENGER_TRANSPORT: "👥 Birden fazla yolcuyu düzenli taşıma.",
  ROUGH_ROAD: "🌾 Asfalt dışı kırsal ve bozuk yollar; ağır arazi değildir.", MUD_SNOW: "🌨️ Kaygan zeminlerde yükseltilmiş gövde avantajı.", SERIOUS_OFF_ROAD: "🏔️ Yalnız dört çeker arazi odaklı seçenekler.",
});
const VALUE_DESCRIPTIONS: Readonly<Record<string, string>> = Object.freeze({
  Sedan: "Ayrı bagajlı, klasik otomobil gövdesi.", Hatchback: "Kısa gövdeli, bagaj kapağı kabinle birleşik.", SUV: "Yüksek oturma ve daha iri gövde.", "Fastback SUV": "SUV yüksekliğini arkaya doğru alçalan sportif tavan çizgisiyle birleştirir.", Liftback: "Sedan görünümüne yakın; arka camla birlikte açılan geniş bagaj kapağı vardır.", Pickup: "Açık yük kasalı, yolcu kabinli araç.",
  "Panel Van": "Kapalı ve geniş yük bölmeli ticari araç.", "Chassis Cab": "🚚 Arkasına kasa veya özel üstyapı takılan çıplak şasi.", "Passenger Van": "Çok yolcu taşımaya göre düzenlenmiş van.", MPV: "Geniş ve esnek yolcu kabinli aile aracı.",
  GASOLINE: "⛽ Sessiz ve tanıdık kullanım; kısa/karma sürüşe uygun.", DIESEL: "🛣️ Düzenli uzun yol ve yüksek kilometrede düşünülebilir.", LPG: "⛽ Benzinli motora alternatif yakıt; tank yerleşimi ve istasyon erişimi kontrol edilmelidir.", BEV: "🔌 Ev veya rota şarjı uygunsa sessiz, tamamen elektrikli kullanım.", HEV: "♻️ Prize takmadan şehir içi dur-kalkta elektrik desteği.", MHEV: "Motoru destekleyen hafif elektrik sistemi; elektrikli sürüş sınırlıdır.", PHEV: "🔋 Şarj edilebilir; kısa mesafeyi elektrikle yapabilir.",
  AUTOMATIC: "Vitesi araç değiştirir; yoğun trafikte daha rahattır.", MANUAL: "Vites ve debriyajı sürücü yönetir.", FWD: "Güç ön tekerleklere gider; günlük kullanımda yaygındır.", RWD: "Güç arka tekerleklere gider.", AWD: "Güç dört tekerleğe aktarılabilir; tutunmaya yardımcı olur.",
});
const PERSONA_DESCRIPTIONS: Readonly<Record<string, string>> = Object.freeze({ DESIGN: "tasarım", DRIVING_ENGAGEMENT: "sürüş hissi", COMFORT: "konfor", PRACTICALITY: "pratiklik", TECHNOLOGY: "teknoloji", PRESTIGE: "prestij", VALUE: "fiyat/değer dengesi", ADVENTURE: "macera", FAMILY: "aile kullanımı", URBAN: "şehir kullanımı", COMMERCIAL: "ticari kullanım", SUSTAINABILITY: "sürdürülebilirlik", MINIMALISM: "sadelik" });
function description(field: string, value: string): string | undefined { return VALUE_DESCRIPTIONS[value] ?? (field === "seats" ? "Düzenli taşıyacağın kişi sayısını belirtir." : undefined); }

const previousStages = (stage: QuestionStage): readonly QuestionStage[] => Object.freeze(QUESTION_STAGE_ORDER.slice(0, QUESTION_STAGE_ORDER.indexOf(stage)));

export function generateMaterialQuestionCandidates(input: {
  readonly snapshot: CatalogSnapshot;
  readonly candidateIds: readonly string[];
  readonly memory: ConversationMemory;
  readonly constraints: ActiveConstraintProjection;
  readonly comparisonScope: boolean;
  readonly personaLayer?: PersonaLayerSnapshot;
}): { readonly unansweredDecisionFields: readonly string[]; readonly questionCandidates: readonly QuestionCandidate[]; readonly stageCompletion: readonly import("./types").QuestionStageCompletion[] } {
  const candidateSet = new Set(input.candidateIds);
  const variants = input.snapshot.variants.filter((variant) => candidateSet.has(variant.id));
  const answered = activeFields(input.constraints);
  // A broad PASSENGER_CAR architecture does not answer the concrete body-style
  // question: it still leaves Sedan, Hatchback, SUV and other shapes open.
  // Only an explicitly supplied concrete non-passenger architecture may close
  // the body question when the candidate pool itself has already converged.
  const usageArchitecture = activeConstraintValue(input.constraints, "usageArchitecture");
  const concreteArchitectureAnswered = ["ENCLOSED_CARGO", "OPEN_CARGO", "CAB_CHASSIS"].includes(String(usageArchitecture));
  if (concreteArchitectureAnswered) answered.add("bodyStyle");
  const closed = new Set([
    ...input.memory.materialQuestionHistory.filter((item) => ["ANSWERED", "DECLINED", "SUPERSEDED"].includes(item.answerStatus)).map((item) => item.field),
    ...input.memory.events.filter((event): event is Extract<typeof event, { eventType: "CONSTRAINT" }> => event.eventType === "CONSTRAINT" && (event.kind === "DECLINED" || event.decisionEffect === "NONE")).map((event) => event.field),
  ]);
  const usageTemporarilyDeferred = input.memory.materialQuestionHistory.some((item) => item.field === "usageScenario" && item.answerStatus === "DEFERRED");
  const usageAnswered = answered.has("usageScenario") || answered.has("usageArchitecture") || closed.has("usageScenario") || usageTemporarilyDeferred;
  const usageScenario = input.constraints.activeHardConstraints.find((item) => item.fieldId === "usageScenario")?.value
    ?? input.constraints.activeNonHardConstraints.find((item) => item.fieldId === "usageScenario")?.normalizedValue;
  const activeFuelPreference = input.constraints.activeHardConstraints.find((item) => item.fieldId === "fuelType")?.value
    ?? input.constraints.activeNonHardConstraints.find((item) => item.fieldId === "fuelType")?.normalizedValue;
  const batteryElectricSelected = typeof activeFuelPreference === "object" && activeFuelPreference !== null && "value" in activeFuelPreference
    && (activeFuelPreference as { value?: unknown }).value === "BEV";
  const architectureAnswered = answered.has("bodyStyle");
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
      question: Object.freeze({ id: `v2q.usageScenario.${input.memory.turn + 1}`, stableSemanticKey: "discovery.usageScenario", field: "usageScenario", promptIntent: "CLARIFY_REQUIREMENT", options: Object.freeze(USAGE_OPTIONS.map(([value, userFacingLabel]) => Object.freeze({ id: `v2q.usage.${value.toLocaleLowerCase("tr-TR")}`, semanticValue: value, userFacingLabel, userFacingDescription: USAGE_DESCRIPTIONS[value], provenance: Object.freeze({ source: "CURRENT_CANDIDATE_POOL" as const, candidatePoolFingerprint: input.memory.decisionFingerprint, supportingCandidateIds: candidateIds, authorityReference: input.snapshot.authority.catalogFingerprint }) }))), answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: "Önce aracın gerçek yaşamda hangi işi yapacağını belirler." }),
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
      ...(description(field, value) ? { userFacingDescription: description(field, value) } : {}),
      provenance: Object.freeze({ source: "CURRENT_CANDIDATE_POOL" as const, candidatePoolFingerprint: input.memory.decisionFingerprint, supportingCandidateIds: Object.freeze(ids.sort()), authorityReference: input.snapshot.authority.catalogFingerprint }),
    }));
    const facetStatistics = boundedFacetStatistics(groups, variants.length);
    candidates.push(makeCandidate({
      question: Object.freeze({ id: `v2q.${field}.${input.memory.turn + 1}`, stableSemanticKey: `discovery.${field}`, field, promptIntent: "DISCRIMINATE_CANDIDATES", options: Object.freeze(options), selectionMode: field === "bodyStyle" || field === "fuelType" ? "MULTIPLE" as const : "SINGLE" as const, minimumSelections: 1, maximumSelections: field === "bodyStyle" || field === "fuelType" ? Math.min(options.length, 5) : 1, answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: input.comparisonScope ? "İki model kapsamındaki varyantları ayırır." : "Mevcut aday havuzunu anlamlı biçimde daraltır." }),
      stage, materiality: input.comparisonScope ? 1.5 : field === "bodyStyle" ? 2 : 1,
      informationGain: facetStatistics.informationGain, conversationalRelevance: field === "bodyStyle" ? 2 : 1,
      reasonCodes: Object.freeze([`${stage}_CANDIDATE_DISCRIMINATOR`, "BOUNDED_POOL_INFORMATION_GAIN"]), candidateReductionValue: facetStatistics.expectedReduction * 4,
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

  if (candidates.length === 0 && variants.length > 3) {
    for (const field of ["bodyStyle", "fuelType"] as const) {
      const selected = activeConstraintValue(input.constraints, field);
      if (!Array.isArray(selected) || selected.length < 2) continue;
      const canonicalValues = [...new Set(selected.filter((value): value is string => typeof value === "string")
        .map((value) => field === "bodyStyle" && value === "Crossover" ? "SUV" : value))];
      const groups = canonicalValues.map((value) => [value, variants.filter((variant) => valueFor(variant, field) === value).map((variant) => variant.id)] as const)
        .filter((entry) => entry[1].length > 0);
      if (groups.length < 2) continue;
      if (closed.has(field)) continue;
      unanswered.push(field);
      candidates.push(makeCandidate({
        question: Object.freeze({ id: `v2q.refinement.${field}.${input.memory.turn + 1}`, stableSemanticKey: `refinement.${field}`, field, promptIntent: "DISCRIMINATE_CANDIDATES", options: Object.freeze(groups.map(([value, ids]) => Object.freeze({ id: `v2q.refinement.${field}.${value.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/gu, "-")}`, semanticValue: value, userFacingLabel: label(field, value), provenance: Object.freeze({ source: "CURRENT_CANDIDATE_POOL" as const, candidatePoolFingerprint: input.memory.decisionFingerprint, supportingCandidateIds: Object.freeze(ids.sort()), authorityReference: input.snapshot.authority.catalogFingerprint }) }))), selectionMode: "SINGLE", minimumSelections: 1, maximumSelections: 1, answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: "Birden fazla açık tercihten hangisinin adayları üçe indirmek için öncelikli olacağını belirler." }),
        stage: "SOFT_DIFFERENTIATION", materiality: 3, informationGain: 1, conversationalRelevance: 3,
        reasonCodes: Object.freeze(["MULTI_SELECTION_REFINEMENT_REQUIRED_BEFORE_OFFER"]), candidateReductionValue: 4, compatibleCandidateIds: candidateIds,
      }));
      break;
    }
  }

  if (candidates.length === 0 && variants.length > 3 && !closed.has("catalogIdentity")) {
    const brandGroups = new Map<string, string[]>();
    for (const variant of variants) brandGroups.set(variant.brand, [...(brandGroups.get(variant.brand) ?? []), variant.id]);
    const identityGroups = brandGroups.size > 1
      ? [...brandGroups.entries()]
      : [...new Map(variants.map((variant) => [`${variant.brand} ${variant.model}`, variants.filter((candidate) => candidate.brand === variant.brand && candidate.model === variant.model).map((candidate) => candidate.id)])).entries()];
    const sorted = identityGroups.sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0], "tr")).slice(0, 5);
    if (sorted.length > 1) {
      unanswered.push("catalogIdentity");
      candidates.push(makeCandidate({
        question: Object.freeze({ id: `v2q.refinement.catalog-identity.${input.memory.turn + 1}`, stableSemanticKey: "refinement.catalogIdentity", field: "catalogIdentity", promptIntent: "DISCRIMINATE_CANDIDATES", options: Object.freeze(sorted.map(([value, ids]) => {
          const traitCounts = new Map<string, number>();
          for (const signal of input.personaLayer?.signals ?? []) if (ids.includes(signal.exactVariantId)) traitCounts.set(signal.trait, (traitCounts.get(signal.trait) ?? 0) + signal.matchStrength);
          const traits = [...traitCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 2).map(([trait]) => PERSONA_DESCRIPTIONS[trait]).filter(Boolean);
          return Object.freeze({ id: `v2q.refinement.catalog-identity.${value.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/gu, "-")}`, semanticValue: value, userFacingLabel: value, ...(traits.length ? { userFacingDescription: `✨ Bu adaylarda ${traits.join(" ve ")} yönü öne çıkıyor.` } : { userFacingDescription: "Bu markanın mevcut teknik adaylarını birlikte değerlendirebiliriz." }), provenance: Object.freeze({ source: "CURRENT_CANDIDATE_POOL" as const, candidatePoolFingerprint: input.memory.decisionFingerprint, supportingCandidateIds: Object.freeze(ids.sort()), authorityReference: input.snapshot.authority.catalogFingerprint }) });
        })), selectionMode: "SINGLE", minimumSelections: 1, maximumSelections: 1, answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: "Fiyat kullanılmadığında eşit uygunluktaki adayları kullanıcının marka veya model önceliğiyle ayırır." }),
        stage: "SOFT_DIFFERENTIATION", materiality: 2, informationGain: 1, conversationalRelevance: 2,
        reasonCodes: Object.freeze(["CATALOG_IDENTITY_REFINEMENT_REQUIRED_BEFORE_OFFER"]), candidateReductionValue: 3, compatibleCandidateIds: candidateIds,
      }));
    }
  }

  const provisionalCompletion = projectQuestionStageCompletion({ memory: input.memory, activeFields: answered, candidates, comparisonScope: input.comparisonScope });
  const gatedCandidates = candidates.map((candidate) => Object.freeze({ ...candidate, eligible: candidate.eligible && stagePrerequisitesComplete(candidate, provisionalCompletion) }));
  const stageCompletion = projectQuestionStageCompletion({ memory: input.memory, activeFields: answered, candidates: gatedCandidates, comparisonScope: input.comparisonScope });
  return Object.freeze({ unansweredDecisionFields: Object.freeze([...new Set(unanswered)]), questionCandidates: Object.freeze(gatedCandidates), stageCompletion });
}
