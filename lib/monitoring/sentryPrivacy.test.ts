import { describe, expect, it } from "vitest";

import { scrubSentryEvent } from "./sentryPrivacy";

describe("scrubSentryEvent", () => {
  it("removes user-controlled and identifying request data", () => {
    const scrubbed = scrubSentryEvent({
      breadcrumbs: [{ message: "Bütçem 1 milyon TL" }],
      extra: { conversation: "özel görüşme" },
      message: "Unexpected failure",
      request: {
        cookies: { session: "secret" },
        data: { messages: ["özel görüşme"] },
        headers: { authorization: "Bearer secret" },
        method: "POST",
        url: "https://www.expiya.com/analysis?query=ozel-bilgi#sonuc",
      },
      user: { email: "user@example.com", ip_address: "203.0.113.10" },
    });

    expect(scrubbed).toMatchObject({
      breadcrumbs: [],
      message: "Unexpected failure",
      request: { method: "POST", url: "https://www.expiya.com/analysis" },
    });
    expect(scrubbed.extra).toBeUndefined();
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request).not.toHaveProperty("cookies");
    expect(scrubbed.request).not.toHaveProperty("data");
    expect(scrubbed.request).not.toHaveProperty("headers");
  });
});
