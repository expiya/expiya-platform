import { describe, expect, it } from "vitest";
import { usedCarsStagingPublicContentInventory, validatePublicContentInventoryManifest } from "./staging/publicContentInventoryManifest";
import { runContentRegressionCorpus, usedCarsContentRegressionCorpus } from "./staging/contentRegressionCorpus";
describe("used-cars staging content inventory", () => {
  it("covers seven disabled public copy contexts", () => expect(validatePublicContentInventoryManifest(usedCarsStagingPublicContentInventory)).toMatchObject({ valid: true, contentPublicationAuthorized: false }));
  it("passes the safe and forbidden language corpus", () => expect(runContentRegressionCorpus(usedCarsContentRegressionCorpus)).toMatchObject({ passed: true, automaticPublicationAuthorized: false }));
});
