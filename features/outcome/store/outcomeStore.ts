import { DecisionOutcome } from "@/types/outcome";

export interface OutcomeStore {
  save(outcome: DecisionOutcome): void;
  get(id: string): DecisionOutcome | undefined;
  getAll(): DecisionOutcome[];
  findByDecisionId(decisionId: string): DecisionOutcome[];
}

export class InMemoryOutcomeStore implements OutcomeStore {
  private readonly outcomes = new Map<string, DecisionOutcome>();

  save(outcome: DecisionOutcome): void {
    this.outcomes.set(outcome.id, outcome);
  }

  get(id: string): DecisionOutcome | undefined {
    return this.outcomes.get(id);
  }

  getAll(): DecisionOutcome[] {
    return Array.from(this.outcomes.values());
  }

  findByDecisionId(decisionId: string): DecisionOutcome[] {
    return this.getAll().filter(
      (outcome) => outcome.decisionId === decisionId,
    );
  }
}

export const outcomeStore: OutcomeStore = new InMemoryOutcomeStore();
