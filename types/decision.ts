export type Recommendation =
  | "Excellent"
  | "Very Good"
  | "Good"
  | "Consider Carefully";

export type DecisionReasonCode =
  | "NEW_MODEL"
  | "OLD_MODEL"
  | "LOW_MILEAGE"
  | "HIGH_MILEAGE"
  | "GOOD_PRICE"
  | "HIGH_PRICE";

export interface DecisionReason {
  code: DecisionReasonCode;
  message: string;
}

export interface DecisionResult {
  decisionId: string;
  score: number;
  recommendation: Recommendation;
  reasons: DecisionReason[];
}
