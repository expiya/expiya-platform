import type {
  CarsAdvisorStage,
  CarsConversationPhase,
  CarsConversationState,
  CarsConversationTrace,
  CarsRecommendationOfferStatus,
} from "@/types/carsConversation";

export function conversationStateFromPhase(phase: CarsConversationPhase): CarsConversationState {
  if (phase === "SOCIAL_OPEN") return "SOCIAL_OPEN";
  if (phase === "SOCIAL_DETOUR") return "SOCIAL_DETOUR";
  if (phase === "OFFERING") return "OFFER_AWAITING_CONSENT";
  if (phase === "RECOMMENDATION_SHOWN" || phase === "DECISION_READY") return "RECOMMENDATION_SHOWN";
  if (phase === "FINAL_TRADEOFF") return "FINAL_DISCRIMINATOR_REQUIRED";
  if (phase === "LIMITED_BY_EVIDENCE") return "INSUFFICIENT_SUPPORTED_EVIDENCE";
  if (phase === "RECOVERING") return "SYSTEM_FAILURE";
  if (phase === "CLARIFYING") return "CLARIFICATION_REQUIRED";
  return "COLLECTING_CONTEXT";
}

export function advisorDefaults(trace?: Partial<CarsConversationTrace>): Pick<
  CarsConversationTrace,
  "advisorStage" | "vehicleIntentEstablished" | "humanReady" | "governedReady" | "recommendationOfferStatus"
> {
  return {
    advisorStage: trace?.advisorStage ?? "SOCIAL_OPEN",
    vehicleIntentEstablished: trace?.vehicleIntentEstablished ?? false,
    humanReady: trace?.humanReady ?? false,
    governedReady: trace?.governedReady ?? false,
    recommendationOfferStatus: trace?.recommendationOfferStatus ?? "NONE",
  };
}

export function withAdvisorStage(
  trace: CarsConversationTrace,
  stage: CarsAdvisorStage,
  extras: Partial<CarsConversationTrace> = {},
): CarsConversationTrace {
  const phase = extras.phase ?? phaseFromAdvisorStage(stage, trace.phase);
  return {
    ...trace,
    ...extras,
    advisorStage: stage,
    phase,
    state: extras.state ?? conversationStateFromPhase(phase),
  };
}

export function phaseFromAdvisorStage(
  stage: CarsAdvisorStage,
  fallback: CarsConversationPhase,
): CarsConversationPhase {
  if (stage === "SOCIAL_OPEN") return "SOCIAL_OPEN";
  if (stage === "SOCIAL_DETOUR") return "SOCIAL_DETOUR";
  if (stage === "OFFER_AWAITING_CONSENT" || stage === "AUTHORIZED_CANDIDATE_HELD") return "OFFERING";
  if (stage === "RECOMMENDATION_SHOWN") return "RECOMMENDATION_SHOWN";
  if (stage === "RECOMMENDATION_DECLINED") return "RECOMMENDATION_DECLINED";
  if (stage === "RECOMMENDATION_REJECTED") return "RECOMMENDATION_REJECTED";
  if (stage === "PAUSED") return "PAUSED";
  if (stage === "RECOVERY") return "RECOVERING";
  if (stage === "SYSTEM_LIMITED" || stage === "NOT_RECOMMENDABLE") return "LIMITED_BY_EVIDENCE";
  if (stage === "HUMAN_READY") return "READY_TO_EVALUATE";
  if (stage === "TRADEOFF_RESOLUTION") return "CLARIFYING";
  if (stage === "VEHICLE_INTENT" || stage === "CONTEXT_UNDERSTANDING") return "DISCOVERING";
  return fallback;
}

export function offerIsActive(status: CarsRecommendationOfferStatus | undefined): boolean {
  return status === "AWAITING_CONSENT";
}

export function cardMayRender(status: CarsRecommendationOfferStatus | undefined): boolean {
  return status === "REVEALED";
}
