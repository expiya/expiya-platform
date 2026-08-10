import type { ContextCandidateId } from "@/types/contextCandidate";
import type {
  MaterialityAssessment,
  MaterialityOutcome,
} from "@/types/contextSufficiency";

export interface MaterialityDetermination {
  requirementId: string;
  outcome: MaterialityOutcome;
  supportingCandidateIds: ContextCandidateId[];
  limitations: string[];
}

export function assessMateriality(
  determination: MaterialityDetermination,
): MaterialityAssessment {
  return {
    requirementId: determination.requirementId,
    outcome: determination.outcome,
    supportingCandidateIds: [
      ...determination.supportingCandidateIds,
    ],
    limitations: [...determination.limitations],
  };
}
