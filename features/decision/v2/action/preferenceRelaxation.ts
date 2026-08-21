import type { CatalogSnapshot, CatalogVariantSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { ActiveConstraintProjection, ActiveNonHardConstraint } from "../filter/types";
import type { QuestionCandidate, QuestionStage } from "./types";

const FIELDS = ["bodyStyle", "fuelType", "transmission"] as const;
const FUEL_LABELS: Readonly<Record<string, string>> = Object.freeze({ GASOLINE: "Benzin", DIESEL: "Dizel", LPG: "LPG", MHEV: "Hafif hibrit", HEV: "Tam hibrit", PHEV: "Şarj edilebilir hibrit", BEV: "Elektrik", HYDROGEN: "Hidrojen" });
const BODY_LABELS: Readonly<Record<string, string>> = Object.freeze({ Sedan: "Sedan", Hatchback: "Hatchback", SUV: "SUV/crossover", Crossover: "SUV/crossover", "Fastback SUV": "Fastback SUV", Coupe: "Coupe", Convertible: "Üstü açılır", Liftback: "Liftback", "Station Wagon": "Station wagon", Pickup: "Pickup", "Panel Van": "Kapalı kasa ticari", "Passenger Van": "Yolcu vanı", MPV: "MPV" });

function canonicalBodyStyle(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLocaleUpperCase("tr-TR").replace(/\s+/gu, " ");
  if (["SUV", "CROSSOVER", "SUV/CROSSOVER", "SUV,CROSSOVER"].includes(normalized)) return "SUV";
  return value.trim();
}
function normalizedSelectedValues(constraint: ActiveNonHardConstraint): readonly string[] {
  const normalized = constraint.normalizedValue;
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return [];
  const { operator, value } = normalized as { operator?: unknown; value?: unknown };
  const values = operator === "ONE_OF" && Array.isArray(value) ? value : operator === "EQUALS" ? [value] : [];
  return Object.freeze([...new Set(values
    .filter((item): item is string => typeof item === "string")
    .flatMap((item) => constraint.fieldId === "bodyStyle" ? item.split(/\s*(?:,|\/|\bor\b)\s*/iu) : [item])
    .map((item) => constraint.fieldId === "bodyStyle" ? canonicalBodyStyle(item) : item))]);
}
function candidateValue(variant: CatalogVariantSnapshot, field: typeof FIELDS[number]): string {
  if (field === "bodyStyle") return canonicalBodyStyle(variant.decisionFacts.bodyStyle.value);
  if (field === "fuelType") return variant.decisionFacts.powertrain.fuelType.value;
  return /manual/iu.test(variant.decisionFacts.powertrain.transmission.value) ? "MANUAL" : "AUTOMATIC";
}
function label(field: typeof FIELDS[number], value: string): string {
  if (field === "bodyStyle") return BODY_LABELS[value] ?? value;
  if (field === "fuelType") return FUEL_LABELS[value] ?? value;
  return value === "MANUAL" ? "Manuel" : "Otomatik";
}
function stage(field: typeof FIELDS[number]): QuestionStage {
  return field === "bodyStyle" ? "VEHICLE_ARCHITECTURE" : field === "fuelType" ? "ENERGY_FIT" : "TECHNICAL_PREFERENCES";
}

export function createLatestUncoveredPreferenceRelaxation(input: {
  readonly snapshot: CatalogSnapshot;
  readonly candidateIds: readonly string[];
  readonly memory: ConversationMemory;
  readonly constraints: ActiveConstraintProjection;
}): QuestionCandidate | null {
  const candidates = input.candidateIds.flatMap((id) => { const variant = input.snapshot.variantById.get(id); return variant ? [variant] : []; });
  const eligible = input.constraints.activeNonHardConstraints.filter((constraint): constraint is ActiveNonHardConstraint & { fieldId: typeof FIELDS[number] } => constraint.decisionEffect === "STRONG_RANK" && FIELDS.includes(constraint.fieldId as typeof FIELDS[number]));
  // Memory is append-only; its canonical order is the conversation order. Using
  // sourceTurn/sequence here would let provider-local numbering reorder answers.
  const eventOrder = new Map(input.memory.events.map((event, index) => [event.id, index]));
  const uncovered = eligible.filter((constraint) => {
    const selected = normalizedSelectedValues(constraint);
    return selected.length > 0 && !candidates.some((variant) => selected.includes(candidateValue(variant, constraint.fieldId)));
  }).sort((left, right) => (eventOrder.get(right.sourceEventId) ?? 0) - (eventOrder.get(left.sourceEventId) ?? 0));
  const target = uncovered[0]; if (!target || candidates.length === 0) return null;
  const selectedValues = normalizedSelectedValues(target);
  const currentValue = selectedValues.join(",");
  const groups = new Map<string, string[]>();
  for (const variant of candidates) { const value = candidateValue(variant, target.fieldId); groups.set(value, [...(groups.get(value) ?? []), variant.id]); }
  const alternatives = [...groups.entries()].filter(([value]) => !selectedValues.includes(value)).sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0], "tr")).slice(0, 5);
  if (!alternatives.length) return null;
  const candidateIds = Object.freeze(candidates.map((variant) => variant.id).sort());
  return Object.freeze({
    question: Object.freeze({
      id: `v2q.preference-relaxation.${target.fieldId}.${input.memory.turn + 1}`,
      stableSemanticKey: `preferenceRelaxation.${target.fieldId}.${encodeURIComponent(currentValue)}`,
      field: target.fieldId,
      promptIntent: "RESOLVE_CONFLICT",
      options: Object.freeze(alternatives.map(([value, ids]) => Object.freeze({ id: `v2q.relax.${target.fieldId}.${value.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/gu, "-")}`, semanticValue: value, userFacingLabel: `${label(target.fieldId, value)} · ${ids.length} seçenek`, provenance: Object.freeze({ source: "CURRENT_CANDIDATE_POOL" as const, candidatePoolFingerprint: input.memory.decisionFingerprint, supportingCandidateIds: Object.freeze(ids.sort()), authorityReference: input.snapshot.authority.catalogFingerprint }) }))),
      selectionMode: "SINGLE",
      minimumSelections: 1,
      maximumSelections: 1,
      answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const),
      materialityReason: `${target.fieldId} tercihi mevcut aday havuzunda karşılanmıyor; en son karşılanmayan tercih önce ele alınır.`,
    }),
    stage: stage(target.fieldId), eligible: true, blockedUntilStagesComplete: Object.freeze([]), materiality: 4, informationGain: 1, conversationalRelevance: 4,
    reasonCodes: Object.freeze(["LATEST_UNCOVERED_MATERIAL_PREFERENCE_RELAXATION"]), decisionChangeProbability: 4, conflictResolutionValue: 5, candidateReductionValue: 0, contextualRelevance: 4, answerability: 1, cognitiveLoad: 0.2, repetitionRisk: 0, timingPenalty: 0, technicalMismatchPenalty: 0, compatibleCandidateIds: candidateIds,
  });
}
