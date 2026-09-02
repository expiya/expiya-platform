import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("paid comparison invoice route boundary", () => {
  it("rejects POST requests without an Origin header", async () => {
    const response = await POST(new Request("https://www.expiya.com/api/cars/paid-comparison/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a cross-origin JSON request before reading sensitive input", async () => {
    const response = await POST(new Request("https://www.expiya.com/api/cars/paid-comparison/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ identityNumber: "11111111111" }),
    }));
    expect(response.status).toBe(403);
  });
});
