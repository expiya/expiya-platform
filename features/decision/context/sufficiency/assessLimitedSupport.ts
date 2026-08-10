import type {
  LimitedSupportAssessment,
  LimitedSupportOutcome,
} from "@/types/contextSufficiency";

export interface LimitedSupportDetermination {
  outcome: LimitedSupportOutcome;
  limitations: string[];
}

export function assessLimitedSupport(
  determination: LimitedSupportDetermination,
): LimitedSupportAssessment {
  return {
    outcome: determination.outcome,
    limitations: [...determination.limitations],
  };
}
