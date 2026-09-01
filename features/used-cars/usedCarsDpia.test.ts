import { describe, expect, it } from "vitest";
import { screenDpia, validateDpiaReview } from "./privacy/dpia";
import { usedCarsProcessingInventoryDraft } from "./privacy/processingInventory";
describe("used-cars DPIA gate", () => {
  it("flags AI assistance for multiple risk reasons", () => expect(screenDpia(usedCarsProcessingInventoryDraft.find((item) => item.purpose === "AI_ASSISTANCE")!)).toMatchObject({ dpiaRequired: true, processingActivationAuthorized: false }));
  it("flags identifier and fraud processing", () => expect(screenDpia(usedCarsProcessingInventoryDraft.find((item) => item.purpose === "FRAUD_PREVENTION")!).reasons).toEqual(expect.arrayContaining(["HIGH_RISK_IDENTIFIER", "FRAUD_PROFILING"])));
  it("blocks high residual risk and missing independent review", () => expect(validateDpiaReview({ activityId: "PA-010", riskReasons: ["AI_CONVERSATION"], necessityAndProportionalityApproved: true, controlsTested: true, residualRisk: "HIGH", privacyReviewerId: "same", securityReviewerId: "same", legalApproverId: null, reviewedAt: "2026-09-01", expiresAt: null }, "2026-09-01").valid).toBe(false));
});
