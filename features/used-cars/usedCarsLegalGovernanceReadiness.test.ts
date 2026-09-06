import { describe, expect, it } from "vitest";
import { assessLegalGovernanceReadiness } from "./readiness/legalGovernanceReadiness";
describe("used-cars legal governance readiness", () => {
  it("blocks publication, contracts and real consent", () => expect(assessLegalGovernanceReadiness()).toMatchObject({ ready: false, legalTextPublicationAuthorized: false, dealerContractActivationAuthorized: false, realConsentCollectionAuthorized: false }));
  it("recognizes the registry but not legal approval", () => { expect(assessLegalGovernanceReadiness().missing).not.toContain("artifactRegistryReady"); expect(assessLegalGovernanceReadiness().missing).toContain("legalTextsApproved"); });
});
