import { describe, expect, it, vi } from "vitest";
import { PostgresV2ConversationStore } from "./postgresStore.server";
describe("Postgres V2 transaction store", () => { it("rolls back on an event append failure", async () => { const query = vi.fn(async (sql: string) => { if (sql.startsWith("select revision")) return { rowCount: 0, rows: [] }; if (sql.startsWith("insert into cars_decision_v2_events")) throw new Error("append failed"); return { rowCount: 1, rows: [] }; }); const release = vi.fn(); const store = new PostgresV2ConversationStore({ connect: async () => ({ query, release }) } as never); await expect(store.commit({ expectedRevision: 0, next: { conversationId: "c", revision: 1, memory: { memoryFingerprint: "m", decisionFingerprint: "d", catalogAuthority: { releaseVersion: "0.55.0", catalogFingerprint: "catalog" } } as never, messageResults: {} }, events: [{ id: "e", sourceTurn: 1, sequence: 0, eventType: "VEHICLE_INTENT_ESTABLISHED", schemaVersion: 1, createdAt: "2026-08-19T00:00:00.000Z" } as never] })).rejects.toThrow("append failed"); expect(query).toHaveBeenCalledWith("rollback"); expect(release).toHaveBeenCalled(); }); });

it("creates the parent conversation before inserting first-turn events", async () => {
  const calls: string[] = [];
  const query = vi.fn(async (sql: string) => {
    calls.push(sql);
    if (sql.startsWith("select revision")) return { rowCount: 0, rows: [] };
    return { rowCount: 1, rows: [] };
  });
  const store = new PostgresV2ConversationStore({ connect: async () => ({ query, release: vi.fn() }) } as never);
  await store.commit({ expectedRevision: 0, next: { conversationId: "new", revision: 1, memory: { memoryFingerprint: "m", decisionFingerprint: "d", catalogAuthority: { releaseVersion: "v", catalogFingerprint: "catalog" } } as never, messageResults: {} }, events: [{ id: "e", sourceTurn: 1, sequence: 0, eventType: "VEHICLE_INTENT_ESTABLISHED", schemaVersion: 1, createdAt: "2026-08-20T12:00:00.000Z" } as never] });
  expect(calls.findIndex((sql) => sql.startsWith("insert into cars_decision_v2_conversations"))).toBeLessThan(calls.findIndex((sql) => sql.startsWith("insert into cars_decision_v2_events")));
  expect(calls.at(-1)).toBe("commit");
});

describe("Postgres atomic REC audit cutover", () => {
  it("inserts both events before the distinct-timestamp lifecycle update and commits once", async () => {
    const calls: string[] = []; const query = vi.fn(async (sql: string) => { calls.push(sql); if (sql.startsWith("select revision")) return { rowCount: 1, rows: [{ revision: 1 }] }; if (sql.startsWith("select lifecycle")) return { rowCount: 1, rows: [{ lifecycle: "CREATED", expires_at: "2026-08-20T13:00:00.000Z" }] }; return { rowCount: 1, rows: [] }; });
    const store = new PostgresV2ConversationStore({ connect: async () => ({ query, release: vi.fn() }) } as never);
    await store.commit({ expectedRevision: 1, next: { conversationId: "c", revision: 2, memory: { memoryFingerprint: "m", decisionFingerprint: "d", catalogAuthority: { releaseVersion: "v", catalogFingerprint: "catalog" } } as never, messageResults: {} }, events: [{ eventType: "RECOMMENDATION_TERMS_ACCEPTED", id: "a" }, { eventType: "OFFER_REVEALED", id: "r" }] as never, offerTransition: { kind: "ACCEPT_RECOMMENDATION_TERMS_AND_REVEAL", to: "REVEALED", conversationId: "c", offerId: "o", recommendationTermsVersion: "REC-2026.08-v1.1", acceptedAt: "2026-08-20T12:00:00.000Z", revealedAt: "2026-08-20T12:00:00.001Z", acceptanceSequence: 1, revealSequence: 2, idempotencyKey: "k", offerIdentityFingerprint: `sha256:${"a".repeat(64)}` } });
    expect(calls.filter((sql) => sql.startsWith("insert into cars_decision_v2_events"))).toHaveLength(2); expect(calls.findIndex((sql) => sql.startsWith("insert into cars_decision_v2_events"))).toBeLessThan(calls.findIndex((sql) => sql.startsWith("update cars_decision_v2_offers"))); expect(query).toHaveBeenCalledWith(expect.stringContaining("consented_at=$3,revealed_at=$4"), ["o", "c", "2026-08-20T12:00:00.000Z", "2026-08-20T12:00:00.001Z"]); expect(calls.at(-1)).toBe("commit");
  });
  it("rolls back the event inserts when the final offer update fails", async () => {
    const calls: string[] = []; const query = vi.fn(async (sql: string) => { calls.push(sql); if (sql.startsWith("select revision")) return { rowCount: 1, rows: [{ revision: 1 }] }; if (sql.startsWith("select lifecycle")) return { rowCount: 1, rows: [{ lifecycle: "CREATED", expires_at: "2026-08-20T13:00:00.000Z" }] }; if (sql.startsWith("update cars_decision_v2_offers")) throw new Error("offer update failed"); return { rowCount: 1, rows: [] }; });
    const store = new PostgresV2ConversationStore({ connect: async () => ({ query, release: vi.fn() }) } as never);
    await expect(store.commit({ expectedRevision: 1, next: { conversationId: "c", revision: 2, memory: { memoryFingerprint: "m", decisionFingerprint: "d", catalogAuthority: { releaseVersion: "v", catalogFingerprint: "catalog" } } as never, messageResults: {} }, events: [{ eventType: "RECOMMENDATION_TERMS_ACCEPTED", id: "a" }, { eventType: "OFFER_REVEALED", id: "r" }] as never, offerTransition: { kind: "ACCEPT_RECOMMENDATION_TERMS_AND_REVEAL", to: "REVEALED", conversationId: "c", offerId: "o", recommendationTermsVersion: "REC-2026.08-v1.1", acceptedAt: "2026-08-20T12:00:00.000Z", revealedAt: "2026-08-20T12:00:00.001Z", acceptanceSequence: 1, revealSequence: 2, idempotencyKey: "k", offerIdentityFingerprint: `sha256:${"a".repeat(64)}` } })).rejects.toThrow("offer update failed");
    expect(calls.filter((sql) => sql.startsWith("insert into cars_decision_v2_events"))).toHaveLength(2); expect(calls.at(-1)).toBe("rollback"); expect(calls).not.toContain("commit");
  });
});
