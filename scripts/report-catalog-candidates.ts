import { closePostgresDatabase, getPostgresDatabase } from "../lib/server/postgres";

async function run(): Promise<void> {
  const database = getPostgresDatabase();
  try {
    const result = await database.query(
      `select b.source_url,
              b.permission_status,
              count(c.id)::int as candidate_count,
              coalesce(sum(c.occurrence_count), 0)::int as observation_count,
              count(distinct c.normalized_brand)::int as brand_count,
              count(distinct (c.normalized_brand, c.normalized_model))::int as model_count,
              count(*) filter (where c.review_status = 'MATCHED')::int as matched_count,
              count(*) filter (where c.review_status = 'PENDING')::int as pending_count
       from catalog_candidate_batches b
       join catalog_candidates c on c.batch_id = b.id
       group by b.source_url, b.permission_status
       order by b.source_url`,
    ) as { rows?: Record<string, unknown>[] };
    process.stdout.write(`${JSON.stringify({ sources: result.rows ?? [] }, null, 2)}\n`);
  } finally {
    await closePostgresDatabase();
  }
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "UNKNOWN_REPORT_ERROR"}\n`);
  process.exitCode = 1;
});
