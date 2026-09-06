import { describe, expect, it } from "vitest";
import { USED_CARS_ROUTE_CONTRACT, buildFutureUsedCarsUrl, classifyUsedCarsSurface } from "./routing/contracts";

describe("used-cars URL and application separation", () => {
  it("preserves every legacy subpath in the future canonical structure", () => {
    expect(buildFutureUsedCarsUrl("/ikinciel")).toBe("/cars/ikinciel");
    expect(buildFutureUsedCarsUrl("/ikinciel/arac/demo-1")).toBe("/cars/ikinciel/arac/demo-1");
  });
  it("rejects unrelated redirect inputs", () => {
    expect(() => buildFutureUsedCarsUrl("/cars")).toThrow("NOT_A_USED_CARS_LEGACY_PATH");
  });
  it("keeps partner and B2C security contexts separate", () => {
    expect(classifyUsedCarsSurface(new URL("https://partner.expiya.com/stoklar"))).toBe("PARTNER");
    expect(classifyUsedCarsSurface(new URL("https://www.expiya.com/ikinciel"))).toBe("PUBLIC_B2C");
    expect(USED_CARS_ROUTE_CONTRACT).toMatchObject({ partnerAuthenticationSharedWithB2c: false, partnerAuthorizationSharedWithB2c: false, partnerDataAccessSharedWithB2c: false });
  });
});
