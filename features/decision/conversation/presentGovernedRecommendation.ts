import catalogPayload from "@/data/production/catalog/releases/v0.2.0/catalog.json";
import { adaptPublishedCatalogToCars } from "@/features/vehicle-data/adaptPublishedCatalogToCars";
import type { PublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import type { CarsConversationTrace } from "@/types/carsConversation";
import type { RecommendedCar } from "@/types/recommendation";
import type { CarsEvidenceBackedDecisionResult } from "@/features/decision/runtime/runCarsEvidenceBackedDecision";

import type { CarsHeldCandidateAuthorization } from "./carsHeldAuthorization";

export function presentGovernedRecommendation(input: {
  readonly result: CarsEvidenceBackedDecisionResult;
  readonly authorization: CarsHeldCandidateAuthorization;
  readonly memory: CarsConversationTrace;
}): RecommendedCar {
  const selected = input.result.candidateEvaluations.find((candidate) => (
    candidate.runtimeVehicleCandidateId === input.authorization.runtimeVehicleCandidateId
  ));
  if (!selected) throw new Error("HELD_CANDIDATE_NOT_IN_GOVERNED_RESULT");
  const record = (catalogPayload.records as unknown as PublishedCatalog["records"]).find((item) => item.variant.id === selected.vehicleVariantId);
  if (!record) throw new Error("HELD_CANDIDATE_NOT_IN_PINNED_CATALOG");
  const adapted = adaptPublishedCatalogToCars({ records: [record], rejected: [], generatedAt: record.variant.updatedAt });
  const car = adapted.cars[0];
  if (!car) throw new Error("HELD_CANDIDATE_NOT_ADAPTABLE");
  const reasons = selected.requirements.map((item) => (
    item.requirement.factKey === "seats"
      ? `${item.fact?.value} koltuk, istediğiniz en az ${item.requirement.value} koltuğu karşılıyor.`
      : `${item.fact?.value ?? `${item.fact?.valueMin}-${item.fact?.valueMax}`} litre bagaj, istediğiniz en az ${item.requirement.value} litreyi karşılıyor.`
  )).slice(0, 3);
  if (reasons.length < 2 && selected.presentationIdentity.trim) {
    reasons.push(`${selected.presentationIdentity.trim} donanımı, doğrulanmış koltuk ve bagaj eşiğinizle uyumlu tek aday.`);
  }
  return {
    car,
    isTopPick: true,
    decision: {
      decisionId: `governed:${selected.runtimeVehicleCandidateId}`,
      score: 100,
      recommendation: `${selected.presentationIdentity.brand} ${selected.presentationIdentity.model}`,
      reasons,
      confidence: {
        value: 92,
        level: "high",
        explanation: "Seçim yalnızca doğrulanmış koltuk ve bagaj eşiğine göre belirlendi.",
      },
    },
  };
}

export function unverifiedPreferenceNote(memory: CarsConversationTrace): string | undefined {
  void memory;
  return undefined;
}

export function unevaluatedBudgetPresent(memory: CarsConversationTrace): boolean {
  return memory.requirements.some((entry) => (
    entry.key === "BUDGET_MAX_TRY" && entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE"
  ));
}

export function hardUnevaluatedConstraints(memory: CarsConversationTrace): readonly CarsConversationTrace["requirements"][number][] {
  return memory.requirements.filter((entry) => entry.category === "HARD_UNEVALUATED_CONSTRAINT");
}

export function blockedConstraintKinds(memory: CarsConversationTrace): readonly string[] {
  return [...new Set(hardUnevaluatedConstraints(memory).map((entry) => (
    entry.key === "BUDGET_MAX_TRY" ? "BUDGET" : entry.key
  )))];
}

export function unsupportedHardRequirementBlocksRecommendation(memory: CarsConversationTrace): boolean {
  if (hardUnevaluatedConstraints(memory).length > 0) return true;
  return memory.requirements.some((entry) => (
    entry.category === "HARD_CONSTRAINT"
    && entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE"
    && entry.key !== "MIN_SEATS"
    && entry.key !== "MIN_CARGO_L"
  ));
}

function formatBudgetCeiling(value: string | number): string {
  if (typeof value !== "number") return "bu üst sınır";
  const millions = value / 1_000_000;
  if (millions >= 1) {
    const label = Number.isInteger(millions) ? String(millions) : String(millions).replace(".", ",");
    return `${label} milyon TL`;
  }
  return `${value.toLocaleString("tr-TR")} TL`;
}

export function hardConstraintBlockMessage(memory: CarsConversationTrace): string {
  const budget = memory.requirements.find((entry) => (
    entry.key === "BUDGET_MAX_TRY" && entry.category === "HARD_UNEVALUATED_CONSTRAINT"
  ));
  if (budget) {
    return `${formatBudgetCeiling(budget.value)} üst sınırın duruyor. Koltuk ve bagajı değerlendirebiliyorum ama bu tavanı henüz güvenilir biçimde kıyaslayamadığım için bir araç önermeyeceğim.`;
  }
  return "Bu zorunlu şartı henüz güvenilir biçimde kıyaslayamadığım için bir araç önermeyeceğim.";
}
