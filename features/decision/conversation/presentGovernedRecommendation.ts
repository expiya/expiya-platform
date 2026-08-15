import catalogPayload from "@/data/production/catalog/releases/v0.2.0/catalog.json";
import { adaptPublishedCatalogToCars } from "@/features/vehicle-data/adaptPublishedCatalogToCars";
import type { PublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import type { CarsConversationTrace } from "@/types/carsConversation";
import type { RecommendedCar } from "@/types/recommendation";
import type { CarsEvidenceBackedDecisionResult } from "@/features/decision/runtime/runCarsEvidenceBackedDecision";

import type { CarsHeldCandidateAuthorization } from "./carsHeldAuthorization";
import {
  evaluateNewVehiclePrice,
  formatTryConsumer,
  informationalPriceCaveat,
  priceTypeLabel,
} from "./carsNewPriceAuthority";

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
  const price = evaluateNewVehiclePrice({
    runtimeVehicleCandidateId: selected.runtimeVehicleCandidateId,
    vehicleVariantId: selected.vehicleVariantId,
  });
  const budgetCompatible = input.memory.offerPurpose === "NEW_CONFIGURATION_OFFER"
    || input.memory.affordabilityState === "AFFORDABILITY_PASS";
  return {
    car,
    isTopPick: budgetCompatible,
    configurationKind: "NEW_VEHICLE_CONFIGURATION",
    pricePresentation: price.amountTry !== undefined && (price.priceType === "LIST" || price.priceType === "CAMPAIGN")
      ? {
        amountTry: price.amountTry,
        priceType: price.priceType,
        validFrom: record.activeNewPrice.validFrom,
        caveat: informationalPriceCaveat(price),
      }
      : undefined,
    decision: {
      decisionId: `governed:${selected.runtimeVehicleCandidateId}`,
      score: 100,
      recommendation: `${selected.presentationIdentity.brand} ${selected.presentationIdentity.model}`,
      reasons,
      confidence: {
        value: 92,
        level: "high",
        explanation: budgetCompatible
          ? "Seçim doğrulanmış koltuk, bagaj ve güncel sıfır fiyat eşiğine göre belirlendi."
          : "Seçim yalnızca doğrulanmış koltuk ve bagaj eşiğine göre belirlendi.",
      },
    },
  };
}

export function recommendationRevealCopy(input: {
  readonly identity: string;
  readonly reasons: readonly string[];
  readonly memory: CarsConversationTrace;
  readonly amountTry?: number;
  readonly priceType?: "LIST" | "CAMPAIGN";
  readonly caveat?: string;
}): string {
  const intro = input.memory.offerPurpose === "NEW_CONFIGURATION_OFFER"
    ? `Tavanına uyan sıfır önerim ${input.identity}.`
    : `İhtiyacına uyan sıfır önerim ${input.identity}.`;
  const priceLine = input.amountTry !== undefined
    ? `Güncel ${priceTypeLabel(input.priceType)} fiyatı ${formatTryConsumer(input.amountTry)}.`
    : undefined;
  return [intro, input.reasons.join(" "), priceLine, input.caveat].filter(Boolean).join("\n\n");
}

export function unverifiedPreferenceNote(memory: CarsConversationTrace): string | undefined {
  void memory;
  return undefined;
}

export function unevaluatedBudgetPresent(memory: CarsConversationTrace): boolean {
  if (memory.affordabilityState === "AFFORDABILITY_PASS"
    || memory.affordabilityState === "AFFORDABILITY_FAIL"
    || memory.affordabilityState === "AFFORDABILITY_UNKNOWN") {
    return false;
  }
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

export function unsupportedHardRequirementBlocksModelFit(memory: CarsConversationTrace): boolean {
  return memory.requirements.some((entry) => (
    entry.category === "HARD_CONSTRAINT"
    && entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE"
    && entry.key !== "MIN_SEATS"
    && entry.key !== "MIN_CARGO_L"
    && entry.key !== "BUDGET_MAX_TRY"
  ));
}

export function unsupportedHardRequirementBlocksRecommendation(memory: CarsConversationTrace): boolean {
  return unsupportedHardRequirementBlocksModelFit(memory);
}

export function hardBudgetBlocksAffordabilityClaim(memory: CarsConversationTrace): boolean {
  return hardUnevaluatedConstraints(memory).some((entry) => entry.key === "BUDGET_MAX_TRY");
}

export function hardConstraintBlockMessage(memory: CarsConversationTrace): string {
  void memory;
  return "Bu zorunlu şartı henüz güvenilir biçimde kıyaslayamadığım için bir araç önermeyeceğim.";
}
