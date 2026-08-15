import type {
  CarsConversationEvidenceDecision,
  CarsRecommendationOfferStatus,
} from "@/types/carsConversation";
import type { CarsEvidenceBackedDecisionResult } from "@/features/decision/runtime/runCarsEvidenceBackedDecision";

export function evidenceDecisionProjection(
  result: CarsEvidenceBackedDecisionResult,
  options: {
    readonly revealIdentity: boolean;
    readonly recommendationOfferStatus?: CarsRecommendationOfferStatus;
  },
): CarsConversationEvidenceDecision {
  const conversationState = result.status === "INSUFFICIENT_VEHICLE_EVIDENCE" ? "EVIDENCE_INSUFFICIENT" as const
    : result.status === "NO_ELIGIBLE_CANDIDATE" ? "NO_ELIGIBLE_CANDIDATE" as const
      : result.discriminatorChoices ? "FINAL_DISCRIMINATOR_REQUIRED" as const
        : options.revealIdentity && result.status === "DECISION_READY" ? "DECISION_READY" as const
          : result.status === "DECISION_READY" ? "OFFER_AWAITING_CONSENT" as const
            : "FOLLOW_UP" as const;
  return {
    conversationState,
    decisionStatus: result.status,
    evidenceBacked: result.status === "DECISION_READY" && options.revealIdentity,
    recommendationOfferStatus: options.recommendationOfferStatus,
    selectedRuntimeVehicleCandidateId: options.revealIdentity ? result.selectedRuntimeVehicleCandidateId : undefined,
    selectedVehicle: options.revealIdentity ? result.selectedVehicle : undefined,
    requirements: result.materialRequirements.map(({ factKey, predicate, value }) => ({ factKey, predicate, value })),
    candidateDispositions: options.revealIdentity
      ? result.candidateEvaluations.map(({ runtimeVehicleCandidateId, disposition }) => ({ runtimeVehicleCandidateId, disposition }))
      : undefined,
    evidenceTrace: options.revealIdentity
      ? { candidateIds: result.evidenceTrace.candidateIds, artifactVersion: result.evidenceTrace.authority.artifactVersion }
      : { candidateIds: [], artifactVersion: result.evidenceTrace.authority.artifactVersion },
    followUpQuestion: options.revealIdentity ? result.followUpQuestion : undefined,
    limitations: result.status === "INSUFFICIENT_VEHICLE_EVIDENCE"
      ? ["Bu araç için gerekli doğrulanmış veri yeterli değil."] : undefined,
    discriminatorChoices: result.discriminatorChoices,
  };
}

const IDENTITY_LEAK = /(?:hyundai|ioniq|toyota|honda|ranger|hilux|rvc-pilot|cfg-000|a3728e65|62465336)/iu;

export function messageRevealsCandidateIdentity(message: string): boolean {
  return IDENTITY_LEAK.test(message);
}
