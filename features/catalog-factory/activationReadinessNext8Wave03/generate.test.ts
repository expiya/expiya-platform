import { describe, expect, it } from "vitest";
import { generateNext8AndWave03ActivationReadiness } from "./generate";

describe("separate next8 and Wave-03 activation readiness", () => {
  it("makes A a 94→102 non-executed CAS plan", async () => { const { a } = await generateNext8AndWave03ActivationReadiness(); expect(a.status).toBe("PASS_NOT_AUTHORIZED_NOT_EXECUTED"); expect(a.proposedPointer.totals).toEqual({ before: 94, additions: 8, active: 102 }); expect(a.gates).toMatchObject({ pReady: false, yReady: false, noSilentDrop: true }); });
  it("keeps B blocked until A receipt and proposes 102→105 separately", async () => { const { a, b } = await generateNext8AndWave03ActivationReadiness(); expect(b.status).toBe("DEPENDENCY_BLOCKED_UNTIL_A_SUCCESS_RECEIPT"); expect(b.dependency).toMatchObject({ requiredAReceiptTemplateDigest: a.receiptTemplate.receiptTemplateDigest, currentlySatisfied: false, failClosed: true }); expect(b.proposedPointer.totals).toEqual({ before: 102, additions: 3, active: 105 }); });
  it("does not mix approvals or authorize mutations", async () => { const { a, b } = await generateNext8AndWave03ActivationReadiness(); expect(a.release.authority.ownerApprovalDigest).not.toBe(b.release.authority.ownerApprovalDigest); expect(Object.values(a.mutationBoundary).every(value => value === false)).toBe(true); expect(Object.values(b.mutationBoundary).every(value => value === false)).toBe(true); });
});
