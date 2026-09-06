import { describe, expect, it } from "vitest";
import { assessContentReviewSuite } from "./staging/contentReviewSuite";
import { usedCarsStagingPublicContentInventory } from "./staging/publicContentInventoryManifest";
describe("used-cars staging content review", () => {
  it("requires separated reviewers and specialist gates without publishing", () => {
    const results = usedCarsStagingPublicContentInventory.map((item) => ({ contentId: item.contentId, context: item.context, checksum: `sha256:${"2".repeat(64)}`, forbiddenLanguageScanPassed: true, trustLabelReviewPassed: true, legalReviewPassed: true, accessibilityReviewPassed: true, evidenceReviewPassed: true, classicSpecialistReviewPassed: item.context === "CLASSIC" ? true : null, sponsorshipSeparationReviewPassed: item.context === "SPONSORED" ? true : null, reviewerIds: ["content", "legal", "a11y", "evidence"], syntheticOnly: true as const }));
    expect(assessContentReviewSuite(results, usedCarsStagingPublicContentInventory.map((item) => item.contentId))).toMatchObject({ complete: true, publicCopyPublicationAuthorized: false, automatedCopyPublicationAuthorized: false });
  });
  it("rejects missing reviews", () => expect(assessContentReviewSuite([], ["COPY-LISTING"]).missing).toEqual(["COPY-LISTING"]));
});
