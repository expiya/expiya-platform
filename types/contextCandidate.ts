import type {
  ContextualElements,
  ContextualRelationships,
  DecisionNeed,
  DecisionOptions,
} from "@/types/decisionContext";

export type ContextProvenance =
  | "EXPLICIT_USER"
  | "DERIVED"
  | "INFERRED"
  | "DOMAIN_SUPPLIED";

export type ContextCandidateId = string;

export type ContextTarget =
  | "decisionNeed"
  | "userContext.needs"
  | "userContext.priorities"
  | "userContext.preferences"
  | "userContext.constraints"
  | "userContext.usageConditions"
  | "evaluationContext.decisionCriteria"
  | "evaluationContext.decisionOptions"
  | "domainContext.contextualElements"
  | "domainContext.contextualRelationships";

export type ContextSourceReference =
  | {
      kind: "USER_INPUT";
      referenceId: string;
    }
  | {
      kind: "DOMAIN_SOURCE";
      referenceId: string;
    }
  | {
      kind: "CANDIDATE";
      candidateId: ContextCandidateId;
    };

export interface ContextTargetValueMap {
  decisionNeed: DecisionNeed;

  "userContext.needs": string;
  "userContext.priorities": string;
  "userContext.preferences": string;
  "userContext.constraints": string;
  "userContext.usageConditions": string;

  "evaluationContext.decisionCriteria": string;
  "evaluationContext.decisionOptions": DecisionOptions;

  "domainContext.contextualElements": ContextualElements;
  "domainContext.contextualRelationships": ContextualRelationships;
}

export type ContextCandidate<
  TTarget extends ContextTarget = ContextTarget,
> = TTarget extends ContextTarget
  ? {
      id: ContextCandidateId;
      target: TTarget;
      value: ContextTargetValueMap[TTarget];
      provenance: ContextProvenance;
      source: ContextSourceReference;
    }
  : never;
