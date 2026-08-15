import { describe, expect, it } from "vitest";
import artifact from "@/data/runtime/vehicle-evidence/v0.3.0/artifact.json";
import catalog from "@/data/production/catalog/releases/v0.2.0/catalog.json";
import mapping from "@/data/runtime/vehicle-candidate-identity-maps/v0.2.1/mapping.json";
import { journeyCoverageV1ActivatedCandidateIds, newCarJourneyCoverageV1 } from "./newCarJourneyCoverageV1";

describe("new-car journey coverage v1 audit", () => {
  it("activates only exact candidates with current prices and complete seats/cargo facts", () => {
    for (const vehicleVariantId of journeyCoverageV1ActivatedCandidateIds) {
      expect(mapping.records.find((item) => item.vehicleVariantId === vehicleVariantId)?.mappingStatus).toBe("VERIFIED_ONE_TO_ONE");
      const candidate = artifact.candidates.find((item) => item.vehicleVariantId === vehicleVariantId);
      expect(candidate?.facts.seats.status).toBe("AVAILABLE");
      expect(candidate?.facts.cargo_volume_l.status).toBe("AVAILABLE");
      const record = catalog.records.find((item) => item.variant.id === vehicleVariantId);
      expect(record?.activeNewPrice.condition).toBe("NEW");
      expect(record?.activeNewPrice.amountTry).toBeGreaterThan(0);
    }
  });

  it("does not authorize provisional Clio or incomplete exact-mapped Corsa", () => {
    expect(journeyCoverageV1ActivatedCandidateIds).not.toContain("1eb75421-a038-4679-977e-7cd4e4608863");
    expect(journeyCoverageV1ActivatedCandidateIds).not.toContain("01a559dd-917f-4f49-a4cf-84fe78e9de40");
  });

  it("publishes every required journey with authority on decidable rows", () => {
    expect(newCarJourneyCoverageV1).toHaveLength(15);
    expect(newCarJourneyCoverageV1.filter((row) => row.status === "DECIDABLE").every((row) => row.authority)).toBe(true);
    expect(new Set(newCarJourneyCoverageV1.map((row) => row.journey))).toHaveProperty("size", 15);
  });
});
