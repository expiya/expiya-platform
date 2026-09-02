import { describe, expect, it } from "vitest";

import { carsDecisionPath, carsRoutes, legacyCarsRedirects } from "./carsRoutes";

describe("Cars platform route boundary", () => {
  it("keeps canonical Cars UI routes below /cars", () => {
    expect(Object.values(carsRoutes).every((path) => path === "/cars" || path.startsWith("/cars/"))).toBe(true);
    expect(carsDecisionPath("v3-variant/1")).toBe("/cars/decision/v3-variant%2F1");
  });

  it("keeps compatibility redirects temporary and excludes APIs and Used Cars", () => {
    expect(legacyCarsRedirects).toEqual([
      { source: "/analysis", destination: "/cars/analysis", permanent: false },
      { source: "/decision/:id", destination: "/cars/decision/:id", permanent: false },
      { source: "/arac-oneri-kosullari", destination: "/cars/arac-oneri-kosullari", permanent: false },
      { source: "/satis-danismani-bilgilendirmesi", destination: "/cars/satis-danismani-bilgilendirmesi", permanent: false },
    ]);
    expect(legacyCarsRedirects.some(({ source, destination }) => source.startsWith("/api/") || destination.startsWith("/api/"))).toBe(false);
    expect(legacyCarsRedirects.some(({ source, destination }) => source.includes("ikinciel") || destination.includes("ikinciel"))).toBe(false);
  });
});
