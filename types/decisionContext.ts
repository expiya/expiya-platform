export type DecisionNeed = string;

export type Needs = string[];
export type Priorities = string[];
export type Preferences = string[];
export type Constraints = string[];
export type UsageConditions = string[];

export type DecisionCriteria = string[];

export type DecisionOptions = unknown;
export type ContextualElements = unknown;
export type ContextualRelationships = unknown;

export interface UserContext {
  needs: Needs;
  priorities: Priorities;
  preferences: Preferences;
  constraints: Constraints;
  usageConditions: UsageConditions;
}

export interface EvaluationContext {
  decisionCriteria: DecisionCriteria;
  decisionOptions: DecisionOptions;
}

export interface DomainContext {
  contextualElements: ContextualElements;
  contextualRelationships: ContextualRelationships;
}

export interface DecisionContext {
  decisionNeed: DecisionNeed;
  userContext: UserContext;
  evaluationContext: EvaluationContext;
  domainContext: DomainContext;
}
