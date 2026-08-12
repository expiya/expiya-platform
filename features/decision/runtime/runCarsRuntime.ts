import { produceCarsDecisionTypeClassificationInput } from "@/features/decision/context/classification/produceCarsDecisionTypeClassificationInput";
import { resolveExplicitCarsTypeBIdentity } from "@/features/decision/context/identity/resolveExplicitCarsTypeBIdentity";
import { produceCarsMaterialityAssessments } from "@/features/decision/context/materiality/produceCarsMaterialityAssessments";
import { classifyCarsDecisionType } from "@/features/decision/context/sufficiency/classifyCarsDecisionType";
import { selectCarsSufficiencyPolicy } from "@/features/decision/context/sufficiency/selectCarsSufficiencyPolicy";
import { orchestrateCarsDecision } from "@/features/decision/orchestration/orchestrateCarsDecision";
import { buildCarsRuntimeContextDependencies } from "./buildCarsRuntimeContextDependencies";
import { buildCarsRuntimeEvidenceDependencies } from "./buildCarsRuntimeEvidenceDependencies";
import { resolveCarsRuntimeDomainRequirements } from "./resolveCarsRuntimeDomainRequirements";
import type {
  CarsOrchestrationLineage,
  CarsOrchestrationReason,
  CarsOrchestrationResult,
} from "@/types/carsOrchestration";

export interface CarsRuntimeInput {
  readonly requestId: string;
  readonly contextReference: string;
  readonly query: string;
}

export interface CarsFailClosedRuntimeResult {
  readonly status: CarsOrchestrationResult["status"];
  readonly reasons: readonly CarsOrchestrationReason[];
  readonly lineage: CarsOrchestrationLineage;
}

export async function runCarsRuntime(
  input: CarsRuntimeInput,
): Promise<CarsFailClosedRuntimeResult> {
  const classificationInput =
    await produceCarsDecisionTypeClassificationInput({
      text: input.query,
    });
  const classification = classifyCarsDecisionType(classificationInput);
  const policy = selectCarsSufficiencyPolicy(classification);
  const materialityAssessments = policy
    ? await produceCarsMaterialityAssessments({
        query: input.query,
        policy,
      })
    : undefined;
  const typeBIdentity =
    classification.status === "CLASSIFIED" &&
    classification.decisionType ===
      "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"
      ? resolveExplicitCarsTypeBIdentity({
          query: input.query,
          userConfirmationReferenceId: input.requestId,
          candidateId: `${input.contextReference}:decision-options`,
        })
      : undefined;
  const contextDependencies = policy
    ? await buildCarsRuntimeContextDependencies({
        query: input.query,
        requestId: input.requestId,
        contextReference: input.contextReference,
        typeBProduction: typeBIdentity?.status === "RESOLVED"
          ? typeBIdentity.production
          : undefined,
      })
    : undefined;
  const domainFactResolution =
    policy && materialityAssessments && contextDependencies
      ? resolveCarsRuntimeDomainRequirements({
          policy,
          materialityAssessments,
          populationResult: contextDependencies.populationResult,
          typeBProduction: typeBIdentity?.status === "RESOLVED"
            ? typeBIdentity.production
            : undefined,
        })
      : undefined;
  const evidenceDependencies =
    classification.status === "CLASSIFIED" &&
    policy && domainFactResolution
      ? buildCarsRuntimeEvidenceDependencies({
          decisionType: classification.decisionType,
          policy,
          requirementResolution: domainFactResolution,
          typeBProduction: typeBIdentity?.status === "RESOLVED"
            ? typeBIdentity.production
            : undefined,
        })
      : undefined;
  const result = orchestrateCarsDecision({
    requestId: input.requestId,
    contextReference: input.contextReference,
    dependencies: {
      classification,
      typeBIdentity: typeBIdentity
        ? { status: typeBIdentity.status }
        : undefined,
      materialityAssessments,
      rejectionAssessments: contextDependencies?.rejectionAssessments,
      limitedSupportAssessment:
        contextDependencies?.limitedSupportAssessment,
      domainFactResolution,
      evidence: evidenceDependencies?.evidence,
      domainAssessment:
        evidenceDependencies && "domainAssessment" in evidenceDependencies
          ? evidenceDependencies.domainAssessment
          : undefined,
    },
  });

  return {
    status: result.status,
    reasons: result.reasons,
    lineage: result.lineage,
  };
}
