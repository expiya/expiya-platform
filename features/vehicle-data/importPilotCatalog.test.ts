import { describe, expect, it, vi } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { importPilotCatalog } from "@/features/vehicle-data/importPilotCatalog";

describe("importPilotCatalog", () => {
  const at = new Date("2026-08-14T00:00:00.000Z");

  it("validates all records without writes in dry-run mode", async () => {
    const repository = { upsertPilotRecord: vi.fn() };
    const report = await importPilotCatalog(pilotVehicleRecords, repository, at, { dryRun: true });
    expect(report).toMatchObject({ dryRun: true, importedCount: 0, rejected: [] });
    expect(report.acceptedVehicleVariantIds).toHaveLength(7);
    expect(repository.upsertPilotRecord).not.toHaveBeenCalled();
  });

  it("imports only records that pass readiness and price quality gates", async () => {
    const repository = { upsertPilotRecord: vi.fn().mockResolvedValue(undefined) };
    const expired = { ...pilotVehicleRecords[0], prices: [] };
    const report = await importPilotCatalog([expired, pilotVehicleRecords[3]], repository, at);
    expect(report.importedCount).toBe(1);
    expect(report.rejected[0]).toMatchObject({ issues: ["ACTIVE_NEW_PRICE_MISSING"] });
    expect(repository.upsertPilotRecord).toHaveBeenCalledWith(pilotVehicleRecords[3]);
  });

  it("retains valid historical observations after their publication window closes", async () => {
    const repository = { upsertPilotRecord: vi.fn().mockResolvedValue(undefined) };
    const report = await importPilotCatalog(
      [pilotVehicleRecords[0]], repository, new Date("2026-09-01T00:00:00.000Z"),
    );
    expect(report).toMatchObject({ importedCount: 1, rejected: [] });
  });
});
