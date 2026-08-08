export interface DecisionSummary {
  decisionId: string;
  score: number;
  recommendation: string;
  reasons: string[];
  confidence: {
    value: number;
    level: string;
    explanation: string;
  };
}