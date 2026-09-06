import { describe, expect, it } from "vitest";
import { verifyAuditChain } from "../audit/envelope";
import { DEMO_ANALYTICS_CONTRACT } from "./analytics";
import { buildDemoAuditChain } from "./audit";

describe("partner analytics and audit demos", () => {
  it("keeps organic analytics free of PII, plan and sponsored mixing", () => {
    expect(DEMO_ANALYTICS_CONTRACT).toMatchObject({ containsPii: false, containsPlanCode: false, sponsoredMixed: false });
  });
  it("produces a verifiable append-only audit chain", () => {
    expect(verifyAuditChain(buildDemoAuditChain())).toBe(true);
  });
});
