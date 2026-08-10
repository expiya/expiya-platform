export type LearningSignalType =
  | "pattern"
  | "observation"
  | "insight";

export interface LearningSignal {
  id: string;
  type: LearningSignalType;
  description: string;
}
