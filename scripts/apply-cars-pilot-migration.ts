import { readFile } from "node:fs/promises";
import path from "node:path";

import { getPostgresPool } from "../lib/server/postgres";

async function main() {
  const migrationPath = path.join(process.cwd(), "database/migrations/0008_cars_pilot_conversation_archive.sql");
  const migrationSql = await readFile(migrationPath, "utf8");
  const pool = getPostgresPool({ DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX });
  const client = await pool.connect();
  try {
  await client.query("begin");
  await client.query(migrationSql);
  const verification = await client.query(`
    select
      to_regclass('public.cars_pilot_conversation_archives') is not null as archive_table,
      to_regclass('public.cars_pilot_conversation_archives_user_idx') is not null as user_index,
      not exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='cars_pilot_conversation_archives' and column_name='payment_status'
      ) as payment_field_absent
  `);
  const result = verification.rows[0];
  if (!result?.archive_table || !result.user_index || !result.payment_field_absent) throw new Error("CARS_PILOT_MIGRATION_VERIFICATION_FAILED");
  await client.query("commit");
  process.stdout.write(`${JSON.stringify({ status: "APPLIED", migration: "0008_cars_pilot_conversation_archive.sql", archiveTable: true, userIndex: true, paymentFieldAbsent: true })}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
