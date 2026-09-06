import { describe, expect, it } from "vitest";
import { assessDecisionApprovalCoverage, validateProductDecisionApproval } from "./governance/decisionApproval";
import { usedCarsProductDecisions } from "./governance/productDecisions";

const checksum = `sha256:${"a".repeat(64)}`;
describe("used-cars product decision approval", () => {
  it("requires the registered owner role", () => {
    const decision = usedCarsProductDecisions[0];
    const result = validateProductDecisionApproval({ decision, now: "2026-09-01T00:00:00Z", approval: { approvalId: "a", decisionId: decision.decisionId, decisionSnapshotChecksum: checksum, approvedValue: "pilot", approverId: "u", approverRole: "LEGAL", independentReviewerId: null, independentReviewerRole: null, issuedAt: "2026-08-31T00:00:00Z", expiresAt: null, supersededAt: null } });
    expect(result.codes).toContain("OWNER_ROLE_REQUIRED");
  });
  it("requires independent review for legal and security decisions", () => {
    const decision = usedCarsProductDecisions.find((item) => item.ownerRole === "LEGAL")!;
    const result = validateProductDecisionApproval({ decision, now: "2026-09-01T00:00:00Z", approval: { approvalId: "a", decisionId: decision.decisionId, decisionSnapshotChecksum: checksum, approvedValue: "consent", approverId: "legal-1", approverRole: "LEGAL", independentReviewerId: null, independentReviewerRole: null, issuedAt: "2026-08-31T00:00:00Z", expiresAt: null, supersededAt: null } });
    expect(result.codes).toContain("INDEPENDENT_REVIEW_REQUIRED");
  });
  it("does not turn complete approvals into scope authorization", () => expect(assessDecisionApprovalCoverage({ decisions: [], approvals: [], now: "2026-09-01T00:00:00Z" })).toMatchObject({ complete: true, explicitScopePromotionStillRequired: true, productionEffectAuthorized: false }));
});
