export interface DecisionDetail {
  decisionId: string;
  score: number;
  recommendation: string;
  reasons: string[];
  confidence: {
    value: number;
    level: string;
    explanation: string;
  };
  trace: {
    steps: string[];
  };
}
