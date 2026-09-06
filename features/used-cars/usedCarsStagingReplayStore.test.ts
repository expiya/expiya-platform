import { describe, expect, it } from "vitest";
import { usedCarsReplayStorePartitions, validateReplayStoreManifest } from "./staging/replayStoreManifest";
import { assessStagingApiContractSuite, requiredStagingApiContractScenarios } from "./staging/apiContractSuite";
describe("used-cars staging replay and API contracts", () => {
  it("defines five isolated disabled replay stores", () => { expect(usedCarsReplayStorePartitions).toHaveLength(5); expect(validateReplayStoreManifest(usedCarsReplayStorePartitions)).toMatchObject({ valid: true, storeEnablementAuthorized: false }); });
  it("requires fourteen negative contract scenarios", () => { expect(requiredStagingApiContractScenarios).toHaveLength(14); expect(assessStagingApiContractSuite([])).toMatchObject({ complete: false, externalApiAuthorizationChanged: false }); });
});
