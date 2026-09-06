import { describe, expect, it } from "vitest";
import { evaluatePartnerRoleAssignment, partnerSellerRole } from "./partner/partnerAccessPolicy";
import { buildWeeklyStockReport, weeklyStockReportSchedule } from "./partner/weeklyStockReport";

describe("simplified partner foundation", () => {
  it("exposes only the full-access seller role", () => {
    expect(partnerSellerRole.assignableRoles).toEqual(["SELLER_FULL_ACCESS"]);
    expect(evaluatePartnerRoleAssignment("SELLER_FULL_ACCESS")).toMatchObject({ allowed: true, productionMutationAuthorized: false });
    expect(evaluatePartnerRoleAssignment("INVENTORY_EDITOR")).toMatchObject({ allowed: false, reason: "ONLY_FULL_ACCESS_ROLE_IS_ASSIGNABLE" });
  });
  it("schedules a Monday Istanbul report without sending real email", () => expect(weeklyStockReportSchedule).toMatchObject({ weekday: "MONDAY", localTime: "09:00", timeZone: "Europe/Istanbul", realEmailDeliveryAuthorized: false }));
  it("builds a capacity-aware, fingerprint-only weekly report", () => {
    const report = buildWeeklyStockReport({ tenantId: "t1", reportDate: "2026-09-07", activeListingLimit: 25, counts: { ACTIVE: 20, IN_MODERATION: 2, DRAFT: 3, RESERVED: 1, SOLD: 4, UNPUBLISHED: 1 }, staleActiveStockCount: 2, recipientEmailFingerprints: ["hmac:mail"] });
    expect(report).toMatchObject({ valid: true, activeStockCount: 20, remainingActiveCapacity: 5, utilizationPercent: 80, enqueueAuthorized: false, realEmailDeliveryAuthorized: false, rawRecipientEmailIncluded: false });
  });
});
