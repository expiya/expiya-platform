import type { ConversationEvent } from "./conversationEvent";

export type EventDecisionImpact =
  | "CANDIDATE_SET"
  | "RANKING"
  | "AFFORDABILITY"
  | "OFFER_AUTHORIZATION"
  | "CONVERSATION_ONLY"
  | "SAFETY_ONLY"
  | "OBSERVABILITY_ONLY";

function assertNever(value: never): never {
  throw new TypeError(`Unclassified conversation event: ${JSON.stringify(value)}`);
}

export function classifyConversationEventDecisionImpact(event: ConversationEvent): EventDecisionImpact {
  switch (event.eventType) {
    case "CONSTRAINT":
      if (event.supersedesId || event.status !== "ACTIVE") return "CANDIDATE_SET";
      if (event.decisionEffect === "HARD_FILTER") return "CANDIDATE_SET";
      if (event.decisionEffect === "STRONG_RANK" || event.decisionEffect === "SOFT_RANK") return "RANKING";
      return "OBSERVABILITY_ONLY";
    case "BUDGET_MUTATION": return "AFFORDABILITY";
    case "CANDIDATE_REJECTION": return "CANDIDATE_SET";
    case "PERSONA_ACTIVATED":
    case "PERSONA_DEACTIVATED": return "RANKING";
    case "MODEL_REFERENCE":
      if (event.decisionEffect === "LOOKUP_ONLY") return "OBSERVABILITY_ONLY";
      return event.decisionEffect === "PREFERENCE" ? "RANKING" : "CANDIDATE_SET";
    case "OFFER_LIFECYCLE": return "OFFER_AUTHORIZATION";
    case "RECOMMENDATION_TERMS_ACCEPTED":
    case "OFFER_REVEALED": return "OBSERVABILITY_ONLY";
    case "MATERIAL_QUESTION_ASKED":
    case "MATERIAL_QUESTION_DISPOSITION":
    case "SOCIAL_INTERACTION":
    case "OFF_TOPIC":
    case "VEHICLE_INTENT_ESTABLISHED":
    case "CONVERSATION_STATE_TRANSITION": return "CONVERSATION_ONLY";
    case "ABUSE": return "SAFETY_ONLY";
    case "DIRECT_ANSWER_FULFILLED": return "OBSERVABILITY_ONLY";
    default: return assertNever(event);
  }
}

export function eventInvalidatesOpenOffer(event: ConversationEvent): boolean {
  const impact = classifyConversationEventDecisionImpact(event);
  return impact === "CANDIDATE_SET" || impact === "RANKING" || impact === "AFFORDABILITY";
}
