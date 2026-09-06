import { describe, expect, it } from "vitest";
import { assessHumanOperationsReadiness } from "./readiness/humanOperationsReadiness";
describe("used-cars human operations readiness", () => {
  it("blocks pilot operations, moderation and support", () => expect(assessHumanOperationsReadiness()).toMatchObject({ ready: false, pilotOperationsAuthorized: false, moderationActionsAuthorized: false, supportContactAuthorized: false }));
  it("recognizes internal staffing and runbook models", () => { expect(assessHumanOperationsReadiness().missing).not.toContain("staffingModelReady"); expect(assessHumanOperationsReadiness().missing).not.toContain("runbookMatrixReady"); });
});
