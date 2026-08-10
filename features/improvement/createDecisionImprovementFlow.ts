import { createDecisionImprovement } from "@/features/improvement/createDecisionImprovement";
import { DecisionImprovement } from "@/types/decisionImprovement";
import { ImprovementProposal } from "@/types/improvementProposal";
import { ImprovementReview } from "@/types/improvementReview";

export function createDecisionImprovementFlow(
  proposal: ImprovementProposal,
  review: ImprovementReview,
): DecisionImprovement | undefined {
  return createDecisionImprovement(proposal, review);
}
