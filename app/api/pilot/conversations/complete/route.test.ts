import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), poolQuery: vi.fn(), clientQuery: vi.fn(), release: vi.fn() }));
vi.mock("@/features/pilot/pilotSession.server", () => ({ pilotSessionFromRequest: mocks.session }));
vi.mock("@/features/decision/v2/integration/durableStoreInitialization.server", () => ({ initializeCarsDecisionV2DurableStore: async () => ({ status: "READY", pool: { query: mocks.poolQuery, connect: async () => ({ query: mocks.clientQuery, release: mocks.release }) } }) }));
import { POST } from "./route";
const request = () => new Request("http://localhost/api/pilot/conversations/complete", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify({ conversationId: "d9428888-122b-11e1-b85c-61cd3cbb3210", messages: [{ id: "u1", role: "user", content: "SUV istiyorum" }, { id: "a1", role: "assistant", content: "Kullanımınız?" }] }) });
describe("pilot conversation completion route", () => {
  beforeEach(() => { mocks.session.mockReset(); mocks.poolQuery.mockReset(); mocks.clientQuery.mockReset(); mocks.release.mockReset(); });
  it("requires an authenticated pilot", async () => { mocks.session.mockReturnValue(null); expect((await POST(request())).status).toBe(401); });
  it("creates an idempotent username-bound conversation archive", async () => {
    mocks.session.mockReturnValue({ username: "pilot.one", displayName: "Pilot One", expiresAt: "2099-01-01T00:00:00.000Z" });
    mocks.poolQuery.mockResolvedValueOnce({ rows: [{ ready: true }] });
    mocks.clientQuery.mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ revision: 2, memory: { turn: 2 } }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ completed_count: 199 }] }).mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({});
    const response = await POST(request()); expect(response.status).toBe(200); expect(await response.json()).toEqual({ archived: true, conversationId: "d9428888-122b-11e1-b85c-61cd3cbb3210" });
    expect(mocks.clientQuery.mock.calls[5]?.[1]).toEqual(expect.arrayContaining(["pilot.one", JSON.stringify({ version: 1, source: "CARS_DECISION_V2_DURABLE_STORE", revision: 2, memory: { turn: 2 } }), 1, 1]));
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("rejects a new archive when the pilot already has 200 completed conversations", async () => {
    mocks.session.mockReturnValue({ username: "pilot.one", displayName: "Pilot One", expiresAt: "2099-01-01T00:00:00.000Z" });
    mocks.poolQuery.mockResolvedValueOnce({ rows: [{ ready: true }] });
    mocks.clientQuery.mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ completed_count: 200 }] }).mockResolvedValueOnce({});
    const response = await POST(request()); expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ reasonCode: "PILOT_CONVERSATION_LIMIT_REACHED" });
    expect(mocks.clientQuery.mock.calls.some(([sql]) => String(sql).startsWith("insert into"))).toBe(false);
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});
