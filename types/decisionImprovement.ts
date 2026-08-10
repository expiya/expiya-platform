export type DecisionImprovementStatus =
  | "approved"
  | "ready"
  | "applied"
  | "measuring";

export interface DecisionImprovement {
  id: string;
  proposalId: string;
  description: string;
  status: DecisionImprovementStatus;
  version: number;
}
