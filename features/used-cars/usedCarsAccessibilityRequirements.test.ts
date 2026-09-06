import { describe, expect, it } from "vitest";
import { usedCarsAccessibilityRequirements, validateAccessibilityRequirementRegistry } from "./accessibility/requirements";
describe("used-cars accessibility requirements", () => {
  it("defines a valid release-blocking registry", () => { expect(usedCarsAccessibilityRequirements).toHaveLength(15); expect(validateAccessibilityRequirementRegistry(usedCarsAccessibilityRequirements)).toEqual([]); expect(usedCarsAccessibilityRequirements.every((item) => item.releaseBlocking)).toBe(true); });
  it("covers non-color trust communication", () => expect(usedCarsAccessibilityRequirements.find((item) => item.requirementId === "A11Y-012")?.methods).toContain("COGNITIVE_REVIEW"));
});
