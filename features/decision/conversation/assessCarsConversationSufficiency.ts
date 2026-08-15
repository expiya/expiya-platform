import type { CarsConversationTrace, CarsQuestionPurpose, CarsRequirementKey } from "@/types/carsConversation";

import { latestRequirement } from "./carsRequirementLedger";

export interface CarsSufficiencyAssessment {
  readonly readyToEvaluate: boolean;
  readonly phase: CarsConversationTrace["phase"];
  readonly usageUnderstood: boolean;
  readonly hasEvaluableHardConstraint: boolean;
  readonly materialAmbiguityRemains: boolean;
  readonly nextPurpose?: CarsQuestionPurpose;
  readonly reason: string;
}

const USAGE_KEYS: readonly CarsRequirementKey[] = [
  "USAGE_CAMP",
  "USAGE_SERIOUS_OFF_ROAD",
  "USAGE_ROUGH_ROAD",
  "USAGE_STABILIZED_ROAD",
  "USAGE_CITY",
  "USAGE_HIGHWAY",
  "USAGE_FAMILY",
];

export function assessCarsConversationSufficiency(
  trace: CarsConversationTrace,
): CarsSufficiencyAssessment {
  const seats = latestRequirement(trace, "MIN_SEATS");
  const cargo = latestRequirement(trace, "MIN_CARGO_L");
  const party = latestRequirement(trace, "PARTY_SIZE");
  const usageUnderstood = USAGE_KEYS.some((key) => latestRequirement(trace, key));
  const hasEvaluableHardConstraint = Boolean(seats || cargo);
  const bothEvaluable = Boolean(seats && cargo);
  const asked = new Set(trace.askedQuestionPurposes);
  const answered = new Set(trace.answeredQuestionPurposes);

  if (bothEvaluable) {
    return {
      readyToEvaluate: true,
      phase: "READY_TO_EVALUATE",
      usageUnderstood,
      hasEvaluableHardConstraint: true,
      materialAmbiguityRemains: false,
      reason: "Supported seat and cargo thresholds are both explicit.",
    };
  }

  const nextPurpose = selectHighestValueQuestion(trace, asked, answered, {
    usageUnderstood,
    seats: Boolean(seats),
    cargo: Boolean(cargo),
    party: Boolean(party),
  });

  return {
    readyToEvaluate: false,
    phase: nextPurpose ? (trace.latestUserTurn === 0 ? "DISCOVERING" : "CLARIFYING") : "LIMITED_BY_EVIDENCE",
    usageUnderstood,
    hasEvaluableHardConstraint,
    materialAmbiguityRemains: Boolean(nextPurpose),
    nextPurpose,
    reason: nextPurpose
      ? `A remaining question can still change the supported decision: ${nextPurpose}.`
      : "No remaining supported question would change the candidate set.",
  };
}

function selectHighestValueQuestion(
  trace: CarsConversationTrace,
  asked: Set<CarsQuestionPurpose>,
  answered: Set<CarsQuestionPurpose>,
  flags: { usageUnderstood: boolean; seats: boolean; cargo: boolean; party: boolean },
): CarsQuestionPurpose | undefined {
  const unused = (purpose: CarsQuestionPurpose) => !asked.has(purpose) && !answered.has(purpose);
  const deferredDailyUse = trace.questionMemory?.some((entry) => entry.purpose === "DAILY_VS_OFFROAD" && entry.status === "DEFERRED");
  if (deferredDailyUse && !flags.seats && !flags.cargo) return "DAILY_VS_OFFROAD";
  if (latestRequirement(trace, "USAGE_ROUGH_ROAD") && !answered.has("USAGE_DETAIL") && unused("USAGE_DETAIL") && !flags.seats && !flags.cargo) {
    return "USAGE_DETAIL";
  }
  if (flags.party && !flags.seats && !answered.has("PARTY_CONFIRMATION") && !answered.has("MIN_SEATS")) {
    return "PARTY_CONFIRMATION";
  }
  if (flags.seats && !flags.cargo && !answered.has("MIN_CARGO")) return "MIN_CARGO";
  if (flags.cargo && !flags.seats && !answered.has("MIN_SEATS")) return "MIN_SEATS";
  if (!flags.usageUnderstood && unused("PRIMARY_USAGE") && unused("USAGE_DETAIL")) {
    return "PRIMARY_USAGE";
  }
  if (
    unused("DAILY_VS_OFFROAD")
    && !flags.seats
    && (latestRequirement(trace, "USAGE_CAMP") || latestRequirement(trace, "USAGE_STABILIZED_ROAD") || latestRequirement(trace, "USAGE_SERIOUS_OFF_ROAD"))
  ) {
    return "DAILY_VS_OFFROAD";
  }
  if (!flags.seats && !asked.has("MIN_SEATS") && !answered.has("MIN_SEATS") && flags.usageUnderstood && trace.latestUserTurn >= 2) {
    return "MIN_SEATS";
  }
  return undefined;
}
