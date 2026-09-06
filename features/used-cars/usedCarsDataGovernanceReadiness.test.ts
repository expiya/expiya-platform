import { describe, expect, it } from "vitest";
import { assessDataGovernanceReadiness } from "./readiness/dataGovernanceReadiness";
describe("used-cars data governance readiness", () => {
  it("blocks real processing and transfers", () => expect(assessDataGovernanceReadiness()).toMatchObject({ ready: false, productionProcessingAuthorized: false, internationalTransferAuthorized: false, automatedDecisioningAuthorized: false }));
  it("keeps the inventory structure ready while legal decisions remain open", () => expect(assessDataGovernanceReadiness().missing).not.toContain("processingInventoryStructureReady"));
});
