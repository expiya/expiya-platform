import { extractExplicitContextCandidates } from "@/features/decision/context/extraction/extractExplicitContextCandidates";
import type { CarsTypeBCanonicalCandidateProduction } from "@/features/decision/context/extraction/createCarsTypeBCanonicalCandidate";
import { populateDecisionContext } from "@/features/decision/context/population/populateDecisionContext";
import { assessLimitedSupport } from "@/features/decision/context/sufficiency/assessLimitedSupport";
import { assessRejectionRelevance } from "@/features/decision/context/sufficiency/assessRejectionRelevance";
import type { ContextCandidate } from "@/types/contextCandidate";
import type { PopulationResult } from "@/types/contextPopulation";
import type {
  LimitedSupportAssessment,
  RejectionRelevanceAssessment,
} from "@/types/contextSufficiency";

export interface BuildCarsRuntimeContextDependenciesInput {
  readonly query: string;
  readonly requestId: string;
  readonly contextReference: string;
  readonly typeBProduction?: CarsTypeBCanonicalCandidateProduction;
}

export interface CarsRuntimeContextDependencies {
  readonly populationResult: PopulationResult;
  readonly rejectionAssessments: readonly RejectionRelevanceAssessment[];
  readonly limitedSupportAssessment: LimitedSupportAssessment;
}

export async function buildCarsRuntimeContextDependencies(
  input: BuildCarsRuntimeContextDependenciesInput,
): Promise<CarsRuntimeContextDependencies | undefined> {
  try {
    const extractedCandidates = await extractExplicitContextCandidates({
      text: input.query,
      sourceReferenceId: input.requestId,
    });
    const decisionNeedCandidate: ContextCandidate<"decisionNeed"> = {
      id: `${input.contextReference}:decision-need`,
      target: "decisionNeed",
      value: input.query,
      provenance: "EXPLICIT_USER",
      source: {
        kind: "USER_INPUT",
        referenceId: input.requestId,
      },
    };
    const candidates = [
      decisionNeedCandidate,
      ...extractedCandidates.filter((candidate) =>
        candidate.target !== "decisionNeed" &&
        candidate.target !== "evaluationContext.decisionOptions"),
      ...(input.typeBProduction
        ? [input.typeBProduction.candidate]
        : []),
    ];
    const populationResult = populateDecisionContext({
      current: null,
      candidates,
    });
    const rejectionAssessments = populationResult.rejectedCandidates.map(
      (rejection) => assessRejectionRelevance({
        candidateId: rejection.candidate.id,
        outcome: "UNRESOLVED",
        affectedRequirementIds: [],
        limitations: [
          `Population rejection requires resolution: ${rejection.reason}.`,
        ],
      }),
    );

    return {
      populationResult,
      rejectionAssessments,
      limitedSupportAssessment: assessLimitedSupport({
        outcome: "NOT_PERMITTED",
        limitations: [],
      }),
    };
  } catch {
    return undefined;
  }
}
