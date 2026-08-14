import { createHash } from "node:crypto";

import { marketplaceCandidatePilotBatches } from "../data/research/marketplaceCandidatePilot";
import { PostgresManualCatalogCandidateRepository } from "../features/vehicle-data/manualCatalogCandidateRepository";
import { closePostgresDatabase, getPostgresDatabase } from "../lib/server/postgres";

const apply = process.argv.includes("--apply");

async function run(): Promise<void> {
  const summary = marketplaceCandidatePilotBatches.map((batch) => ({
    sourceId: batch.sourceId, sourceUrl: batch.sourceUrl, acceptedCount: batch.candidates.length,
  }));
  if (!apply) {
    process.stdout.write(`${JSON.stringify({ dryRun: true, totalAccepted: summary.reduce((sum, item) => sum + item.acceptedCount, 0), batches: summary }, null, 2)}\n`);
    return;
  }
  const database = getPostgresDatabase();
  try {
    const migration = await database.query(
      "select name from vehicle_data_schema_migrations where name = $1", ["0005_candidate_source_governance.sql"],
    ) as { rows?: { name: string }[] };
    if (migration.rows?.length !== 1) throw new Error("CANDIDATE_SOURCE_GOVERNANCE_MIGRATION_REQUIRED");
    const repository = new PostgresManualCatalogCandidateRepository(database);
    for (const batch of marketplaceCandidatePilotBatches) {
      const contentSha256 = createHash("sha256").update(JSON.stringify(batch.candidates)).digest("hex");
      await repository.importBatch({
        id: batch.candidates[0].id, sourcePlatform: "OTHER", suppliedBy: "Expiya research ingestion",
        capturedAt: batch.capturedAt, originalFilename: `${batch.sourceId}-public-page-${batch.capturedAt}.json`,
        contentSha256, usageAttestation: "PUBLIC_PAGE_ROBOTS_ALLOWED_TERMS_UNRESOLVED",
        sourceCategoryUrl: batch.sourceUrl, sourceUrl: batch.sourceUrl, extractionMethod: "PUBLIC_PAGE",
        permissionStatus: "RESEARCH_ONLY", robotsUrl: batch.robotsUrl,
        permissionReviewedAt: "2026-08-14T00:00:00.000Z",
        licenseNotes: "Minimal brand/model candidate facts only; excluded listing identity, price, mileage, seller, images and personal data; not publishable until source permission and canonical match review",
      }, batch.candidates);
    }
    process.stdout.write(`${JSON.stringify({ dryRun: false, totalAccepted: summary.reduce((sum, item) => sum + item.acceptedCount, 0), batches: summary }, null, 2)}\n`);
  } finally {
    await closePostgresDatabase();
  }
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "UNKNOWN_IMPORT_ERROR"}\n`);
  process.exitCode = 1;
});
