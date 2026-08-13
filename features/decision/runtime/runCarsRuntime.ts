import { produceCarsDecisionTypeClassificationInput } from "@/features/decision/context/classification/produceCarsDecisionTypeClassificationInput";
import { resolveExplicitCarsTypeBIdentity, resolveExplicitCarsTypeBIdentityFromCatalog } from "@/features/decision/context/identity/resolveExplicitCarsTypeBIdentity";
import { produceCarsMaterialityAssessments } from "@/features/decision/context/materiality/produceCarsMaterialityAssessments";
import { classifyCarsDecisionType } from "@/features/decision/context/sufficiency/classifyCarsDecisionType";
import { selectCarsSufficiencyPolicy } from "@/features/decision/context/sufficiency/selectCarsSufficiencyPolicy";
import { orchestrateCarsDecision } from "@/features/decision/orchestration/orchestrateCarsDecision";
import { buildCarsRuntimeContextDependencies } from "./buildCarsRuntimeContextDependencies";
import { buildCarsRuntimeEvidenceDependencies } from "./buildCarsRuntimeEvidenceDependencies";
import { executeAuthorizedCarsRecommendation } from "./executeAuthorizedCarsRecommendation";
import { resolveCarsRuntimeDomainRequirements } from "./resolveCarsRuntimeDomainRequirements";
import type {
  CarsOrchestrationLineage,
  CarsOrchestrationReason,
  CarsOrchestrationResult,
} from "@/types/carsOrchestration";
import type { RecommendedCar } from "@/types/recommendation";
import { configuredCarsCatalogMode } from "@/features/vehicle-data/resolveRecommendationCatalog";
import { createConfiguredVehicleCatalogReadRepository, type VehicleCatalogReadResult } from "@/features/vehicle-data/catalogReadRepository";

export interface CarsRuntimeInput {
  readonly requestId: string;
  readonly contextReference: string;
  readonly query: string;
}

export interface CarsBlockedRuntimeResult {
  readonly status: Exclude<CarsOrchestrationResult["status"], "AUTHORIZED">;
  readonly reasons: readonly CarsOrchestrationReason[];
  readonly lineage: CarsOrchestrationLineage;
}

export interface CarsSuccessfulRuntimeResult {
  readonly status: "SUCCEEDED";
  readonly recommendations: readonly RecommendedCar[];
  readonly reasons: readonly [];
  readonly lineage: CarsOrchestrationLineage;
}

export type CarsRuntimeResult =
  | CarsBlockedRuntimeResult
  | CarsSuccessfulRuntimeResult;

export async function runCarsRuntime(
  input: CarsRuntimeInput,
): Promise<CarsRuntimeResult> {
  const classificationInput =
    await produceCarsDecisionTypeClassificationInput({
      text: input.query,
    });
  const classification = classifyCarsDecisionType(classificationInput);
  const policy = selectCarsSufficiencyPolicy(classification);
  const productionCatalogReadAt = new Date();
  let productionCatalog: VehicleCatalogReadResult | undefined;
  if (configuredCarsCatalogMode() === "production") {
    try {
      productionCatalog = await createConfiguredVehicleCatalogReadRepository().readPublishedCatalog(productionCatalogReadAt);
    } catch {
      productionCatalog = {
        mode: "production", cars: [], identities: [], limitations: ["database-read-failed"],
      };
    }
  }
  const typeBIdentity =
    classification.status === "CLASSIFIED" &&
    classification.decisionType ===
      "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"
      ? productionCatalog
        ? resolveExplicitCarsTypeBIdentityFromCatalog({
            query: input.query,
            userConfirmationReferenceId: input.requestId,
            candidateId: `${input.contextReference}:decision-options`,
          }, productionCatalog.identities, "postgres:vehicle-read-model")
        : resolveExplicitCarsTypeBIdentity({
            query: input.query,
            userConfirmationReferenceId: input.requestId,
            candidateId: `${input.contextReference}:decision-options`,
          })
      : undefined;
  const [materialityAssessments, contextDependencies] = policy
    ? await Promise.all([
        produceCarsMaterialityAssessments({
          query: input.query,
          policy,
        }),
        buildCarsRuntimeContextDependencies({
          query: input.query,
          requestId: input.requestId,
          contextReference: input.contextReference,
          typeBProduction: typeBIdentity?.status === "RESOLVED"
            ? typeBIdentity.production
            : undefined,
        }),
      ])
    : [undefined, undefined];
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
          ...(productionCatalog ? { catalog: {
            cars: productionCatalog.cars,
            sourceId: "postgres:vehicle-read-model",
            revision: productionCatalogReadAt.toISOString(),
            limitations: productionCatalog.limitations,
          } } : {}),
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

  if (result.status === "AUTHORIZED") {
    if (!contextDependencies?.populationResult.ok) {
      return {
        status: "FAILED",
        reasons: [{
          code: "EXECUTION_CONTEXT_UNAVAILABLE",
          stage: "AUTHORIZATION",
          referenceIds: [input.contextReference],
        }],
        lineage: result.lineage,
      };
    }

    try {
      const recommendations = await executeAuthorizedCarsRecommendation({
        context: contextDependencies.populationResult.context,
        optionIds:
          classification.status === "CLASSIFIED" &&
          classification.decisionType ===
            "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"
            ? typeBIdentity?.status === "RESOLVED"
              ? typeBIdentity.production.selectionTrace.map(
                  (item) => item.optionId,
                )
              : []
            : undefined,
        ...(productionCatalog ? { productionCatalog } : {}),
      });
      return { status: "SUCCEEDED", recommendations, reasons: [], lineage: result.lineage };
    } catch {
      return {
        status: "FAILED",
        reasons: [{
          code: "EXECUTION_CONTEXT_UNAVAILABLE",
          stage: "AUTHORIZATION",
          referenceIds: ["production-vehicle-catalog"],
        }],
        lineage: result.lineage,
      };
    }
  }

  return {
    status: result.status,
    reasons: result.reasons,
    lineage: result.lineage,
  };
}
