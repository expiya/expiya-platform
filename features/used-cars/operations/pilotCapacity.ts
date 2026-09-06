export interface PilotOperationsCapacityInput {
  readonly activeDealers: number;
  readonly activeListings: number;
  readonly expectedDailySubmissions: number;
  readonly expectedDailyLeads: number;
  readonly moderatorReviewCapacityPerDay: number;
  readonly supportLeadCapacityPerDay: number;
  readonly fraudReservePercent: number;
  readonly absenceReservePercent: number;
  readonly maximumModerationBacklogHours: number;
  readonly maximumSupportBacklogHours: number;
}

export function assessPilotOperationsCapacity(input: PilotOperationsCapacityInput) {
  const codes: string[] = [];
  if (input.activeDealers < 1 || input.activeListings < 1) codes.push("PILOT_SCOPE_REQUIRED");
  if (input.expectedDailySubmissions < 0 || input.expectedDailyLeads < 0) codes.push("DEMAND_INVALID");
  if (input.fraudReservePercent < 20) codes.push("FRAUD_RESERVE_INSUFFICIENT");
  if (input.absenceReservePercent < 20) codes.push("ABSENCE_RESERVE_INSUFFICIENT");
  const reserveMultiplier = 1 + (input.fraudReservePercent + input.absenceReservePercent) / 100;
  if (input.moderatorReviewCapacityPerDay < input.expectedDailySubmissions * reserveMultiplier) codes.push("MODERATION_CAPACITY_INSUFFICIENT");
  if (input.supportLeadCapacityPerDay < input.expectedDailyLeads * reserveMultiplier) codes.push("SUPPORT_CAPACITY_INSUFFICIENT");
  if (input.maximumModerationBacklogHours > 24) codes.push("MODERATION_BACKLOG_LIMIT_TOO_HIGH");
  if (input.maximumSupportBacklogHours > 8) codes.push("SUPPORT_BACKLOG_LIMIT_TOO_HIGH");
  return Object.freeze({ ready: codes.length === 0, codes: Object.freeze(codes), pilotActivationAuthorized: false as const });
}
