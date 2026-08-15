import type { CarsEvidenceBackedDecisionResult } from "@/features/decision/runtime/runCarsEvidenceBackedDecision";
import type { CarsConversationTrace } from "@/types/carsConversation";
import type { RuntimeVehicleCandidateId } from "@/types/runtimeVehicleEvidence";

import { hardBudgetPresent } from "./carsAcquisitionAuthority";
import { latestRequirement } from "./carsRequirementLedger";
import {
  filterEligibleCandidatesByHardBudget,
  type CarsHardBudgetFilterResult,
} from "./carsNewPriceAuthority";

export function hardBudgetCeilingTry(memory: CarsConversationTrace): number | undefined {
  if (!hardBudgetPresent(memory)) return undefined;
  const budget = latestRequirement(memory, "BUDGET_MAX_TRY");
  return typeof budget?.value === "number" ? budget.value : undefined;
}

export function applyHardBudgetGate(
  result: CarsEvidenceBackedDecisionResult,
  memory: CarsConversationTrace,
): {
  readonly result: CarsEvidenceBackedDecisionResult;
  readonly filter?: CarsHardBudgetFilterResult;
  readonly priceEvaluationRequested: boolean;
} {
  const budgetTry = hardBudgetCeilingTry(memory);
  const eligible = result.candidateEvaluations.filter((item) => item.disposition === "ELIGIBLE");
  if (budgetTry === undefined) {
    return { result, priceEvaluationRequested: false };
  }

  const filter = filterEligibleCandidatesByHardBudget({
    eligibleCandidateIds: eligible.map((item) => item.runtimeVehicleCandidateId),
    candidateVariantIds: Object.fromEntries(eligible.map((item) => (
      [item.runtimeVehicleCandidateId, item.vehicleVariantId] as const
    ))),
    budgetTry,
  });

  if (filter.passingCandidateIds.length === 1) {
    const selected = result.candidateEvaluations.find((item) => (
      item.runtimeVehicleCandidateId === filter.passingCandidateIds[0]
    ));
    return {
      priceEvaluationRequested: true,
      filter,
      result: {
        ...result,
        status: "DECISION_READY",
        selectedRuntimeVehicleCandidateId: selected?.runtimeVehicleCandidateId,
        selectedVehicle: selected?.presentationIdentity,
        recommendationAuthorization: {
          authorized: true,
          authorizedCandidateIds: filter.passingCandidateIds as readonly RuntimeVehicleCandidateId[],
        },
        discriminatorChoices: undefined,
        followUpQuestion: undefined,
      },
    };
  }

  if (filter.passingCandidateIds.length === 0) {
    return {
      priceEvaluationRequested: true,
      filter,
      result: {
        ...result,
        status: "NO_ELIGIBLE_CANDIDATE",
        selectedRuntimeVehicleCandidateId: undefined,
        selectedVehicle: undefined,
        recommendationAuthorization: { authorized: false, authorizedCandidateIds: [] },
        discriminatorChoices: undefined,
      },
    };
  }

  const selectedStillPasses = result.selectedRuntimeVehicleCandidateId
    && filter.passingCandidateIds.includes(result.selectedRuntimeVehicleCandidateId);
  if (result.status === "DECISION_READY" && selectedStillPasses) {
    return { result, filter, priceEvaluationRequested: true };
  }

  const passingChoices = result.discriminatorChoices;
  return {
    priceEvaluationRequested: true,
    filter,
    result: {
      ...result,
      status: "NEEDS_MORE_USER_CONTEXT",
      selectedRuntimeVehicleCandidateId: undefined,
      selectedVehicle: undefined,
      recommendationAuthorization: {
        authorized: false,
        authorizedCandidateIds: filter.passingCandidateIds as readonly RuntimeVehicleCandidateId[],
      },
      discriminatorChoices: passingChoices,
    },
  };
}
