import { describe, expect, it } from "vitest";
import { DEMO_ONBOARDING_GATES, canDemoDealerPublish } from "./onboarding";

describe("partner onboarding demo gates", () => {
  it("fails closed while any gate is incomplete", () => {
    expect(canDemoDealerPublish(DEMO_ONBOARDING_GATES)).toBe(false);
  });

  it("requires every gate, including Expiya-owned gates", () => {
    expect(canDemoDealerPublish(DEMO_ONBOARDING_GATES.map(gate => ({ ...gate, status: "COMPLETE" })))).toBe(true);
    expect(DEMO_ONBOARDING_GATES.some(gate => gate.owner === "EXPIYA")).toBe(true);
  });
});
