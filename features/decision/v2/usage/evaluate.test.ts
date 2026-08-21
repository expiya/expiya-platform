import { describe, expect, it } from "vitest";

import { buildCatalogSnapshot } from "../catalog/snapshot";
import { release, sourced, variant } from "../catalog/testFixtures.testSupport";
import type { CatalogVariantSnapshot } from "../catalog/types";
import { classifyCargoCapacity, evaluateUsageCargoSuitability } from "./evaluate";
import { USAGE_CARGO_POLICIES_V1 } from "./policy";
import type { UsageCargoNeed } from "./types";

const BASE_NEED: UsageCargoNeed = { commercialScenario: "UNSPECIFIED", orientation: "UNKNOWN" };
function makeVariant(bodyStyle: string, dimensions: Readonly<Record<string, unknown>> = {}, useClass?: "PASSENGER" | "LIGHT_COMMERCIAL" | "HEAVY_COMMERCIAL"): CatalogVariantSnapshot {
  const record = variant("variant-a", "Brand Alpha", "Model 10", "Base", { bodyStyle: sourced(bodyStyle), dimensions, vehicleUseClass: useClass ? sourced(useClass) : undefined });
  const fixture = release("1.2.3", [record]);
  const result = buildCatalogSnapshot({ ...fixture, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") });
  if (result.status !== "READY") throw new Error(JSON.stringify(result));
  return result.snapshot.variants[0]!;
}
function evaluate(variantSnapshot: CatalogVariantSnapshot, need: Partial<UsageCargoNeed>) {
  return evaluateUsageCargoSuitability(variantSnapshot, { ...BASE_NEED, ...need }, USAGE_CARGO_POLICIES_V1);
}

describe("V2 usage/cargo suitability", () => {
  it("applies controlled usage membership as hard or medium according to policy", () => {
    const sedan = makeVariant("Sedan", { seats: sourced(5) }, "PASSENGER");
    expect(evaluate(sedan, { usageScenario: { scenario: "FAMILY", decisionEffect: "HARD_MEMBERSHIP" } }).overallOutcome).toBe("PASS");
    expect(evaluate(sedan, { usageScenario: { scenario: "GENERAL_CARGO", decisionEffect: "HARD_MEMBERSHIP" } })).toMatchObject({ overallOutcome: "FAIL", hardFailures: ["usage-scenario:GENERAL_CARGO"] });
    const suv = makeVariant("SUV", { seats: sourced(5) }, "PASSENGER");
    expect(evaluate(suv, { usageScenario: { scenario: "ROUGH_ROAD", decisionEffect: "MEDIUM_RANK" } })).toMatchObject({ overallOutcome: "PASS", rankingSignals: [expect.objectContaining({ reasonCode: "USAGE_SCENARIO_MEDIUM_FIT" })] });
  });
  it("evaluates exact cargo minimum as pass, fail, or unknown", () => {
    const requirement = { minimumCargoLitres: { minimumLitres: 4_000, decisionEffect: "HARD_FILTER", authority: "USER_EXPLICIT" } } as const;
    expect(evaluate(makeVariant("Panel Van", { cargoVolumeLitres: sourced(4_500) }), requirement)).toMatchObject({ overallOutcome: "PASS", checks: [expect.objectContaining({ reasonCode: "CARGO_VOLUME_MATCH" })] });
    expect(evaluate(makeVariant("Panel Van", { cargoVolumeLitres: sourced(3_500) }), requirement)).toMatchObject({ overallOutcome: "FAIL", hardFailures: ["minimum-cargo-litres"] });
    expect(evaluate(makeVariant("Panel Van"), requirement)).toMatchObject({ overallOutcome: "UNKNOWN", unknownHardRequirements: ["minimum-cargo-litres"] });
  });

  it("does not grant hard authority to a low-confidence exact cargo fact", () => {
    const high = sourced(5_000);
    const low = { ...high, confidence: "LOW" as const, provenance: high.provenance.map((item) => ({ ...item, confidence: "LOW" as const })) };
    const result = evaluate(makeVariant("Panel Van", { cargoVolumeLitres: low }), { minimumCargoLitres: { minimumLitres: 4_000, decisionEffect: "HARD_FILTER", authority: "USER_EXPLICIT" } });
    expect(result).toMatchObject({ overallOutcome: "UNKNOWN", checks: [expect.objectContaining({ authority: "RANK_ONLY", reasonCode: "CARGO_VOLUME_UNKNOWN" })] });
  });

  it("keeps luggage, cargo volume, and payload independent", () => {
    const luggageOnly = makeVariant("Sedan", { luggageLitres: sourced(500) });
    expect(evaluate(luggageOnly, { minimumCargoLitres: { minimumLitres: 100, decisionEffect: "HARD_FILTER", authority: "USER_EXPLICIT" } }).overallOutcome).toBe("UNKNOWN");
    expect(evaluate(luggageOnly, { minimumLuggageLitres: { minimumLitres: 400, decisionEffect: "HARD_FILTER", authority: "USER_EXPLICIT" } }).overallOutcome).toBe("PASS");
    expect(evaluate(makeVariant("Panel Van", { cargoVolumeLitres: sourced(5_000) }), { minimumPayloadKg: { minimumKg: 500, decisionEffect: "HARD_FILTER", authority: "USER_EXPLICIT" } }).overallOutcome).toBe("UNKNOWN");
  });

  it.each([[4_400, "COMPACT_CARGO"], [4_401, "MEDIUM_CARGO"], [7_000, "MEDIUM_CARGO"], [7_001, "LARGE_CARGO"]])("classifies %i litres as %s without hard authority", (litres, capacityClass) => {
    expect(classifyCargoCapacity(litres, USAGE_CARGO_POLICIES_V1.cargoCapacity)).toEqual(expect.objectContaining({ capacityClass, authority: "RANK_ONLY" }));
  });

  it("keeps cargo capacity policy rank-only and missing volume unknown", () => {
    const result = evaluate(makeVariant("Panel Van", { cargoVolumeLitres: sourced(4_000) }), { cargoCapacityPreference: { preferredClass: "COMPACT_CARGO", decisionEffect: "STRONG_RANK" } });
    expect(result.hardFailures).toEqual([]);
    expect(result.rankingSignals).toContainEqual(expect.objectContaining({ reasonCode: "POLICY_CLASS_RANK_ONLY" }));
    expect(classifyCargoCapacity(undefined, USAGE_CARGO_POLICIES_V1.cargoCapacity)).toMatchObject({ capacityClass: "UNKNOWN", authority: "NOT_EVALUABLE" });
  });

  it("evaluates minimum seats pass, fail, and unknown", () => {
    const need = { minimumSeats: { minimumSeats: 4, decisionEffect: "HARD_FILTER", authority: "USER_EXPLICIT", catalogFieldAuthority: "CATALOG_VERIFIED" } } as const;
    expect(evaluate(makeVariant("MPV", { seats: sourced(5) }), need).overallOutcome).toBe("PASS");
    expect(evaluate(makeVariant("MPV", { seats: sourced(2) }), need).overallOutcome).toBe("FAIL");
    expect(evaluate(makeVariant("MPV"), need).overallOutcome).toBe("UNKNOWN");
  });

  it("does not turn rear-seat not-needed into a hard filter or infer absence from seat count", () => {
    const notNeeded = evaluate(makeVariant("Panel Van", { seats: sourced(2) }), { rearSeatPreference: { requirement: "NOT_NEEDED", presenceConstraint: "NO_CONSTRAINT" } });
    expect(notNeeded.overallOutcome).toBe("PASS");
    expect(notNeeded.rankingSignals).toContainEqual(expect.objectContaining({ reasonCode: "REAR_SEAT_NOT_NEEDED_SOFT" }));
    const absent = evaluate(makeVariant("Panel Van", { seats: sourced(2) }), { rearSeatPreference: { requirement: "UNKNOWN", presenceConstraint: "MUST_NOT_HAVE" } });
    expect(absent).toMatchObject({ overallOutcome: "UNKNOWN", checks: [expect.objectContaining({ reasonCode: "REAR_SEAT_PRESENCE_NOT_PROVABLE" })] });
  });

  it("produces urban-delivery fit signals without claiming maneuverability from cargo class", () => {
    const result = evaluate(makeVariant("Panel Van", { cargoVolumeLitres: sourced(4_000) }, "LIGHT_COMMERCIAL"), { commercialScenario: "URBAN_DELIVERY", orientation: "CARGO_PRIORITY" });
    expect(result.rankingSignals.map((signal) => signal.reasonCode)).toEqual(expect.arrayContaining(["URBAN_DELIVERY_ENCLOSED_CARGO_FIT", "URBAN_DELIVERY_COMPACT_CARGO_PREFERENCE"]));
    expect(result.explanationFactInputs).toContainEqual(expect.objectContaining({ reasonCode: "MANEUVERABILITY_NOT_PROVABLE" }));
  });

  it("treats passenger transport as rank fit and general business use as non-eliminating", () => {
    const passenger = evaluate(makeVariant("Passenger Van", { seats: sourced(8) }, "PASSENGER"), { commercialScenario: "PASSENGER_TRANSPORT", orientation: "PASSENGER_PRIORITY" });
    expect(passenger).toMatchObject({ overallOutcome: "PASS", rankingSignals: [expect.objectContaining({ reasonCode: "PASSENGER_TRANSPORT_CARRIER_FIT" })] });
    const business = evaluate(makeVariant("Sedan", { seats: sourced(5) }, "PASSENGER"), { commercialScenario: "GENERAL_CARGO", orientation: "BALANCED" });
    expect(business.overallOutcome).toBe("PASS");
    expect(business.hardFailures).toEqual([]);
  });

  it("does not treat an MPV passenger carrier as hard commercial cargo fit", () => {
    const result = evaluate(makeVariant("MPV", { seats: sourced(7) }, "PASSENGER"), {
      commercialScenario: "URBAN_DELIVERY", orientation: "CARGO_PRIORITY",
      architectureRequirement: { required: "ENCLOSED_CARGO", explicitness: "USER_EXPLICIT" },
    });
    expect(result).toMatchObject({ overallOutcome: "FAIL", checks: [expect.objectContaining({ reasonCode: "ARCHITECTURE_MISMATCH" })] });
    expect(result.rankingSignals.some((signal) => signal.reasonCode === "URBAN_DELIVERY_ENCLOSED_CARGO_FIT")).toBe(false);
  });

  it("allows governed cargo architectures and hard-fails passenger bodies for a cargo-purpose choice", () => {
    const need = { commercialScenario: "GENERAL_CARGO", orientation: "CARGO_PRIORITY", architectureRequirement: { allowed: ["ENCLOSED_CARGO", "OPEN_CARGO", "CAB_CHASSIS"], explicitness: "USER_EXPLICIT" } } as const;
    expect(evaluate(makeVariant("Panel Van", {}, "LIGHT_COMMERCIAL"), need).overallOutcome).toBe("PASS");
    expect(evaluate(makeVariant("Pickup", {}, "LIGHT_COMMERCIAL"), need).overallOutcome).toBe("PASS");
    expect(evaluate(makeVariant("Sedan", {}, "PASSENGER"), need)).toMatchObject({ overallOutcome: "FAIL", hardFailures: ["architecture"] });
  });

  it("fails explicit cargo architecture for passenger bodies and separates panel-van technical unknowns", () => {
    const need = {
      commercialScenario: "URBAN_DELIVERY", orientation: "CARGO_PRIORITY",
      architectureRequirement: { required: "ENCLOSED_CARGO", explicitness: "USER_EXPLICIT" },
      minimumCargoLitres: { minimumLitres: 4_000, decisionEffect: "HARD_FILTER", authority: "USER_EXPLICIT" },
    } as const;
    expect(evaluate(makeVariant("Sedan", { luggageLitres: sourced(500) }, "PASSENGER"), need).overallOutcome).toBe("FAIL");
    expect(evaluate(makeVariant("SUV", { luggageLitres: sourced(700) }, "PASSENGER"), need).overallOutcome).toBe("FAIL");
    expect(evaluate(makeVariant("Panel Van", { cargoVolumeLitres: sourced(4_500) }, "LIGHT_COMMERCIAL"), need).overallOutcome).toBe("PASS");
    expect(evaluate(makeVariant("Panel Van", {}, "LIGHT_COMMERCIAL"), need).overallOutcome).toBe("UNKNOWN");
  });

  it("is deterministic, immutable, and does not mutate inputs", () => {
    const variantSnapshot = makeVariant("Panel Van", { cargoVolumeLitres: sourced(4_500) });
    const need: UsageCargoNeed = { ...BASE_NEED, minimumCargoLitres: { minimumLitres: 4_000, decisionEffect: "HARD_FILTER", authority: "USER_EXPLICIT" } };
    const before = structuredClone(need);
    const first = evaluateUsageCargoSuitability(variantSnapshot, need, USAGE_CARGO_POLICIES_V1);
    expect(first).toEqual(evaluateUsageCargoSuitability(variantSnapshot, need, USAGE_CARGO_POLICIES_V1));
    expect(need).toEqual(before);
    expect(Object.isFrozen(first.checks)).toBe(true);
  });
});
