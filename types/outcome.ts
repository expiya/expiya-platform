export type OutcomeStatus =
  | "unknown"
  | "success"
  | "failed";

export interface DecisionOutcome {
  id: string;
  decisionId: string;
  status: OutcomeStatus;
}
