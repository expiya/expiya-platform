export type ImprovementProposalStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface ImprovementProposal {
  id: string;
  signalId: string;
  description: string;
  status: ImprovementProposalStatus;
}
