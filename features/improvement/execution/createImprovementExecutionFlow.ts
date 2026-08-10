import { improvementExecutionStore } from "@/features/improvement/execution/store/improvementExecutionStore";
import { DecisionImprovement } from "@/types/decisionImprovement";
import { ImprovementExecution } from "@/types/improvementExecution";

let improvementExecutionSequence = 0;

function createImprovementExecutionId(): string {
  improvementExecutionSequence += 1;
  return `iex_${Date.now()}${improvementExecutionSequence}`;
}

export function createImprovementExecutionFlow(
  improvement: DecisionImprovement,
): ImprovementExecution {
  const execution: ImprovementExecution = {
    id: createImprovementExecutionId(),
    improvementId: improvement.id,
    status: "scheduled",
  };

  improvementExecutionStore.save(execution);

  return execution;
}
