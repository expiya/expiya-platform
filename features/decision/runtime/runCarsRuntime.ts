import { orchestrateCarsDecision } from "@/features/decision/orchestration/orchestrateCarsDecision";
import type {
  CarsOrchestrationInput,
  CarsOrchestrationLineage,
  CarsOrchestrationReason,
  CarsOrchestrationResult,
} from "@/types/carsOrchestration";

export interface CarsFailClosedRuntimeResult {
  readonly status: CarsOrchestrationResult["status"];
  readonly reasons: readonly CarsOrchestrationReason[];
  readonly lineage: CarsOrchestrationLineage;
}

export function runCarsRuntime(
  input: CarsOrchestrationInput,
): CarsFailClosedRuntimeResult {
  const result = orchestrateCarsDecision(input);

  return {
    status: result.status,
    reasons: result.reasons,
    lineage: result.lineage,
  };
}
