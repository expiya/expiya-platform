import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { closePostgresDatabase, getPostgresPool } from "../lib/server/postgres";

const migrationsDirectory = path.resolve(process.cwd(), "database/migrations");
const migrationNamePattern = /^\d{4}_[a-z0-9_]+\.sql$/;
const lockId = 739_251_417;

async function run(): Promise<void> {
  const files = (await readdir(migrationsDirectory)).filter((name) => migrationNamePattern.test(name)).sort();
  if (files.length === 0) throw new Error("NO_VEHICLE_DATA_MIGRATIONS_FOUND");
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [lockId]);
    await client.query(`create table if not exists vehicle_data_schema_migrations (
      name text primary key,
      sha256 text not null,
      applied_at timestamptz not null default now()
    )`);
    const applied = await client.query<{ name: string; sha256: string }>(
      "select name, sha256 from vehicle_data_schema_migrations order by name",
    );
    const appliedByName = new Map(applied.rows.map((row) => [row.name, row.sha256]));

    for (const name of files) {
      const sql = await readFile(path.join(migrationsDirectory, name), "utf8");
      const sha256 = createHash("sha256").update(sql).digest("hex");
      const previousHash = appliedByName.get(name);
      if (previousHash && previousHash !== sha256) throw new Error(`MIGRATION_CHECKSUM_MISMATCH:${name}`);
      if (previousHash) {
        process.stdout.write(`skip ${name}\n`);
        continue;
      }
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into vehicle_data_schema_migrations (name, sha256) values ($1,$2)",
          [name, sha256],
        );
        await client.query("commit");
        process.stdout.write(`applied ${name}\n`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [lockId]).catch(() => undefined);
    client.release();
    await closePostgresDatabase();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "UNKNOWN_MIGRATION_ERROR";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
