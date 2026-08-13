import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";

describe("assessCatalogReadiness", () => {
  const duringCampaign = new Date("2026-08-13T12:00:00.000Z");

  it("allows a fully sourced vehicle during its active price window", () => {
    expect(assessCatalogReadiness(pilotVehicleRecords[1], duringCampaign)).toMatchObject({ ready: true, issues: [] });
  });

  it("allows the sourced TUCSON variant", () => {
    expect(assessCatalogReadiness(pilotVehicleRecords[0], duringCampaign)).toMatchObject({
      ready: true, issues: [],
    });
  });

  it("expires records when their price observation is no longer active", () => {
    expect(assessCatalogReadiness(pilotVehicleRecords[1], new Date("2026-09-01T00:00:00.000Z"))).toMatchObject({
      ready: false, issues: ["ACTIVE_NEW_PRICE_MISSING"],
    });
  });

  it("allows IONIQ 9 after its trim-level safety evidence is present", () => {
    expect(assessCatalogReadiness(pilotVehicleRecords[2], duringCampaign)).toMatchObject({
      ready: true, issues: [],
    });
  });

  it("rejects a record whose identity and technical variant disagree", () => {
    const original = pilotVehicleRecords[4];
    const inconsistent = {
      ...original,
      technicalVariant: original.technicalVariant && {
        ...original.technicalVariant,
        model: { ...original.technicalVariant.model, value: "Not Yaris" },
      },
    };

    expect(assessCatalogReadiness(inconsistent, duringCampaign)).toMatchObject({
      ready: false, issues: ["RECORD_INCONSISTENT"],
    });
  });
});
