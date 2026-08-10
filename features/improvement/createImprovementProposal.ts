import { ImprovementProposal } from "@/types/improvementProposal";
import { LearningSignal } from "@/types/learningSignal";

let improvementProposalSequence = 0;

function createImprovementProposalId(): string {
  improvementProposalSequence += 1;
  return `imp_${Date.now()}${improvementProposalSequence}`;
}

export function createImprovementProposal(
  signal: LearningSignal,
): ImprovementProposal {
  return {
    id: createImprovementProposalId(),
    signalId: signal.id,
    description: signal.description,
    status: "pending",
  };
}
