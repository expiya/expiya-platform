import { pilotVehicleRecords } from "../data/production/pilotVehicles";
import { importPilotCatalog } from "../features/vehicle-data/importPilotCatalog";
import { PostgresVehicleDataRepository } from "../features/vehicle-data/repository";
import { closePostgresDatabase, getPostgresDatabase } from "../lib/server/postgres";

const apply = process.argv.includes("--apply");
const atArgument = process.argv.find((argument) => argument.startsWith("--at="))?.slice(5);
const at = atArgument ? new Date(atArgument) : new Date();
if (!Number.isFinite(at.getTime())) throw new Error("INVALID_IMPORT_DATE");

async function run(): Promise<void> {
  if (!apply) {
    const report = await importPilotCatalog(
      pilotVehicleRecords,
      { upsertPilotRecord: async () => undefined },
      at,
      { dryRun: true },
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const database = getPostgresDatabase();
  try {
    const migrations = await database.query(
      "select name from vehicle_data_schema_migrations where name = $1",
      ["0003_idempotent_facts_and_price_provenance.sql"],
    ) as { rows?: { name: string }[] };
    if (migrations.rows?.length !== 1) throw new Error("VEHICLE_DATA_MIGRATIONS_REQUIRED");

    const dryRun = await importPilotCatalog(
      pilotVehicleRecords,
      { upsertPilotRecord: async () => undefined },
      at,
      { dryRun: true },
    );
    if (dryRun.rejected.length > 0) throw new Error("PILOT_IMPORT_QUALITY_GATE_FAILED");

    const report = await importPilotCatalog(
      pilotVehicleRecords,
      new PostgresVehicleDataRepository(database),
      at,
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await closePostgresDatabase();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "UNKNOWN_IMPORT_ERROR";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
