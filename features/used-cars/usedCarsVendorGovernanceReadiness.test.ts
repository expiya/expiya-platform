import { describe, expect, it } from "vitest";
import { assessVendorGovernanceReadiness } from "./readiness/vendorGovernanceReadiness";
describe("used-cars vendor governance readiness", () => {
  it("keeps vendor and data activation closed", () => expect(assessVendorGovernanceReadiness()).toMatchObject({ ready: false, providerSelectionAuthorized: false, productionAdapterActivationAuthorized: false, realDataTransferAuthorized: false }));
  it("recognizes the internal requirement registry", () => expect(assessVendorGovernanceReadiness().missing).not.toContain("providerRequirementRegistryReady"));
});
