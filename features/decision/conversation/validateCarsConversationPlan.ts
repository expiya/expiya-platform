import type { CarsConversationTrace } from "@/types/carsConversation";

import type { CarsConversationTurnPlan } from "./carsConversationPlanSchema";
import type { CarsLatestAct } from "./carsSocialIntent";
import { isDiscoveryQuestion, isPureGreetingText } from "./carsSocialIntent";
import { isVagueContinuityPhrase } from "./carsForwardProgress";
import { messageRevealsCandidateIdentity } from "./publicCarsDecision";
import { messageClaimsAffordability } from "./carsAcquisitionAuthority";
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
  | "SOCIAL_FORCED_REDIRECT"
  | "CAPABILITY_THEN_GREETING"
  | "CAPABILITY_THEN_DISCOVERY"
  | "CAPABILITY_UNSUPPORTED_PROMISE"
  | "VAGUE_CONTINUITY"
  | "SEMANTIC_REPETITION"
  | "BUDGET_CLAIMED_AS_EVALUATED"
  | "PHASE1_MARKET_QUESTION"
  | "AFFORDABILITY_CLAIMED_WITHOUT_PASS";


const INTERNAL_TERMS = /(?:koltuk veya bagaj için sayısal eşik|mevcut doğrulanmış (?:karar )?(?:veri|kapsam)|doğrulanmış (?:aile|ihtiyaç|aday|model)|supported decision dimension|minimum hacmi litre|litre olarak belirt|evidence|runtime vehicle|artifact version|RVC-PILOT)/iu;
const STATUS_LANGUAGE = /(?:kaydettim|not ettim)/iu;
const INVENTED_FACTS = /(?:fiyatı\s+\d|stokta\s+\d|şu anda \d+ adet|katalogda yokmuş gibi uydur)/iu;
const FORCED_REDIRECT = /size uygun aracı birlikte daraltalım/iu;
const UNSUPPORTED_ADVISOR_CLAIM = /(?:masraf (?:riski|potansiyeli)|bakım (?:riski|maliyeti)|güvenilirlik|ikinci el değeri|yeniden satış|süspansiyon|yalıtım|kabin (?:yalıtımı|sessizliği)|koltuk konforu|jant.{0,12}lastik.{0,12}konfor)/iu;

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
  if (input.plan.question && input.memory.answeredQuestionPurposes.includes(input.plan.question.purpose)) return "SEMANTIC_REPETITION";
  if (input.plan.question?.purpose === "DAILY_VS_OFFROAD" && !input.memory.requirements.some((entry) => (
    entry.key === "USAGE_ROUGH_ROAD" || entry.key === "USAGE_SERIOUS_OFF_ROAD" || entry.key === "USAGE_STABILIZED_ROAD"
  ))) return "UNSUPPORTED_HARD_REQUIREMENT_CLAIMED";
  if (/(?:yol dışı|off[\s-]?road|arazi)/iu.test(message)
    && input.memory.requirements.some((entry) => entry.key === "USAGE_CITY")
    && !input.memory.requirements.some((entry) => entry.key === "USAGE_ROUGH_ROAD" || entry.key === "USAGE_SERIOUS_OFF_ROAD")) {
    return "UNSUPPORTED_HARD_REQUIREMENT_CLAIMED";
  }
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
  if (input.latestAct.isCapabilityQuestion) {
    if (/merhaba|hoş geldiniz/iu.test(message)) return "CAPABILITY_THEN_GREETING";
    if (isDiscoveryQuestion(message) && !input.latestAct.secondaryActs.includes("VEHICLE_INTENT")) {
      return "CAPABILITY_THEN_DISCOVERY";
    }
    if (/ilan.{0,40}(?:risk|yorum|değerlendir)|mevcut ilan|şu anki ilan|ilanları (?:değerlendir|yorumla|incele)/iu.test(message)) {
      return "CAPABILITY_UNSUPPORTED_PROMISE";
    }
  }
  if (isVagueContinuityPhrase(message)) return "VAGUE_CONTINUITY";
  if (/tüm (?:şart|ihtiyac)|bütçenizi karşıl|bütçe.*karşılıyor/iu.test(message)
    && input.memory.requirements.some((entry) => entry.key === "BUDGET_MAX_TRY" && entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE")) {
    return "BUDGET_CLAIMED_AS_EVALUATED";
  }
  if (messageClaimsAffordability(message) && input.memory.affordabilityState !== "AFFORDABILITY_PASS") {
    return "AFFORDABILITY_CLAIMED_WITHOUT_PASS";
  }
  if (input.plan.question?.purpose === "ACQUISITION_MARKET" || /sıfır mı düşünüyorsun|ikinci el de olur mu/iu.test(message)) {
    return "PHASE1_MARKET_QUESTION";
  }
  if (INTERNAL_TERMS.test(message) || STATUS_LANGUAGE.test(message)) return "EXPOSED_INTERNAL_TERMINOLOGY";
  if (UNSUPPORTED_ADVISOR_CLAIM.test(message)) return "INVENTED_CANDIDATE_FACTS";
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
