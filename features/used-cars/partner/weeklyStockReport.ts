export type WeeklyStockReportStatus = "ACTIVE" | "IN_MODERATION" | "DRAFT" | "RESERVED" | "SOLD" | "UNPUBLISHED";
export interface WeeklyStockReportSnapshot {
  readonly tenantId: string; readonly reportDate: string; readonly activeListingLimit: number;
  readonly counts: Readonly<Record<WeeklyStockReportStatus, number>>; readonly staleActiveStockCount: number;
  readonly recipientEmailFingerprints: readonly string[];
}

export const weeklyStockReportSchedule = Object.freeze({
  frequency: "WEEKLY" as const, weekday: "MONDAY" as const, localTime: "09:00" as const,
  timeZone: "Europe/Istanbul" as const, cronExpression: "0 9 * * 1" as const,
  recipientRole: "SELLER_FULL_ACCESS" as const, realEmailDeliveryAuthorized: false as const,
});

export function buildWeeklyStockReport(snapshot: WeeklyStockReportSnapshot) {
  const codes: string[] = [];
  const values = Object.values(snapshot.counts);
  if (!snapshot.tenantId.trim()) codes.push("TENANT_REQUIRED");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(snapshot.reportDate)) codes.push("REPORT_DATE_INVALID");
  if (values.some(value => !Number.isInteger(value) || value < 0)) codes.push("INVALID_STOCK_COUNT");
  if (!Number.isInteger(snapshot.activeListingLimit) || snapshot.activeListingLimit < 1) codes.push("ACTIVE_LISTING_LIMIT_INVALID");
  if (snapshot.recipientEmailFingerprints.length === 0) codes.push("VERIFIED_RECIPIENT_REQUIRED");
  const active = snapshot.counts.ACTIVE;
  return Object.freeze({
    valid: codes.length === 0, codes: Object.freeze(codes), tenantId: snapshot.tenantId, reportDate: snapshot.reportDate,
    subject: `Haftalık stok özeti · ${active} aktif ilan`, activeStockCount: active,
    activeListingLimit: snapshot.activeListingLimit, remainingActiveCapacity: Math.max(0, snapshot.activeListingLimit - active),
    utilizationPercent: Math.min(100, Math.round((active / snapshot.activeListingLimit) * 100)),
    staleActiveStockCount: snapshot.staleActiveStockCount, counts: snapshot.counts,
    recipientEmailFingerprints: snapshot.recipientEmailFingerprints, rawRecipientEmailIncluded: false as const,
    enqueueAuthorized: false as const, realEmailDeliveryAuthorized: false as const,
  });
}
