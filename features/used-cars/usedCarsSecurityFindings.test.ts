import { describe, expect, it } from "vitest";
import { evaluateSecurityFinding } from "./security-testing/findings";
const base = { findingId: "f", scenarioId: "SEC-001", severity: "HIGH" as const, state: "OPEN" as const, ownerId: "owner", discoveredAt: "2026-09-01", dueAt: "2026-09-10", fixCommit: null, retestEvidenceChecksum: null, retestedBy: null, originalTesterId: "tester", riskAcceptanceId: null, riskAcceptanceExpiresAt: null };
describe("used-cars security findings", () => {
  it("keeps open high findings release-blocking", () => expect(evaluateSecurityFinding(base, "2026-09-02")).toMatchObject({ releaseBlocking: true, automaticRiskAcceptanceAuthorized: false }));
  it("forbids accepting high risk", () => expect(evaluateSecurityFinding({ ...base, state: "RISK_ACCEPTED", riskAcceptanceId: "r", riskAcceptanceExpiresAt: "2026-10-01" }, "2026-09-02").codes).toContain("RISK_ACCEPTANCE_FORBIDDEN_OR_INVALID"));
  it("requires independent retest evidence to close", () => expect(evaluateSecurityFinding({ ...base, state: "CLOSED" }, "2026-09-02").codes).toContain("RETEST_EVIDENCE_REQUIRED"));
});
