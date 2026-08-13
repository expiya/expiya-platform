import { afterEach, describe, expect, it } from "vitest";

import { getPostgresDatabase, requirePostgresConnectionString } from "@/lib/server/postgres";

describe("PostgreSQL server connection", () => {
  afterEach(async () => {
    await globalThis.expiyaPostgresPool?.end();
    globalThis.expiyaPostgresPool = undefined;
  });

  it("requires a private PostgreSQL connection URL", () => {
    expect(() => requirePostgresConnectionString({})).toThrow("DATABASE_URL_REQUIRED");
    expect(() => requirePostgresConnectionString({ DATABASE_URL: "https://database.example" }))
      .toThrow("DATABASE_URL_INVALID_PROTOCOL");
  });

  it("reuses a bounded server-side connection pool", () => {
    const environment = { DATABASE_URL: "postgresql://user:secret@localhost:5432/expiya", DATABASE_POOL_MAX: "3" };
    expect(getPostgresDatabase(environment)).toBe(getPostgresDatabase(environment));
    expect(globalThis.expiyaPostgresPool?.options.max).toBe(3);
  });
});
