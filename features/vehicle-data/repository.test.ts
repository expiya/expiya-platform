import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { PostgresVehicleDataRepository } from "@/features/vehicle-data/repository";

describe("PostgresVehicleDataRepository", () => {
  it("persists identity, provenance and new price atomically", async () => {
    const calls: { sql: string; values?: readonly unknown[] }[] = [];
    const database = { query: async (sql: string, values?: readonly unknown[]) => {
      calls.push({ sql, values });
      return sql.includes("returning id") ? { rows: [{ id: "document-id" }] } : {};
    } };
    await new PostgresVehicleDataRepository(database).upsertPilotRecord(pilotVehicleRecords[0]);
    expect(calls.map(({ sql }) => sql.trim().split(/\s+/)[0])).toEqual(["begin", "insert", "insert", "insert", "insert", "insert", "commit"]);
    expect(calls[5].values).toContain("NEW");
  });

  it("rolls back if a source document cannot be persisted", async () => {
    const calls: string[] = [];
    const database = { query: async (sql: string) => { calls.push(sql); return {}; } };
    await expect(new PostgresVehicleDataRepository(database).upsertPilotRecord(pilotVehicleRecords[0]))
      .rejects.toThrow("SOURCE_DOCUMENT_INSERT_FAILED");
    expect(calls.at(-1)).toBe("rollback");
  });
});
