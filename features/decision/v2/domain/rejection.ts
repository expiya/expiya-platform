export type CandidateRejectionReason =
  | "WRONG_BODY_STYLE"
  | "WRONG_POWERTRAIN"
  | "WRONG_USAGE_CLASS"
  | "INSUFFICIENT_CARGO"
  | "INSUFFICIENT_SEATING"
  | "OVER_BUDGET"
  | "STYLE_MISMATCH"
  | "SIZE_MISMATCH"
  | "BRAND_DISLIKE"
  | "MODEL_DISLIKE"
  | "OTHER_EXPLICIT"
  | "UNSPECIFIED";

export type RejectionScope = "EXACT_VARIANT" | "MODEL_FAMILY" | "BRAND";

export interface CandidateRejectionEvent extends ConversationEventBase {
  readonly eventType: "CANDIDATE_REJECTION";
  readonly candidateId?: string;
  readonly familyId?: string;
  readonly brandId?: string;
  readonly scope: RejectionScope;
  readonly reason: CandidateRejectionReason;
  readonly scopeExplicitlyRequested: boolean;
}
import type { ConversationEventBase } from "./conversationEvent";
