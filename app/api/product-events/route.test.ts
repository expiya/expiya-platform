import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("@/lib/server/postgres", () => ({ getPostgresDatabase: () => ({ query }) }));
vi.mock("@/lib/security/requestSecurity", () => ({
  verifySameOrigin: () => null,
  enforceRateLimit: () => null,
  readJsonWithLimit: (request: Request) => request.json(),
}));

import { POST } from "./route";

describe("POST /api/product-events", () => {
  beforeEach(() => query.mockReset().mockResolvedValue({}));

  it("records a submitted seller research request with its location", async () => {
    const response = await POST(new Request("https://expiya.com/api/product-events", {
      method: "POST",
      body: JSON.stringify({
        eventName: "SELLER_RESEARCH_SUBMITTED",
        conversationId: "b47ecb8a-d1eb-4ae5-a697-03e5b13a63f2",
        decisionId: "dec_1",
        carId: "renault-clio",
        province: "İstanbul",
        district: "Kadıköy",
      }),
    }));

    expect(response.status).toBe(201);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into product_events"), expect.arrayContaining(["İstanbul", "Kadıköy"]));
  });

  it("rejects a submitted request without a district", async () => {
    const response = await POST(new Request("https://expiya.com/api/product-events", {
      method: "POST",
      body: JSON.stringify({ eventName: "SELLER_RESEARCH_SUBMITTED", decisionId: "dec_1", carId: "renault-clio", province: "İstanbul" }),
    }));
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});
