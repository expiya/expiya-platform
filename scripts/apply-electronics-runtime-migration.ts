import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { getPostgresPool } from "../lib/server/postgres";

const migration = "database/migrations/0015_electronics_runtime_foundation.sql";
const expectedDigest = "c508311e0d268432f16285802079d2f458ded9a32ab75a185733ac80f34d436f";

loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

async function inspect(client: { query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }> }) {
  const result = await client.query(`
    select
      to_regclass('public.electronics_conversations') is not null as conversations,
      to_regclass('public.electronics_conversation_messages') is not null as messages,
      to_regclass('public.electronics_conversation_events') is not null as events,
      to_regclass('public.electronics_conversation_events_replay_idx') is not null as replay_index,
      to_regclass('public.electronics_conversations_category_revision_idx') is not null as category_revision_index
  `);
  return result.rows[0];
}

async function main() {
  const sql = await readFile(migration, "utf8");
  const digest = createHash("sha256").update(sql).digest("hex");
  if (digest !== expectedDigest) throw new Error("MIGRATION_DIGEST_MISMATCH");
  if (/\b(drop|truncate|alter|insert|update|delete\s+from)\b/iu.test(sql)) throw new Error("UNEXPECTED_MIGRATION_OPERATION");

  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const identity = await client.query("select current_database() as db, current_user as role");
    const configured = new URL(process.env.DATABASE_URL!);
    const databaseAndRoleMatch = identity.rows[0].db === decodeURIComponent(configured.pathname.slice(1))
      && identity.rows[0].role === decodeURIComponent(configured.username);
    if (!databaseAndRoleMatch) throw new Error("DATABASE_IDENTITY_MISMATCH");
    const before = await inspect(client);
    console.log(JSON.stringify({ status: "PREFLIGHT", migration, sha256: `sha256:${digest}`, databaseAndRoleMatch, before }));
    if (!process.argv.includes("--apply")) return;

    await client.query("set lock_timeout = '5s'");
    await client.query("set statement_timeout = '30s'");
    await client.query(sql);
    const after = await inspect(client);
    if (!Object.values(after).every(Boolean)) throw new Error("MIGRATION_VERIFICATION_FAILED");
    const categoryConstraint = await client.query(`
      select pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conrelid = 'electronics_conversations'::regclass
        and conname = 'electronics_conversations_category_id_check'
    `);
    const definition = String(categoryConstraint.rows[0]?.definition ?? "");
    const categoryCount = (definition.match(/'[A-Z0-9_]+'/g) ?? []).length;
    if (categoryCount !== 24) throw new Error("CATEGORY_CONSTRAINT_VERIFICATION_FAILED");
    console.log(JSON.stringify({ status: Object.values(before).every(Boolean) ? "ALREADY_PRESENT" : "APPLIED", after, categoryConstraintCount: categoryCount }));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => {
  console.error("ELECTRONICS_MIGRATION_FAILED_NO_SECRET_DETAILS");
  process.exitCode = 1;
});
