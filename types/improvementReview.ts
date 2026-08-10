export type ImprovementReviewStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface ImprovementReview {
  id: string;
  proposalId: string;
  status: ImprovementReviewStatus;
  note: string;
}
