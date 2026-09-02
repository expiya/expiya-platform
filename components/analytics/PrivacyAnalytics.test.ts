import { describe, expect, it } from "vitest";

import { sanitizeAnalyticsEvent } from "./PrivacyAnalytics";

describe("analytics URL privacy", () => {
  it("removes query strings, fragments and dynamic identifiers", () => {
    expect(sanitizeAnalyticsEvent({ type: "pageview", url: "https://www.expiya.com/cars/variant/secret-variant?handoff=signed-token#advisor" })).toEqual({ type: "pageview", url: "https://www.expiya.com/cars/variant/[id]" });
    expect(sanitizeAnalyticsEvent({ type: "event", url: "https://www.expiya.com/cars/decision/internal-id?token=secret" })).toEqual({ type: "event", url: "https://www.expiya.com/cars/decision/[id]" });
    expect(sanitizeAnalyticsEvent({ type: "event", url: "https://www.expiya.com/decision/legacy-id?token=secret" })).toEqual({ type: "event", url: "https://www.expiya.com/decision/[id]" });
  });

  it("fails closed for malformed URLs", () => {
    expect(sanitizeAnalyticsEvent({ type: "pageview", url: "not-a-url" })).toBeNull();
  });
});
