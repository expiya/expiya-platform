import type { ContextCandidate } from "@/types/contextCandidate";
import type { DecisionContext } from "@/types/decisionContext";

export type PopulationRejectionReason =
  | "DUPLICATE_CANDIDATE"
  | "INVALID_CANDIDATE"
  | "UNSUPPORTED_POPULATION"
  | "UNRESOLVED_CONFLICT";

export interface PopulationRejection {
  candidate: ContextCandidate;
  reason: PopulationRejectionReason;
}

export interface PopulationSuccess {
  ok: true;
  context: DecisionContext;
  appliedCandidates: ContextCandidate[];
  rejectedCandidates: PopulationRejection[];
}

export interface PopulationFailure {
  ok: false;
  appliedCandidates: ContextCandidate[];
  rejectedCandidates: PopulationRejection[];
}

export type PopulationResult =
  | PopulationSuccess
  | PopulationFailure;

export interface PopulationInput {
  current: PopulationResult | null;
  candidates: ContextCandidate[];
}
