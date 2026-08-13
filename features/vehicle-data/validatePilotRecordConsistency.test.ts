import { describe, expect, it } from "vitest";

import { pilotVehicleRecords, type PilotVehicleRecord } from "@/data/production/pilotVehicles";
import { validatePilotRecordConsistency } from "@/features/vehicle-data/validatePilotRecordConsistency";

describe("validatePilotRecordConsistency", () => {
  it("accepts every sourced pilot record", () => {
    for (const record of pilotVehicleRecords) expect(validatePilotRecordConsistency(record)).toEqual([]);
  });

  it("reports identity, technical variant, and price linkage conflicts", () => {
    const original = pilotVehicleRecords[4];
    const inconsistent: PilotVehicleRecord = {
      ...original,
      technicalVariant: original.technicalVariant && {
        ...original.technicalVariant,
        trim: { ...original.technicalVariant.trim, value: "Different trim" },
      },
      prices: original.prices.map((price) => ({ ...price, vehicleVariantId: pilotVehicleRecords[3].identity.id })),
    };

    expect(validatePilotRecordConsistency(inconsistent)).toEqual(["TRIM_MISMATCH", "PRICE_VARIANT_ID_MISMATCH"]);
  });
});
