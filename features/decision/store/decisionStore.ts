import { DecisionResult } from "@/types/decision";

export interface DecisionStore {
  save(decision: DecisionResult): void;
  get(decisionId: string): DecisionResult | undefined;
}

export class InMemoryDecisionStore implements DecisionStore {
  private readonly decisions = new Map<string, DecisionResult>();

  save(decision: DecisionResult): void {
    this.decisions.set(decision.decisionId, decision);
  }

  get(decisionId: string): DecisionResult | undefined {
    return this.decisions.get(decisionId);
  }
}

export const decisionStore: DecisionStore = new InMemoryDecisionStore();
