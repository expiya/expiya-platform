import { createImprovementProposal } from "@/features/improvement/createImprovementProposal";
import { improvementProposalStore } from "@/features/improvement/store/improvementProposalStore";
import { ImprovementProposal } from "@/types/improvementProposal";
import { ImprovementReview } from "@/types/improvementReview";
import { LearningSignal } from "@/types/learningSignal";

let improvementReviewSequence = 0;

function createImprovementReviewId(): string {
  improvementReviewSequence += 1;
  return `rev_${Date.now()}${improvementReviewSequence}`;
}

export function createImprovementFlow(signal: LearningSignal): {
  proposal: ImprovementProposal;
  review: ImprovementReview;
} {
  const proposal = createImprovementProposal(signal);
  improvementProposalStore.save(proposal);

  const review: ImprovementReview = {
    id: createImprovementReviewId(),
    proposalId: proposal.id,
    status: "pending",
    note: "",
  };

  return {
    proposal,
    review,
  };
}
