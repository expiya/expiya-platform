import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PostgresManualCatalogCandidateRepository } from "../features/vehicle-data/manualCatalogCandidateRepository";
import { manualIndexAttestation, parseManualCatalogCandidatesCsv } from "../features/vehicle-data/manualCatalogCandidates";
import { closePostgresDatabase, getPostgresDatabase } from "../lib/server/postgres";

const apply = process.argv.includes("--apply");
const fileArgument = process.argv.find((argument) => argument.startsWith("--file="))?.slice(7);
const suppliedBy = process.argv.find((argument) => argument.startsWith("--supplied-by="))?.slice(14);
if (!fileArgument) throw new Error("MANUAL_INDEX_FILE_REQUIRED");
if (apply && !suppliedBy) throw new Error("SUPPLIED_BY_REQUIRED");

async function run(): Promise<void> {
  const bytes = await readFile(fileArgument!);
  const report = parseManualCatalogCandidatesCsv(bytes.toString("utf8"));
  const summary = { dryRun: !apply, acceptedCount: report.accepted.length, rejected: report.rejected };
  if (!apply || report.rejected.length > 0 || report.accepted.length === 0) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (apply && report.rejected.length > 0) throw new Error("MANUAL_INDEX_QUALITY_GATE_FAILED");
    return;
  }
  const platforms = new Set(report.accepted.map(({ sourcePlatform }) => sourcePlatform));
  const capturedDates = new Set(report.accepted.map(({ capturedAt }) => capturedAt));
  if (platforms.size !== 1 || capturedDates.size !== 1) throw new Error("BATCH_METADATA_MUST_BE_UNIFORM");
  const database = getPostgresDatabase();
  try {
    const migration = await database.query(
      "select name from vehicle_data_schema_migrations where name = $1", ["0004_catalog_candidates.sql"],
    ) as { rows?: { name: string }[] };
    if (migration.rows?.length !== 1) throw new Error("CATALOG_CANDIDATE_MIGRATION_REQUIRED");
    await new PostgresManualCatalogCandidateRepository(database).importBatch({
      id: randomUUID(), sourcePlatform: report.accepted[0].sourcePlatform, suppliedBy: suppliedBy!,
      capturedAt: report.accepted[0].capturedAt, originalFilename: path.basename(fileArgument!),
      contentSha256: createHash("sha256").update(bytes).digest("hex"), usageAttestation: manualIndexAttestation,
      sourceCategoryUrl: report.accepted.find(({ sourceCategoryUrl }) => sourceCategoryUrl)?.sourceCategoryUrl,
    }, report.accepted);
    process.stdout.write(`${JSON.stringify({ ...summary, dryRun: false }, null, 2)}\n`);
  } finally {
    await closePostgresDatabase();
  }
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "UNKNOWN_IMPORT_ERROR"}\n`);
  process.exitCode = 1;
});
