import { DecisionImprovement } from "@/types/decisionImprovement";
import { ImprovementProposal } from "@/types/improvementProposal";
import { ImprovementReview } from "@/types/improvementReview";

let decisionImprovementSequence = 0;

function createDecisionImprovementId(): string {
  decisionImprovementSequence += 1;
  return `dim_${Date.now()}${decisionImprovementSequence}`;
}

export function createDecisionImprovement(
  proposal: ImprovementProposal,
  review: ImprovementReview,
): DecisionImprovement | undefined {
  if (review.status !== "approved") {
    return undefined;
  }

  return {
    id: createDecisionImprovementId(),
    proposalId: proposal.id,
    description: proposal.description,
    status: "approved",
    version: 1,
  };
}
