import type {
  ContextCandidate,
  ContextCandidateId,
  ContextSourceReference,
  ContextTarget,
  ContextTargetValueMap,
} from "@/types/contextCandidate";

import type { ExplicitExtractedFact } from "./explicitExtractionSchema";

export interface CreateExplicitContextCandidatesInput {
  facts: ExplicitExtractedFact[];
  sourceReferenceId: string;
}

export type ContextCandidateIdFactory = () => ContextCandidateId;

function createCandidate<TTarget extends ContextTarget>(
  target: TTarget,
  value: ContextTargetValueMap[TTarget],
  source: ContextSourceReference,
  createId: ContextCandidateIdFactory,
): ContextCandidate<TTarget> {
  return {
    id: createId(),
    target,
    value,
    provenance: "EXPLICIT_USER",
    source,
  } as ContextCandidate<TTarget>;
}

export function createExplicitContextCandidates(
  input: CreateExplicitContextCandidatesInput,
  createId: ContextCandidateIdFactory,
): ContextCandidate[] {
  const source: ContextSourceReference = {
    kind: "USER_INPUT",
    referenceId: input.sourceReferenceId,
  };

  return input.facts.map((fact) => {
    switch (fact.target) {
      case "decisionNeed":
        return createCandidate(
          fact.target,
          fact.value,
          source,
          createId,
        );

      case "userContext.needs":
      case "userContext.priorities":
      case "userContext.preferences":
      case "userContext.constraints":
      case "userContext.usageConditions":
      case "evaluationContext.decisionCriteria":
      case "evaluationContext.decisionOptions":
      case "domainContext.contextualElements":
      case "domainContext.contextualRelationships":
        return createCandidate(
          fact.target,
          fact.value,
          source,
          createId,
        );
    }
  });
}
