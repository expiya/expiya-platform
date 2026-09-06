import { describe, expect, it } from "vitest";
import { usedCarsStagingAccessibilityMatrix, validateAccessibilityMatrixManifest } from "./staging/accessibilityMatrixManifest";
import { assessAccessibilityFindingGate } from "./staging/accessibilityFindingGate";
describe("used-cars staging accessibility matrix", () => {
  it("covers surfaces and assistive technologies without configuring a device lab", () => expect(validateAccessibilityMatrixManifest(usedCarsStagingAccessibilityMatrix)).toMatchObject({ valid: true, deviceLabExecutionAuthorized: false }));
  it("blocks unresolved major findings", () => expect(assessAccessibilityFindingGate([{ findingId: "a11y-f1", severity: "MAJOR", status: "OPEN", ownerId: "owner", fixCommit: null, retestEvidenceChecksum: null, retestedBy: null, originalTesterId: "tester" }]).codes).toContain("RELEASE_BLOCKING:a11y-f1"));
});
