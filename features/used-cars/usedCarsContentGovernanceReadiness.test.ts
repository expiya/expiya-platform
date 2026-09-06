import { describe, expect, it } from "vitest";
import { assessContentGovernanceReadiness } from "./readiness/contentGovernanceReadiness";
describe("used-cars content governance readiness", () => {
  it("blocks public and automated copy publication", () => expect(assessContentGovernanceReadiness()).toMatchObject({ ready: false, publicCopyPublicationAuthorized: false, automatedCopyPublicationAuthorized: false }));
  it("recognizes internal copy controls", () => { expect(assessContentGovernanceReadiness().missing).not.toContain("trustLanguageRegistryReady"); expect(assessContentGovernanceReadiness().missing).not.toContain("publicCopyGateReady"); });
});
