export type RegulatoryRemovalReason = "SOLD" | "STOCK_WITHDRAWN" | "EIDS_EXPIRED" | "EIDS_REVOKED" | "EIDS_INVALID" | "IETTS_INVALID" | "MANDATORY_DATA_STALE";
export interface RegulatoryReconciliationItem { readonly listingId: string; readonly status: "ACTIVE" | "SOLD" | "WITHDRAWN"; readonly eidsValidUntil: string; readonly eidsResult: "VERIFIED" | "REVOKED" | "INVALID"; readonly iettsValid: boolean; readonly mandatoryDataValidUntil: string }

export const usedCarsRegulatoryReconciliationJob = Object.freeze({ cadenceMinutes: 5, syntheticOnly: true as const, realProviderCallsEnabled: false as const, automaticProductionMutationEnabled: false as const });

export function planRegulatoryReconciliation(items: readonly RegulatoryReconciliationItem[], now: string) {
  const removals = items.flatMap(item => {
    const reasons: RegulatoryRemovalReason[] = [];
    if (item.status === "SOLD") reasons.push("SOLD");
    if (item.status === "WITHDRAWN") reasons.push("STOCK_WITHDRAWN");
    if (item.eidsResult === "REVOKED") reasons.push("EIDS_REVOKED"); else if (item.eidsResult === "INVALID") reasons.push("EIDS_INVALID"); else if (item.eidsValidUntil <= now) reasons.push("EIDS_EXPIRED");
    if (!item.iettsValid) reasons.push("IETTS_INVALID");
    if (item.mandatoryDataValidUntil <= now) reasons.push("MANDATORY_DATA_STALE");
    return reasons.length ? [{ listingId: item.listingId, reasons: Object.freeze(reasons), failClosed: true as const }] : [];
  });
  return Object.freeze({ removals: Object.freeze(removals), productionMutationAuthorized: false as const, realNotificationAuthorized: false as const });
}
