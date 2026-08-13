import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { PostgresVehicleDataRepository } from "@/features/vehicle-data/repository";

describe("PostgresVehicleDataRepository", () => {
  it("persists identity, technical facts, all provenance and new prices atomically", async () => {
    const calls: { sql: string; values?: readonly unknown[] }[] = [];
    const database = { query: async (sql: string, values?: readonly unknown[]) => {
      calls.push({ sql, values });
      return sql.includes("returning id") ? { rows: [{ id: "document-id" }] } : {};
    } };
    await new PostgresVehicleDataRepository(database).upsertPilotRecord(pilotVehicleRecords[3]);
    expect(calls[0].sql).toBe("begin");
    expect(calls.at(-1)?.sql).toBe("commit");
    expect(calls.some(({ sql }) => sql.includes("insert into vehicle_facts"))).toBe(true);
    expect(calls.some(({ sql }) => sql.includes("insert into fact_provenance"))).toBe(true);
    expect(calls.some(({ sql }) => sql.includes("insert into price_provenance"))).toBe(true);
    expect(calls.filter(({ sql }) => sql.includes("insert into source_documents"))).toHaveLength(3);
    expect(calls.find(({ sql }) => sql.includes("insert into price_observations"))?.values).toContain("NEW");
  });

  it("rolls back if a source document cannot be persisted", async () => {
    const calls: string[] = [];
    const database = { query: async (sql: string) => { calls.push(sql); return {}; } };
    await expect(new PostgresVehicleDataRepository(database).upsertPilotRecord(pilotVehicleRecords[0]))
      .rejects.toThrow("SOURCE_DOCUMENT_INSERT_FAILED");
    expect(calls.at(-1)).toBe("rollback");
  });
});
