import { describe, expect, it } from "vitest";

import { PostgresVehicleCatalogReadRepository } from "@/features/vehicle-data/catalogReadRepository";

describe("PostgresVehicleCatalogReadRepository", () => {
  it("reads only publishable sourced rows and maps them to decision cars", async () => {
    const calls: { sql: string; values?: readonly unknown[] }[] = [];
    const database = { query: async (sql: string, values?: readonly unknown[]) => {
      calls.push({ sql, values });
      return { rows: [{
        id: "8af2278c-4168-4a1b-a915-6b72b9cd6f48", brand: "Toyota", model: "Corolla",
        trim: "Vision Plus", body_style: "Sedan", model_year: 2026,
        created_at: "2026-08-13T00:00:00.000Z", updated_at: "2026-08-14T00:00:00.000Z",
        amount_try: "1850000.00", facts: {
          "powertrain.fuelType": "GASOLINE", "powertrain.powerKw": 91.9,
          "powertrain.transmission": "Multidrive S automatic", "safetyFeatureCodes.0": "TSS3",
        },
      }] };
    } };
    const result = await new PostgresVehicleCatalogReadRepository(database)
      .readPublishedCatalog(new Date("2026-08-14T00:00:00.000Z"));
    expect(result).toMatchObject({ mode: "production", limitations: [], cars: [{
      brand: "Toyota", model: "Corolla Vision Plus", price: 1_850_000, fuel: "Gasoline",
    }], identities: [{
      id: "8af2278c-4168-4a1b-a915-6b72b9cd6f48", brand: "Toyota", model: "Corolla",
    }] });
    expect(calls[0].sql).toContain("eligible_documents");
    expect(calls[0].sql).toContain("price_provenance");
    expect(calls[0].sql).toContain("ineligible_documents");
    expect(calls[0].values).toEqual(["2026-08-14T00:00:00.000Z"]);
  });

  it("quarantines malformed database rows instead of returning partial evidence", async () => {
    const database = { query: async () => ({ rows: [{ id: "not-a-uuid" }] }) };
    await expect(new PostgresVehicleCatalogReadRepository(database).readPublishedCatalog(new Date()))
      .resolves.toMatchObject({ cars: [], limitations: ["database-row-0:INVALID_READ_MODEL"] });
  });
});
