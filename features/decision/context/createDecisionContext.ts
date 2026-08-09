import { DecisionContext } from "@/types/decisionContext";

export function createDecisionContext(query: string): DecisionContext {
  return {
    decisionNeed: query,
    userContext: {
      needs: [],
      priorities: [],
      preferences: [],
      constraints: [],
      usageConditions: [],
    },
    evaluationContext: {
      decisionCriteria: [],
      decisionOptions: undefined,
    },
    domainContext: {
      contextualElements: undefined,
      contextualRelationships: undefined,
    },
  };
}
