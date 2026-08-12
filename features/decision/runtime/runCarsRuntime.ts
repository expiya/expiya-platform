import { orchestrateCarsDecision } from "@/features/decision/orchestration/orchestrateCarsDecision";
import type {
  CarsOrchestrationLineage,
  CarsOrchestrationReason,
  CarsOrchestrationResult,
} from "@/types/carsOrchestration";

export interface CarsRuntimeInput {
  readonly requestId: string;
  readonly contextReference: string;
}

export interface CarsFailClosedRuntimeResult {
  readonly status: CarsOrchestrationResult["status"];
  readonly reasons: readonly CarsOrchestrationReason[];
  readonly lineage: CarsOrchestrationLineage;
}

export function runCarsRuntime(
  input: CarsRuntimeInput,
): CarsFailClosedRuntimeResult {
  const result = orchestrateCarsDecision({
    requestId: input.requestId,
    contextReference: input.contextReference,
    dependencies: {},
  });

  return {
    status: result.status,
    reasons: result.reasons,
    lineage: result.lineage,
  };
}
