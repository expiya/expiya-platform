import { describe, expect, it } from "vitest";

import type { PriceObservation, ProvenanceRecord } from "@/types/productionVehicle";

import {
  evaluateNewVehiclePrice,
  filterEligibleCandidatesByHardBudget,
  formatGapPercentConsumer,
  formatTryConsumer,
} from "./carsNewPriceAuthority";

const IONIQ = "RVC-PILOT-0001";
const VARIANT = "a3728e65-51b2-447f-a6c3-a1f64db8a310";
const AT = new Date("2026-08-15T12:00:00.000Z");

const provenance = (limitations: readonly string[] = []): [ProvenanceRecord, ...ProvenanceRecord[]] => [{
  sourceId: "hyundai-tr",
  sourceUrl: "https://www.hyundai.com/tr/tr/satis/fiyat-listesi.html",
  accessedAt: "2026-08-14T00:00:00.000Z",
  extractionMethod: "MANUAL",
  confidence: "HIGH",
  limitations: [...limitations],
}];

function observation(input: Partial<PriceObservation> & Pick<PriceObservation, "amountTry" | "priceType">): PriceObservation {
  return {
    id: input.id ?? "price-1",
    vehicleVariantId: VARIANT,
    market: "TR",
    condition: "NEW",
    validFrom: "2026-08-01T00:00:00.000Z",
    provenance: provenance(),
    confidence: "HIGH",
    ...input,
  };
}

