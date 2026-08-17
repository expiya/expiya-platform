import type { Pool } from "pg";

import { getPostgresPool, requirePostgresConnectionString, type PostgresEnvironment } from "@/lib/server/postgres";

export type DurableStoreInitializationFailure =
  | "DATABASE_URL_MISSING"
  | "DATABASE_URL_INVALID"
  | "POOL_CREATION_FAILED"
  | "DATABASE_CONNECTION_FAILED"
  | "MIGRATION_QUERY_FAILED"
  | "MIGRATION_TABLES_MISSING"
  | "DATABASE_IDENTITY_MISMATCH"
  | "UNKNOWN_DATABASE_INITIALIZATION_FAILURE";

export type DurableStoreInitializationResult =
  | { readonly status: "READY"; readonly pool: Pool }
  | { readonly status: "UNAVAILABLE"; readonly failure: DurableStoreInitializationFailure };

type PoolFactory = (environment: PostgresEnvironment) => Pool;

function databaseIdentity(value: string): string {
  const parsed = new URL(value);
  return `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}/${parsed.pathname.replace(/^\//u, "")}`;
}

function isConnectionFailure(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return ["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH", "28P01", "28000", "3D000"].includes(code);
}

export async function initializeCarsDecisionV2DurableStore(input: {
  readonly environment: PostgresEnvironment;
  readonly expectedDatabaseUrl?: string;
  readonly createPool?: PoolFactory;
}): Promise<DurableStoreInitializationResult> {
  const rawUrl = input.environment.DATABASE_URL?.trim();
  if (!rawUrl) return { status: "UNAVAILABLE", failure: "DATABASE_URL_MISSING" };

  let connectionString: string;
  try {
    connectionString = requirePostgresConnectionString(input.environment);
    if (input.expectedDatabaseUrl && databaseIdentity(connectionString) !== databaseIdentity(input.expectedDatabaseUrl)) {
      return { status: "UNAVAILABLE", failure: "DATABASE_IDENTITY_MISMATCH" };
    }
  } catch {
    return { status: "UNAVAILABLE", failure: "DATABASE_URL_INVALID" };
  }

  let pool: Pool;
  try {
    pool = (input.createPool ?? getPostgresPool)({ ...input.environment, DATABASE_URL: connectionString });
  } catch {
    return { status: "UNAVAILABLE", failure: "POOL_CREATION_FAILED" };
  }

  try {
    await pool.query("select 1 as cars_decision_v2_connection_ready");
  } catch {
    return { status: "UNAVAILABLE", failure: "DATABASE_CONNECTION_FAILED" };
  }

  try {
    const result = await pool.query("select to_regclass('public.cars_decision_v2_conversations') is not null as conversations, to_regclass('public.cars_decision_v2_events') is not null as events, to_regclass('public.cars_decision_v2_messages') is not null as messages, to_regclass('public.cars_decision_v2_offers') is not null as offers");
    const row = result.rows[0] as Record<string, boolean> | undefined;
    if (!row?.conversations || !row.events || !row.messages || !row.offers) {
      return { status: "UNAVAILABLE", failure: "MIGRATION_TABLES_MISSING" };
    }
    return { status: "READY", pool };
  } catch (error) {
    return { status: "UNAVAILABLE", failure: isConnectionFailure(error) ? "DATABASE_CONNECTION_FAILED" : "MIGRATION_QUERY_FAILED" };
  }
}
