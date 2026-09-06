import { describe, expect, it } from "vitest";
import { assessRunbookRehearsals, requiredPilotRunbooks } from "./operations/runbookCoverage";
describe("used-cars operations rehearsals", () => {
  it("requires nine operational runbooks", () => { expect(requiredPilotRunbooks).toHaveLength(9); expect(assessRunbookRehearsals([]).missing).toHaveLength(9); });
  it("requires two people, evidence and closed findings", () => expect(assessRunbookRehearsals([{ rehearsalId: "r", runbook: "PILOT_STOP", participants: [{ actorId: "one", role: "PILOT_OWNER" }], startedAt: "2026-09-01", completedAt: "2026-09-01", passed: true, evidenceChecksum: `sha256:${"a".repeat(64)}`, findingsClosed: true }]).missing).toContain("PILOT_STOP"));
});
