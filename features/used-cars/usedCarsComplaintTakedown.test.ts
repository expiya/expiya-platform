import { describe, expect, it } from "vitest";
import { assessComplaintChannelReadiness } from "./moderation/complaintChannels";
import { evaluateComplaintAction } from "./moderation/complaintTakedown";
import { planRegulatoryReconciliation } from "./listing/regulatoryReconciliation";

const complaint = { caseId: "case-1", listingId: "listing-1", tenantId: "tenant-1", applicantType: "VEHICLE_OWNER" as const, reason: "UNAUTHORIZED_LISTING" as const, status: "RECEIVED" as const, receivedAt: "2026-09-02T09:00:00Z", slaDueAt: "2026-09-02T12:00:00Z", reasonCode: null, firstReviewerId: null, secondReviewerId: null, appealAvailable: true, resultNotificationPending: true, legalHold: true, immutableAuditHeadChecksum: `sha256:${"a".repeat(64)}` };

describe("complaint and regulatory removal controls", () => {
  it("requires immediate hiding for critical unauthorized listing reports", () => expect(evaluateComplaintAction({ complaint, nextStatus: "TEMPORARILY_HIDDEN", now: "2026-09-02T10:00:00Z", eidsValid: true, iettsValid: true })).toMatchObject({ allowed: true, immediateTemporaryHideRequired: true, preserveForLegalHold: true, productionMutationAuthorized: false }));
  it("blocks a non-hiding transition for invalid EIDS", () => expect(evaluateComplaintAction({ complaint: { ...complaint, reason: "OTHER" }, nextStatus: "ACKNOWLEDGED", now: "2026-09-02T10:00:00Z", eidsValid: false, iettsValid: true }).codes).toContain("IMMEDIATE_TEMPORARY_HIDE_REQUIRED"));
  it("plans fail-closed expiry and sold removals without mutating production", () => expect(planRegulatoryReconciliation([{ listingId: "listing-1", status: "SOLD", eidsValidUntil: "2026-09-01", eidsResult: "VERIFIED", iettsValid: false, mandatoryDataValidUntil: "2026-09-01" }], "2026-09-02")).toMatchObject({ removals: [{ listingId: "listing-1", failClosed: true }], productionMutationAuthorized: false, realNotificationAuthorized: false }));
  it("keeps complaint intake blocked until the real telephone number exists", () => expect(assessComplaintChannelReadiness()).toMatchObject({ ready: false, missing: ["PHONE_NUMBER_REQUIRED"], productionIntakeAuthorized: false }));
});
