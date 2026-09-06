import { describe, expect, it } from "vitest";
import { assessAccessibilityJourneySuite, requiredAccessibilityJourneys } from "./staging/accessibilityJourneySuite";
describe("used-cars staging accessibility journeys", () => {
  it("accepts nine complete synthetic journeys without authorizing claims", () => {
    const results = requiredAccessibilityJourneys.map((journey) => ({ journey, matrixIds: ["A11Y-M01"], keyboardPassed: true, screenReaderPassed: true, visualPassed: true, cognitiveReviewPassed: true, openMajorOrCriticalFindings: 0, evidenceChecksum: `sha256:${"1".repeat(64)}`, independentTesterId: "a11y-reviewer", syntheticOnly: true as const }));
    expect(assessAccessibilityJourneySuite(results)).toMatchObject({ complete: true, accessibilityConformanceClaimAuthorized: false, productionUiLaunchAuthorized: false });
  });
  it("rejects journeys without cognitive review", () => expect(assessAccessibilityJourneySuite([]).missing).toHaveLength(9));
});
