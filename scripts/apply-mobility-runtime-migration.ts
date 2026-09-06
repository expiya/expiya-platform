import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { requirePostgresConnectionString } from "../lib/server/postgres";

const migrationPath = "database/migrations/0017_mobility_runtime_foundation.sql";
const expectedDigest = "2bdc1c33abde36ce56c8b1e2f3b461134f6a353f32241a180343596031846506";
const expectedTables = ["mobility_conversations", "mobility_messages"] as const;

async function main() {
  const connectionString = requirePostgresConnectionString({ DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX });
  const sql = await readFile(migrationPath, "utf8");
  if (createHash("sha256").update(sql).digest("hex") !== expectedDigest) throw new Error("MOBILITY_MIGRATION_DIGEST_MISMATCH");
  if (/\b(drop|truncate|delete\s+from|alter\s+table)\b/iu.test(sql)) throw new Error("MOBILITY_MIGRATION_NOT_ADDITIVE");
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    const identity = await client.query("select current_database() as database, current_user as role, current_schema() as schema");
    const before = await client.query("select table_name from information_schema.tables where table_schema='public' and table_name=any($1::text[]) order by table_name", [expectedTables]);
    const beforeCounts: Record<string, number> = {};
    for (const table of before.rows.map(row => row.table_name as string)) {
      const result = await client.query(`select count(*)::int as count from public.${table}`);
      beforeCounts[table] = result.rows[0].count;
    }
    console.log(JSON.stringify({ phase: "READ_ONLY_VALIDATION", identity: identity.rows[0], existingTables: before.rows.map(row => row.table_name), existingRowCounts: beforeCounts }));
    if (process.argv.includes("--validate-only")) return;
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('expiya:mobility:migration:0017'))");
    await client.query(sql);
    await client.query("commit");
    const after = await client.query("select table_name from information_schema.tables where table_schema='public' and table_name=any($1::text[]) order by table_name", [expectedTables]);
    if (after.rowCount !== expectedTables.length) throw new Error("MOBILITY_MIGRATION_TABLES_MISSING");
    console.log(JSON.stringify({ phase: "APPLIED", migration: "0017_mobility_runtime_foundation.sql", tables: after.rows.map(row => row.table_name), preservedRowCounts: beforeCounts }));
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => { const reason = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/giu, "[REDACTED]") : "UNKNOWN"; console.error(`MOBILITY_MIGRATION_FAILED:${reason}`); process.exitCode = 1; });
