import { Pool } from "pg";

import type { SqlQueryable } from "@/features/vehicle-data/repository";

declare global {
  var expiyaPostgresPool: Pool | undefined;
}

export interface PostgresEnvironment {
  readonly DATABASE_URL?: string;
  readonly DATABASE_POOL_MAX?: string;
}

export function requirePostgresConnectionString(environment: PostgresEnvironment): string {
  const value = environment.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL_REQUIRED");
  const parsed = new URL(value);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL_INVALID_PROTOCOL");
  }
  return value;
}

function poolSize(value: string | undefined): number {
  const parsed = Number(value ?? "5");
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20 ? parsed : 5;
}

export function getPostgresDatabase(
  environment: PostgresEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
  },
): SqlQueryable {
  const connectionString = requirePostgresConnectionString(environment);
  if (!globalThis.expiyaPostgresPool) {
    globalThis.expiyaPostgresPool = new Pool({
      connectionString,
      max: poolSize(environment.DATABASE_POOL_MAX),
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      application_name: "expiya-platform",
    });
  }
  return globalThis.expiyaPostgresPool;
}
