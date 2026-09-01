import { describe, expect, it } from "vitest";
import { assessSupplyChainReadiness } from "./readiness/supplyChainReadiness";
describe("used-cars supply-chain readiness", () => {
  it("blocks artifact, secret and exception activation", () => expect(assessSupplyChainReadiness()).toMatchObject({ ready: false, productionArtifactPromotionAuthorized: false, secretActivationAuthorized: false, dependencyExceptionAuthorized: false }));
  it("recognizes internal policy contracts", () => { expect(assessSupplyChainReadiness().missing).not.toContain("dependencyPolicyReady"); expect(assessSupplyChainReadiness().missing).not.toContain("artifactAttestationContractReady"); });
});
