import type { ContextCandidateId } from "@/types/contextCandidate";
import type {
  ContextConfirmationEvidence,
  MaterialityAssessment,
} from "@/types/contextSufficiency";

export function findMaterialityAssessment(
  assessments: MaterialityAssessment[],
  requirementId: string,
): MaterialityAssessment | null {
  return (
    assessments.find(
      (assessment) =>
        assessment.requirementId === requirementId,
    ) ?? null
  );
}

export function findConfirmationForCandidate(
  confirmations: ContextConfirmationEvidence[],
  candidateId: ContextCandidateId,
): ContextConfirmationEvidence | null {
  return (
    confirmations.find(
      (confirmation) =>
        confirmation.inferredCandidateId === candidateId,
    ) ?? null
  );
}

export function isInferenceConfirmed(
  confirmations: ContextConfirmationEvidence[],
  candidateId: ContextCandidateId,
): boolean {
  const confirmation = findConfirmationForCandidate(
    confirmations,
    candidateId,
  );

  return (
    confirmation?.confirmed === true &&
    confirmation.confirmationSource === "EXPLICIT_USER"
  );
}
