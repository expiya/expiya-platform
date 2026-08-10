export type ImprovementExecutionStatus =
  | "scheduled"
  | "executing"
  | "completed"
  | "failed";

export interface ImprovementExecution {
  id: string;
  improvementId: string;
  status: ImprovementExecutionStatus;
}
