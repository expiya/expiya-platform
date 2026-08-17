import { describe, expect, it, vi } from "vitest";

import { initializeCarsDecisionV2DurableStore } from "./durableStoreInitialization.server";

const URL = "postgresql://user:password@development.invalid:5432/cars_v2";

function pool(responses: readonly (unknown | Error)[]) {
  const query = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) query.mockRejectedValueOnce(response);
    else query.mockResolvedValueOnce(response);
  }
  return { query } as never;
}

describe("V2 durable store initialization", () => {
  it("classifies missing and invalid database URLs", async () => {
    await expect(initializeCarsDecisionV2DurableStore({ environment: {} })).resolves.toEqual({ status: "UNAVAILABLE", failure: "DATABASE_URL_MISSING" });
    await expect(initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: "https://invalid" } })).resolves.toEqual({ status: "UNAVAILABLE", failure: "DATABASE_URL_INVALID" });
  });

  it("fails closed when the expected database identity differs", async () => {
    await expect(initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: URL }, expectedDatabaseUrl: "postgresql://user:password@other.invalid:5432/cars_v2" })).resolves.toEqual({ status: "UNAVAILABLE", failure: "DATABASE_IDENTITY_MISMATCH" });
  });

  it("separates pool, connection, migration query and missing-table failures", async () => {
    await expect(initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: URL }, createPool: () => { throw new Error("pool"); } })).resolves.toEqual({ status: "UNAVAILABLE", failure: "POOL_CREATION_FAILED" });
    await expect(initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: URL }, createPool: () => pool([new Error("connect")]) })).resolves.toEqual({ status: "UNAVAILABLE", failure: "DATABASE_CONNECTION_FAILED" });
    await expect(initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: URL }, createPool: () => pool([{ rows: [{}] }, new Error("query")]) })).resolves.toEqual({ status: "UNAVAILABLE", failure: "MIGRATION_QUERY_FAILED" });
    await expect(initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: URL }, createPool: () => pool([{ rows: [{}] }, { rows: [{ conversations: true, events: true, messages: false, offers: true }] }]) })).resolves.toEqual({ status: "UNAVAILABLE", failure: "MIGRATION_TABLES_MISSING" });
  });

  it("returns the initialized pool only after connection and migration probes pass", async () => {
    const readyPool = pool([{ rows: [{}] }, { rows: [{ conversations: true, events: true, messages: true, offers: true }] }]);
    const result = await initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: URL }, expectedDatabaseUrl: URL, createPool: () => readyPool });
    expect(result).toEqual({ status: "READY", pool: readyPool });
  });
});
