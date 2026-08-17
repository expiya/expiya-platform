import type { CatalogSnapshot, CatalogVariantSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { ActiveConstraintProjection } from "../filter/types";
import type { QuestionCandidate } from "./types";

const FUEL_LABELS: Readonly<Record<string, string>> = Object.freeze({ GASOLINE: "Benzin", DIESEL: "Dizel", LPG: "LPG", MHEV: "Hafif hibrit", HEV: "Tam hibrit", PHEV: "Şarj edilebilir hibrit", BEV: "Elektrik", HYDROGEN: "Hidrojen" });
const BODY_LABELS: Readonly<Record<string, string>> = Object.freeze({ Sedan: "Sedan", Hatchback: "Hatchback", SUV: "SUV/crossover", Crossover: "SUV/crossover", Coupe: "Coupe", Convertible: "Üstü açılır", Liftback: "Liftback", "Station Wagon": "Station wagon", Pickup: "Pickup", "Panel Van": "Kapalı kasa ticari", "Passenger Van": "Yolcu vanı", MPV: "MPV" });

function activeFields(constraints: ActiveConstraintProjection): Set<string> {
  return new Set([...constraints.activeHardConstraints, ...constraints.activeNonHardConstraints].map((item) => item.fieldId));
}

function valueFor(variant: CatalogVariantSnapshot, field: string): string | undefined {
  if (field === "bodyStyle") return variant.decisionFacts.bodyStyle.value;
  if (field === "fuelType") return variant.decisionFacts.powertrain.fuelType.value;
  if (field === "transmission") return /manual/iu.test(variant.decisionFacts.powertrain.transmission.value) ? "MANUAL" : "AUTOMATIC";
  return undefined;
}

function label(field: string, value: string): string {
  if (field === "fuelType") return FUEL_LABELS[value] ?? value;
  if (field === "bodyStyle") return BODY_LABELS[value] ?? value;
  if (field === "transmission") return value === "MANUAL" ? "Manuel" : "Otomatik";
  return value;
}

export function generateMaterialQuestionCandidates(input: {
  readonly snapshot: CatalogSnapshot;
  readonly candidateIds: readonly string[];
  readonly memory: ConversationMemory;
  readonly constraints: ActiveConstraintProjection;
  readonly comparisonScope: boolean;
}): { readonly unansweredDecisionFields: readonly string[]; readonly questionCandidates: readonly QuestionCandidate[] } {
  const candidateSet = new Set(input.candidateIds);
  const variants = input.snapshot.variants.filter((variant) => candidateSet.has(variant.id));
  const answered = activeFields(input.constraints);
  // A concrete cargo/passenger architecture already answers the practical
  // body-shape question. Asking Sedan/SUV/Panel Van again would contradict the
  // user's stated use case even though the two facts live on separate axes.
  if (answered.has("usageArchitecture")) answered.add("bodyStyle");
  const closed = new Set(input.memory.materialQuestionHistory.filter((item) => ["ANSWERED", "DECLINED", "SUPERSEDED"].includes(item.answerStatus)).map((item) => item.field));
  const fields = ["bodyStyle", "fuelType", "transmission"] as const;
  const candidates: QuestionCandidate[] = [];
  const unanswered: string[] = [];

  for (const field of fields) {
    if (answered.has(field) || closed.has(field)) continue;
    const groups = new Map<string, string[]>();
    for (const variant of variants) {
      const value = valueFor(variant, field);
      if (!value) continue;
      groups.set(value, [...(groups.get(value) ?? []), variant.id]);
    }
    if (groups.size < 2) continue;
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
    candidates.push(Object.freeze({
      question: Object.freeze({ id: `v2q.${field}.${input.memory.turn + 1}`, stableSemanticKey: `discovery.${field}`, field, promptIntent: "DISCRIMINATE_CANDIDATES", options: Object.freeze(options), answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: input.comparisonScope ? "İki model kapsamındaki varyantları ayırır." : "Mevcut aday havuzunu anlamlı biçimde daraltır." }),
      decisionChangeProbability: input.comparisonScope ? 1.5 : 1,
      conflictResolutionValue: 0,
      candidateReductionValue: reduction * 4,
      contextualRelevance: field === "bodyStyle" ? 1.5 : 1,
      answerability: 1,
      cognitiveLoad: options.length > 4 ? 0.5 : 0.2,
      repetitionRisk: 0,
      timingPenalty: 0,
      technicalMismatchPenalty: 0,
      compatibleCandidateIds: Object.freeze([...candidateSet].sort()),
    }));
  }

  if (!input.memory.budget.budgetExcluded && input.memory.budget.budgetUnknown && !closed.has("budget")) {
    unanswered.push("budget");
    candidates.push(Object.freeze({
      question: Object.freeze({ id: `v2q.budget.${input.memory.turn + 1}`, stableSemanticKey: "discovery.budget", field: "budget", promptIntent: "CLARIFY_REQUIREMENT", options: Object.freeze([]), answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: "Fiyatı değerlendirilebilen adayların bütçe uygunluğunu ayırır." }),
      decisionChangeProbability: 1,
      conflictResolutionValue: 0,
      candidateReductionValue: input.candidateIds.length <= 10 ? 3 : 1,
      contextualRelevance: 1,
      answerability: 0.8,
      cognitiveLoad: 0.5,
      repetitionRisk: 0,
      timingPenalty: input.candidateIds.length > 50 ? 0.5 : 0,
      technicalMismatchPenalty: 0,
      compatibleCandidateIds: Object.freeze([...candidateSet].sort()),
    }));
  }

  return Object.freeze({ unansweredDecisionFields: Object.freeze([...new Set(unanswered)]), questionCandidates: Object.freeze(candidates) });
}
