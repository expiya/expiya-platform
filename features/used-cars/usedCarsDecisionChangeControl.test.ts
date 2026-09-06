import { describe, expect, it } from "vitest";
import { requiredChangeReviewRoles, validateDecisionChangeProposal } from "./governance/decisionChangeControl";
const checksum = `sha256:${"b".repeat(64)}`;
describe("used-cars product decision change control", () => {
  it("requires impact and rollback evidence", () => expect(validateDecisionChangeProposal({ proposalId: "p", decisionId: "UC-PD-001", currentApprovalId: "a", currentSnapshotChecksum: checksum, proposedValue: "new", rationale: "change", impacts: [], rollbackPlanChecksum: null, requestedBy: "u", requestedAt: "2026-09-01T00:00:00Z" })).toMatchObject({ valid: false, originalApprovalRemainsEffective: true, automaticSupersedeAuthorized: false }));
  it("derives cross-functional reviewers from impact", () => expect(requiredChangeReviewRoles(["PARTNER", "DATA", "COMMERCIAL"])).toEqual(["PRODUCT", "LEGAL", "SECURITY", "OPERATIONS"]));
  it("accepts a complete proposal without auto-superseding", () => expect(validateDecisionChangeProposal({ proposalId: "p", decisionId: "UC-PD-001", currentApprovalId: "a", currentSnapshotChecksum: checksum, proposedValue: "new", rationale: "measured pilot result", impacts: ["B2C"], rollbackPlanChecksum: checksum, requestedBy: "u", requestedAt: "2026-09-01T00:00:00Z" }).valid).toBe(true));
});
