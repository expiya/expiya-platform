import { describe, expect, it } from "vitest";
import { selectCarsDecisionRoute } from "./publicRoute.server";

describe("public V2 route selection", () => {
  it("keeps V1 when the public flag is off", () => expect(selectCarsDecisionRoute(false, { ready: true })).toBe("V1"));
  it("keeps V1 when any readiness check fails", () => expect(selectCarsDecisionRoute(true, { ready: false })).toBe("V1"));
  it("selects V2 only for explicit flag plus complete readiness", () => expect(selectCarsDecisionRoute(true, { ready: true })).toBe("V2"));
});
