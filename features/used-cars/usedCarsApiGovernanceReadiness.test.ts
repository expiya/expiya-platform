import { describe, expect, it } from "vitest";
import { assessApiGovernanceReadiness } from "./readiness/apiGovernanceReadiness";
describe("used-cars API governance readiness", () => {
  it("blocks APIs, partner access and webhooks", () => expect(assessApiGovernanceReadiness()).toMatchObject({ ready: false, productionApiEnabled: false, externalPartnerApiAuthorized: false, webhookProcessingAuthorized: false }));
  it("recognizes internal registry and protocol contracts", () => { expect(assessApiGovernanceReadiness().missing).not.toContain("endpointRegistryReady"); expect(assessApiGovernanceReadiness().missing).not.toContain("errorAndPaginationContractsReady"); });
});
