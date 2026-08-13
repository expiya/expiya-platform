import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";

describe("assessCatalogReadiness", () => {
  const duringCampaign = new Date("2026-08-13T12:00:00.000Z");

  it("allows a fully sourced vehicle during its active price window", () => {
    expect(assessCatalogReadiness(pilotVehicleRecords[1], duringCampaign)).toMatchObject({ ready: true, issues: [] });
  });

  it("keeps incomplete variants out of the production read model", () => {
    expect(assessCatalogReadiness(pilotVehicleRecords[0], duringCampaign)).toMatchObject({
      ready: false, issues: ["TECHNICAL_VARIANT_MISSING"],
    });
  });

  it("expires records when their price observation is no longer active", () => {
    expect(assessCatalogReadiness(pilotVehicleRecords[1], new Date("2026-09-01T00:00:00.000Z"))).toMatchObject({
      ready: false, issues: ["ACTIVE_NEW_PRICE_MISSING"],
    });
  });

  it("requires safety evidence before publishing", () => {
    expect(assessCatalogReadiness(pilotVehicleRecords[2], duringCampaign)).toMatchObject({
      ready: false, issues: ["SAFETY_EVIDENCE_MISSING"],
    });
  });
});
