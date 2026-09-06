import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { getPostgresPool } from "../lib/server/postgres";

// Same environment precedence as next dev; same pool and transaction method as
// apply-cars-pilot-migration.ts. No migration discovery or unrelated SQL runs.
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
async function main() {
  const sql = await readFile("database/migrations/0009_appliances_runtime_foundation.sql", "utf8");
  if (/\b(drop|truncate|alter|insert|update|delete\s+from)\b/iu.test(sql)) throw new Error("UNEXPECTED_MIGRATION_OPERATION");
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const identity = await client.query("select current_database() as db, current_user as role");
    const configured = new URL(process.env.DATABASE_URL!);
    if (identity.rows[0].db !== decodeURIComponent(configured.pathname.slice(1)) || identity.rows[0].role !== decodeURIComponent(configured.username)) throw new Error("DATABASE_IDENTITY_MISMATCH");
    const inspect = async () => (await client.query("select to_regclass('public.appliances_conversations') is not null as conversations, to_regclass('public.appliances_conversation_messages') is not null as messages, to_regclass('public.appliances_conversation_events') is not null as events, to_regclass('public.appliances_conversation_events_replay_idx') is not null as replay_index")).rows[0];
    const before = await inspect();
    console.log(JSON.stringify({ status: "PREFLIGHT", applicationEnvironment: "NEXT_DEVELOPMENT_ENV", databaseAndRoleMatch: true, migration: "0009_appliances_runtime_foundation.sql", sha256: createHash("sha256").update(sql).digest("hex"), before }));
    if (!process.argv.includes("--apply")) return;
    await client.query("begin");
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query(sql);
      const after = await inspect();
      if (!Object.values(after).every(Boolean)) throw new Error("MIGRATION_VERIFICATION_FAILED");
      await client.query("commit");
      console.log(JSON.stringify({ status: Object.values(before).every(Boolean) ? "ALREADY_PRESENT" : "APPLIED", after }));
    } catch (error) { await client.query("rollback"); throw error; }
  } finally { client.release(); await pool.end(); }
}
main().catch(() => { console.error("APPLIANCES_MIGRATION_FAILED_NO_SECRET_DETAILS"); process.exitCode = 1; });
