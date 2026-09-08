import { createHash } from "node:crypto";
import { Pool } from "pg";

async function main(): Promise<void> {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    console.log(JSON.stringify({ status: "BLOCKED_NOT_QUERIED", reason: "DATABASE_URL_MISSING", databaseRead: false, databaseWrite: false }));
    process.exitCode = 2;
    return;
  }

  const parsed = new URL(raw);
  const identityFingerprint = `sha256:${createHash("sha256").update(`${parsed.protocol}//${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`).digest("hex")}`;
  const pool = new Pool({ connectionString: raw, max: 1, application_name: "electronics-stage2-read-only-preflight" });
  const client = await pool.connect();
  try {
  await client.query("begin read only");
  await client.query("set transaction read only");
  const tables = await client.query(`
    select name, to_regclass('public.' || name) is not null as present
    from unnest($1::text[]) as name
    order by name
  `, [[
    "comparison_entitlement_events",
    "comparison_entitlements",
    "electronics_conversations",
    "electronics_stage2_consent_events",
    "electronics_stage2_handoff_events",
    "electronics_stage2_handoff_issuances",
  ]]);
  const counts = await client.query(`
    select
      (select count(*)::bigint from electronics_conversations) as electronics_conversations,
      (select count(*)::bigint from comparison_entitlements) as comparison_entitlements,
      (select count(*)::bigint from comparison_entitlement_events) as comparison_entitlement_events
  `);
  const constraint = await client.query(`
    select pg_get_constraintdef(oid) as definition
    from pg_constraint
    where conrelid = 'comparison_entitlements'::regclass
      and conname = 'comparison_entitlements_department_id_check'
  `);
  await client.query("rollback");
  console.log(JSON.stringify({
    status: "PASS_READ_ONLY",
    databaseIdentityFingerprint: identityFingerprint,
    transactionReadOnly: true,
    tables: tables.rows,
    rowCounts: counts.rows[0],
    comparisonDepartmentConstraint: constraint.rows[0]?.definition ?? "MISSING",
    databaseRead: true,
    databaseWrite: false,
  }));
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    console.log(JSON.stringify({ status: "BLOCKED_NOT_QUERIED", reason: error instanceof Error ? error.name : "UNKNOWN_ERROR", databaseIdentityFingerprint: identityFingerprint, databaseRead: false, databaseWrite: false }));
    process.exitCode = 2;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
