import { outcomeStore } from "@/features/outcome/store/outcomeStore";
import { DecisionOutcome, OutcomeStatus } from "@/types/outcome";

let outcomeSequence = 0;

function createOutcomeId(): string {
  outcomeSequence += 1;
  return `out_${Date.now()}${outcomeSequence}`;
}

export function createOutcome(
  decisionId: string,
  status: OutcomeStatus,
): DecisionOutcome {
  const outcome: DecisionOutcome = {
    id: createOutcomeId(),
    decisionId,
    status,
  };

  outcomeStore.save(outcome);

  return outcome;
}
