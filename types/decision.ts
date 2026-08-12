import { DecisionConfidence } from "@/types/confidence";
import { DecisionContext } from "@/types/decisionContext";
import { DecisionTrace } from "@/types/trace";

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
  | "HIGH_PRICE"
  | "USE_CASE_MATCH";

export interface DecisionReason {
  code: DecisionReasonCode;
  message: string;
}

export interface DecisionResult {
  decisionId: string;
  context: DecisionContext;
  score: number;
  recommendation: Recommendation;
  reasons: DecisionReason[];
  confidence: DecisionConfidence;
  trace: DecisionTrace;
}
