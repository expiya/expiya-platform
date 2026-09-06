import { describe, expect, it } from "vitest";
import { validateProductDecisionApproval } from "./governance/decisionApproval";
import { usedCarsProductDecisions } from "./governance/productDecisions";
import { serdarProductAndOperationsApprovals } from "./governance/serdarOwnerApprovals";
describe("Serdar Akgül product and operations approvals", () => {
  it("records six valid role-owner approvals", () => expect(serdarProductAndOperationsApprovals.every((approval) => validateProductDecisionApproval({ decision: usedCarsProductDecisions.find((decision) => decision.decisionId === approval.decisionId)!, approval, now: "2026-09-02" }).valid)).toBe(true));
  it("leaves only legal and security decisions pending", () => expect(usedCarsProductDecisions.filter((decision) => decision.status === "PROPOSED").map((decision) => decision.decisionId)).toEqual(["UC-PD-003", "UC-PD-007", "UC-PD-008", "UC-PD-009"]));
  it("does not authorize production effects", () => expect(usedCarsProductDecisions.every((decision) => !decision.productionEffectAuthorized)).toBe(true));
});
