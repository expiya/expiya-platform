import { describe, expect, it } from "vitest";
import { assessAccessibilityReadiness } from "./readiness/accessibilityReadiness";
describe("used-cars accessibility readiness", () => {
  it("blocks conformance claims and production UI", () => expect(assessAccessibilityReadiness()).toMatchObject({ ready: false, accessibilityConformanceClaimAuthorized: false, productionUiLaunchAuthorized: false }));
  it("recognizes the internal requirement registry", () => expect(assessAccessibilityReadiness().missing).not.toContain("requirementRegistryReady"));
});