describe("governed new-price authority", () => {
  it("fails IONIQ 9 current campaign 5.81M against a 2M hard ceiling", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 2_000_000,
      at: AT,
    });
    expect(result.result).toBe("FAIL");
    expect(result.reasonCode).toBe("AMOUNT_ABOVE_CEILING");
    expect(result.amountTry).toBe(5_810_000);
    expect(result.priceType).toBe("CAMPAIGN");
    expect(result.validityStatus).toBe("CURRENT");
  });

  it("returns PASS for a current generally applicable list price at or below the ceiling", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 2_000_000,
      at: AT,
      observations: [observation({ amountTry: 1_800_000, priceType: "LIST" })],
    });
    expect(result.result).toBe("PASS");
    expect(result.reasonCode).toBe("AMOUNT_WITHIN_CEILING");
    expect(result.campaignApplicabilityResult).toBe("NOT_CAMPAIGN");
  });

  it("uses an internal estimate for hard-budget filtering without granting price authority", () => {
    const result = evaluateNewVehiclePrice({ runtimeVehicleCandidateId: IONIQ, vehicleVariantId: VARIANT,
      budgetTry: 2_000_000, at: AT, observations: [observation({ amountTry: 1_900_000, priceType: "ESTIMATE", confidence: "LOW", consumerVisibility: "INTERNAL_ONLY" })] });
    expect(result).toMatchObject({ result: "PASS", reasonCode: "ESTIMATED_AMOUNT_WITHIN_CEILING", priceType: "ESTIMATE", sourceAuthorityResult: "INSUFFICIENT" });
  });

  it("prefers a public list price when list and estimate observations coexist", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 2_000_000,
      at: AT,
      observations: [
        observation({ id: "estimate", amountTry: 2_700_000, priceType: "ESTIMATE", confidence: "LOW", consumerVisibility: "INTERNAL_ONLY" }),
        observation({ id: "list", amountTry: 1_800_000, priceType: "LIST" }),
      ],
    });
    expect(result).toMatchObject({ priceObservationId: "list", priceType: "LIST", amountTry: 1_800_000 });
  });

  it("returns FAIL when the current applicable price is above budget", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 2_000_000,
      at: AT,
      observations: [observation({ amountTry: 2_100_000, priceType: "LIST" })],
    });
    expect(result.result).toBe("FAIL");
    expect(result.reasonCode).toBe("AMOUNT_ABOVE_CEILING");
  });

  it("returns UNKNOWN for a missing price", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 2_000_000,
      at: AT,
      observations: [],
    });
    expect(result.result).toBe("UNKNOWN");
    expect(result.reasonCode).toBe("PRICE_ABSENT");
  });

  it("uses an expired list price while preserving its expired status", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 2_000_000,
      at: AT,
      observations: [observation({
        amountTry: 1_800_000,
        priceType: "LIST",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2026-07-31T23:59:59.999Z",
      })],
    });
    expect(result.result).toBe("PASS");
    expect(result.reasonCode).toBe("AMOUNT_WITHIN_CEILING");
    expect(result.validityStatus).toBe("EXPIRED");
  });

  it("still rejects an over-budget vehicle when its price end date has passed", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 2_000_000,
      at: AT,
      observations: [observation({
        amountTry: 2_100_000,
        priceType: "LIST",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2026-07-31T23:59:59.999Z",
      })],
    });
    expect(result.result).toBe("FAIL");
    expect(result.reasonCode).toBe("AMOUNT_ABOVE_CEILING");
    expect(result.validityStatus).toBe("EXPIRED");
  });

  it("does not treat campaign eligibility uncertainty as an unconditional PASS", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 7_000_000,
      at: AT,
      observations: [observation({
        amountTry: 5_810_000,
        priceType: "CAMPAIGN",
        provenance: provenance(["Campaigns are stock-limited and participating-dealer dependent"]),
      })],
    });
    expect(result.result).toBe("UNKNOWN");
    expect(result.reasonCode).toBe("CAMPAIGN_ELIGIBILITY_UNKNOWN");
  });

  it("fails a campaign price that is still above budget", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 2_000_000,
      at: AT,
      observations: [observation({
        amountTry: 5_810_000,
        priceType: "CAMPAIGN",
        provenance: provenance(["Campaigns are stock-limited and participating-dealer dependent"]),
      })],
    });
    expect(result.result).toBe("FAIL");
    expect(result.reasonCode).toBe("AMOUNT_ABOVE_CEILING");
  });

  it("uses an expired campaign for filtering while preserving campaign uncertainty", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      budgetTry: 7_000_000,
      at: AT,
      observations: [observation({
        amountTry: 5_000_000,
        priceType: "CAMPAIGN",
        validFrom: "2026-06-01T00:00:00.000Z",
        validUntil: "2026-06-30T23:59:59.999Z",
        provenance: provenance(["Campaigns are stock-limited"]),
      })],
    });
    expect(result.validityStatus).toBe("EXPIRED");
    expect(result.result).toBe("UNKNOWN");
    expect(result.reasonCode).toBe("CAMPAIGN_ELIGIBILITY_UNKNOWN");
  });

  it("computes the exact gap and percentage without a fixed 20%", () => {
    const filter = filterEligibleCandidatesByHardBudget({
      eligibleCandidateIds: [IONIQ],
      candidateVariantIds: { [IONIQ]: VARIANT },
      budgetTry: 2_000_000,
      at: AT,
    });
    expect(filter.passingCandidateIds).toEqual([]);
    expect(filter.noAffordableMatchStatus).toBe("NEAREST_OVER_BUDGET_AVAILABLE");
    expect(filter.nearestGapTry).toBe(3_810_000);
    expect(filter.nearestGapPercent).toBeCloseTo(190.5, 5);
    expect(formatGapPercentConsumer(filter.nearestGapPercent ?? 0)).toBe("%190,5");
    expect(formatTryConsumer(5_810_000)).toContain("5,81");
    expect(formatGapPercentConsumer(filter.nearestGapPercent ?? 0)).not.toMatch(/20/);
  });

  it("returns NOT_REQUESTED when no budget is supplied", () => {
    const result = evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: IONIQ,
      vehicleVariantId: VARIANT,
      at: AT,
    });
    expect(result.result).toBe("NOT_REQUESTED");
    expect(result.reasonCode).toBe("NO_BUDGET");
  });
});
