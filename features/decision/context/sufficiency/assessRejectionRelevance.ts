import type { ContextCandidateId } from "@/types/contextCandidate";
import type {
  RejectionRelevanceAssessment,
  RejectionRelevanceOutcome,
} from "@/types/contextSufficiency";

export interface RejectionRelevanceDetermination {
  candidateId: ContextCandidateId;
  outcome: RejectionRelevanceOutcome;
  affectedRequirementIds: string[];
  limitations: string[];
}

export function assessRejectionRelevance(
  determination: RejectionRelevanceDetermination,
): RejectionRelevanceAssessment {
  return {
    candidateId: determination.candidateId,
    outcome: determination.outcome,
    affectedRequirementIds: [
      ...determination.affectedRequirementIds,
    ],
    limitations: [...determination.limitations],
  };
}
