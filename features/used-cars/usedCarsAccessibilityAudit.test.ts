import { describe, expect, it } from "vitest";
import { assessAccessibilityAudit } from "./accessibility/audit";
describe("used-cars accessibility audit", () => {
  it("fails closed with no evidence", () => expect(assessAccessibilityAudit([], "2026-09-01")).toMatchObject({ complete: false, accessibilityConformanceClaimAuthorized: false, productionUiLaunchAuthorized: false }));
  it("rejects incomplete method coverage", () => expect(assessAccessibilityAudit([{ auditId: "a", requirementId: "A11Y-001", surface: "B2C_MOBILE", methods: [], outcome: "PASS", evidenceChecksum: `sha256:${"a".repeat(64)}`, testerId: "tester", testedAt: "2026-09-01", expiresAt: null, openFindingIds: [] }], "2026-09-01").missing).toContain("A11Y-001:B2C_MOBILE"));
});
