import { beforeEach, describe, expect, it, vi } from "vitest";
const query = vi.fn();
vi.mock("@/lib/server/postgres", () => ({ getPostgresDatabase: () => ({ query }) }));
vi.mock("@/lib/security/requestSecurity", () => ({ verifySameOrigin: () => null, enforceRateLimit: () => null, readJsonWithLimit: (request: Request) => request.json() }));
import { POST } from "./route";

describe("paid comparison client events", () => {
  beforeEach(() => query.mockReset().mockResolvedValue({}));
  it("records only an allowlisted, idempotent and non-PII event", async () => {
    const response = await POST(new Request("https://expiya.com/api/cars/paid-comparison/events", { method: "POST", body: JSON.stringify({ eventId: "11111111-1111-4111-8111-111111111111", eventName: "OFFER_VIEWED", conversationId: "conversation", decisionId: "decision", exactVariantId: "variant" }) }));
    expect(response.status).toBe(201);
    expect(String(query.mock.calls[0]?.[0])).toContain("on conflict (id) do nothing");
    expect(query.mock.calls[0]?.[1]).toHaveLength(5);
  });
  it("rejects arbitrary events and extra payload fields", async () => {
    const response = await POST(new Request("https://expiya.com/api/cars/paid-comparison/events", { method: "POST", body: JSON.stringify({ eventId: "11111111-1111-4111-8111-111111111111", eventName: "BUY_NOW", conversationId: "c", decisionId: "d", exactVariantId: "v", email: "x@example.com" }) }));
    expect(response.status).toBe(400); expect(query).not.toHaveBeenCalled();
  });
});
