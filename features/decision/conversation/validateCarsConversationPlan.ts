import type { CarsConversationTrace } from "@/types/carsConversation";

import type { CarsConversationTurnPlan } from "./carsConversationPlanSchema";
import type { CarsLatestAct } from "./carsSocialIntent";
import { isDiscoveryQuestion, isPureGreetingText } from "./carsSocialIntent";
import { messageRevealsCandidateIdentity } from "./publicCarsDecision";
import { offerIsActive } from "./carsAdvisorState";

export type CarsPlanValidationFailure =
  | "MULTIPLE_QUESTIONS"
  | "GREETING_THEN_DISCOVERY"
  | "RECOMMENDATION_WITHOUT_AUTHORIZATION"
  | "IDENTITY_BEFORE_CONSENT"
  | "OFFER_WITHOUT_CANDIDATE"
  | "INVENTED_CANDIDATE_FACTS"
  | "IGNORED_CORRECTION"
  | "EXPOSED_INTERNAL_TERMINOLOGY"
  | "UNSUPPORTED_HARD_REQUIREMENT_CLAIMED"
  | "REJECTED_CANDIDATE_SUBSTITUTION"
  | "SOCIAL_FORCED_REDIRECT";

const INTERNAL_TERMS = /(?:koltuk veya bagaj için sayısal eşik|mevcut doğrulanmış (?:karar )?(?:veri|kapsam)|supported decision dimension|minimum hacmi litre|litre olarak belirt|evidence|runtime vehicle|artifact version|RVC-PILOT)/iu;
const STATUS_LANGUAGE = /(?:kaydettim|not ettim)/iu;
const INVENTED_FACTS = /(?:fiyatı\s+\d|stokta\s+\d|şu anda \d+ adet|katalogda yokmuş gibi uydur)/iu;
const FORCED_REDIRECT = /size uygun aracı birlikte daraltalım/iu;

function questionCount(text: string): number {
  return (text.match(/\?/gu) ?? []).length;
}

export function validateCarsConversationPlan(input: {
  readonly plan: CarsConversationTurnPlan;
  readonly memory: CarsConversationTrace;
  readonly latestAct: CarsLatestAct;
  readonly latestUserText: string;
  readonly recommendationMayBeOffered: boolean;
  readonly candidateMayBeRevealed: boolean;
}): CarsPlanValidationFailure | undefined {
  const message = input.plan.assistantMessage;
  if (questionCount(message) > 1) return "MULTIPLE_QUESTIONS";
  if (input.plan.move === "ASK_ONE_QUESTION" && !input.plan.question) return "MULTIPLE_QUESTIONS";
  if (input.latestAct.isPureGreeting || isPureGreetingText(input.latestUserText)) {
    if (input.plan.move === "ASK_ONE_QUESTION" && input.plan.question && isDiscoveryQuestion(input.plan.question.text)) {
      return "GREETING_THEN_DISCOVERY";
    }
    if (isDiscoveryQuestion(message) || FORCED_REDIRECT.test(message)) return "GREETING_THEN_DISCOVERY";
    if (input.plan.recommendationAction !== "NONE") return "RECOMMENDATION_WITHOUT_AUTHORIZATION";
  }
  if (input.latestAct.isPureSocial && !input.latestAct.hasVehicleIntent && isDiscoveryQuestion(message)) {
    return "SOCIAL_FORCED_REDIRECT";
  }
  if (INTERNAL_TERMS.test(message) || STATUS_LANGUAGE.test(message)) return "EXPOSED_INTERNAL_TERMINOLOGY";
  if (INVENTED_FACTS.test(message)) return "INVENTED_CANDIDATE_FACTS";
  if (!input.candidateMayBeRevealed && messageRevealsCandidateIdentity(message)) return "IDENTITY_BEFORE_CONSENT";
  if (input.plan.recommendationAction === "OFFER_ONLY") {
    if (!input.recommendationMayBeOffered) return "OFFER_WITHOUT_CANDIDATE";
    if (messageRevealsCandidateIdentity(message)) return "IDENTITY_BEFORE_CONSENT";
    if (input.plan.move !== "OFFER_RECOMMENDATION" && input.plan.move !== "PAUSE") return "OFFER_WITHOUT_CANDIDATE";
  }
  if (input.plan.recommendationAction === "ACKNOWLEDGE_ACCEPTANCE" && !input.candidateMayBeRevealed) {
    return "IDENTITY_BEFORE_CONSENT";
  }
  if ((input.plan.move === "OFFER_RECOMMENDATION" || /güçlü bir önerim var|önermek istediğim bir araç/iu.test(message))
    && !input.recommendationMayBeOffered && !offerIsActive(input.memory.recommendationOfferStatus)) {
    return "RECOMMENDATION_WITHOUT_AUTHORIZATION";
  }
  if (input.latestAct.isCorrection) {
    const captured = input.memory.capturedOnLatestTurn;
    if (captured.length === 0 && input.plan.proposedMemoryChanges.corrections.length === 0) {
      return "IGNORED_CORRECTION";
    }
  }
  if (/karşılıyor|karşılar|sağlıyor/iu.test(message) && /4x4|donanım|otomatik|pickup/iu.test(message)
    && input.memory.requirements.some((entry) => entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE" && entry.category === "HARD_CONSTRAINT")) {
    return "UNSUPPORTED_HARD_REQUIREMENT_CLAIMED";
  }
  if (input.plan.recommendationAction === "HANDLE_REJECTION" && input.plan.move === "OFFER_RECOMMENDATION") {
    return "REJECTED_CANDIDATE_SUBSTITUTION";
  }
  return undefined;
}
