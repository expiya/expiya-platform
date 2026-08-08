export type ConfidenceLevel =
  | "High"
  | "Medium"
  | "Low";

export interface DecisionConfidence {
  value: number;
  level: ConfidenceLevel;
  explanation: string;
}
