export type ImprovementMeasurementResult =
  | "positive"
  | "neutral"
  | "negative";

export interface ImprovementMeasurement {
  id: string;
  appliedImprovementId: string;
  result: ImprovementMeasurementResult;
}
