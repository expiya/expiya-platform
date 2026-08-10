import type { Car } from "@/types/car";
import type {
  ContextCandidate,
  ContextCandidateId,
} from "@/types/contextCandidate";

export interface UserConfirmedCarsTypeBCanonicalSelection {
  readonly optionId: Car["id"];
  readonly domainSourceReferenceId: string;
}

export interface CreateCarsTypeBCanonicalCandidateInput {
  readonly selections: readonly UserConfirmedCarsTypeBCanonicalSelection[];
  readonly userConfirmationReferenceId: string;
}

export interface CarsTypeBCanonicalSelectionTrace {
  readonly inputIndex: number;
  readonly optionId: Car["id"];
  readonly userConfirmationReferenceId: string;
  readonly domainSourceReferenceId: string;
}

export interface CarsTypeBCanonicalCandidateProduction {
  readonly candidate: ContextCandidate<"evaluationContext.decisionOptions">;
  readonly selectionTrace: readonly CarsTypeBCanonicalSelectionTrace[];
}

export type ContextCandidateIdFactory = () => ContextCandidateId;

export function createCarsTypeBCanonicalCandidate(
  input: CreateCarsTypeBCanonicalCandidateInput,
  createId: ContextCandidateIdFactory,
): CarsTypeBCanonicalCandidateProduction {
  const decisionOptions = input.selections.map(({ optionId }) => ({
    optionId,
  }));

  return {
    candidate: {
      id: createId(),
      target: "evaluationContext.decisionOptions",
      value: decisionOptions,
      provenance: "EXPLICIT_USER",
      source: {
        kind: "USER_INPUT",
        referenceId: input.userConfirmationReferenceId,
      },
    },
    selectionTrace: input.selections.map(
      ({ optionId, domainSourceReferenceId }, inputIndex) => ({
        inputIndex,
        optionId,
        userConfirmationReferenceId:
          input.userConfirmationReferenceId,
        domainSourceReferenceId,
      }),
    ),
  };
}
