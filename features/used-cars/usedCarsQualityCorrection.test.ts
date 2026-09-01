import { describe, expect, it } from "vitest";
import { canTransitionQualityCase, evaluateQualityCorrection } from "./data-quality/correctionWorkflow";
describe("used-cars quality correction", () => {
  it("uses an explicit correction lifecycle", () => { expect(canTransitionQualityCase("OPEN", "QUARANTINED")).toBe(true); expect(canTransitionQualityCase("OPEN", "CLOSED")).toBe(false); });
  it("requires suspension for critical and high cases", () => expect(evaluateQualityCorrection({ caseId: "c", tenantId: "t", listingId: "l", severity: "CRITICAL", state: "OPEN", openedAt: "2026-09-01", dueAt: "2026-09-02", sourceRevisionId: "r1", correctedRevisionId: null, firstReviewerId: null, secondReviewerId: null, publicationSuspended: false }, "2026-09-01").codes).toContain("PUBLICATION_SUSPENSION_REQUIRED"));
  it("requires a new revision and independent review before closure", () => expect(evaluateQualityCorrection({ caseId: "c", tenantId: "t", listingId: "l", severity: "HIGH", state: "CORRECTED", openedAt: "2026-09-01", dueAt: "2026-09-02", sourceRevisionId: "r1", correctedRevisionId: "r1", firstReviewerId: "same", secondReviewerId: "same", publicationSuspended: true }, "2026-09-01").automaticRepublishAuthorized).toBe(false));
});
