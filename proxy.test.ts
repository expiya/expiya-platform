import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { ACTIVE_P_MATERIALITY_RUNTIME_HEADER, activePMaterialityProxyIntegrity, config, proxy } from "./proxy";

describe("active P-materiality conversation proxy", () => {
  it("covers every active Stage-1 conversation endpoint and excludes unrelated APIs", () => {
    for (const pathname of config.matcher) expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: pathname })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/api/product-events" })).toBe(false);
  });

  it("fails closed unless the immutable 54-category/813-offering release is coherent", async () => {
    expect(activePMaterialityProxyIntegrity()).toMatchObject({ ready: true, releaseId: "SDP-V2-ALL-ACTIVE-CATALOGS-TR-v4.0" });
    const response = proxy(new NextRequest("https://expiya.com/api/electronics/conversation"));
    expect(response.headers.get("x-middleware-request-x-expiya-p-materiality-release")).toContain("SDP-V2-ALL-ACTIVE-CATALOGS-TR-v4.0");
    expect(response.headers.get(ACTIVE_P_MATERIALITY_RUNTIME_HEADER)).toBeNull();
  });
});
