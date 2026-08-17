import { describe, expect, it } from "vitest";

import { buildCatalogSnapshot } from "../catalog/snapshot";
import { release, sourced, variant } from "../catalog/testFixtures.testSupport";
import { USAGE_ARCHITECTURE_POLICY_V1, USAGE_CARGO_POLICIES_V1 } from "./policy";
import { projectCatalogUsageArchitectures, projectUsageArchitecture } from "./projection";

function projected(bodyStyle: string, useClass?: "PASSENGER" | "LIGHT_COMMERCIAL" | "HEAVY_COMMERCIAL", confidence: "LOW" | "MEDIUM" | "HIGH" = "HIGH") {
  const body = { ...sourced(bodyStyle), confidence, provenance: sourced(bodyStyle).provenance.map((item) => ({ ...item, confidence })) };
  const record = variant("variant-a", "Brand Alpha", "Model 10", "Base", { bodyStyle: body, vehicleUseClass: useClass ? sourced(useClass) : undefined });
  const fixture = release("1.2.3", [record]);
  const result = buildCatalogSnapshot({ ...fixture, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") });
  if (result.status !== "READY") throw new Error(JSON.stringify(result));
  return { projection: projectUsageArchitecture(result.snapshot.variants[0]!, USAGE_ARCHITECTURE_POLICY_V1), variant: result.snapshot.variants[0]!, snapshot: result.snapshot };
}

describe("V2 usage architecture projection", () => {
  it.each([
    ["Panel Van", "ENCLOSED_CARGO"], ["Pickup", "OPEN_CARGO"], ["Chassis Cab", "CAB_CHASSIS"],
    ["Passenger Van", "PASSENGER_CARRIER"], ["MPV", "PASSENGER_CARRIER"], ["Sedan", "PASSENGER_CAR"],
    ["Hatchback", "PASSENGER_CAR"], ["SUV", "PASSENGER_CAR"],
  ])("maps %s to %s", (bodyStyle, architecture) => {
    expect(projected(bodyStyle).projection.architecture).toBe(architecture);
  });

  it("fails closed for new body vocabulary", () => {
    expect(projected("Novel Architecture").projection).toMatchObject({ architecture: "UNKNOWN", derivation: "INSUFFICIENT_DATA", hardScopeAuthority: false });
  });

  it("keeps missing use class derived and records missingness without inventing a canonical fact", () => {
    const result = projected("Panel Van");
    expect(result.projection).toMatchObject({ architecture: "ENCLOSED_CARGO", derivation: "CANONICAL_BODY_STYLE", diagnostics: ["USE_CLASS_MISSING"] });
    expect(result.variant.decisionFacts.vehicleUseClass).toBeUndefined();
  });

  it("reports use-class conflict and denies hard scope authority", () => {
    expect(projected("Panel Van", "PASSENGER").projection).toMatchObject({ hardScopeAuthority: false, diagnostics: ["USE_CLASS_BODY_STYLE_CONFLICT"] });
  });

  it("denies hard authority to low-confidence architecture facts", () => {
    expect(projected("Panel Van", "LIGHT_COMMERCIAL", "LOW").projection).toMatchObject({ confidence: "LOW", hardScopeAuthority: false });
  });

  it("projects a catalog deterministically without mutating input", () => {
    const built = projected("Sedan", "PASSENGER");
    const before = structuredClone(built.variant);
    const first = projectCatalogUsageArchitectures(built.snapshot, USAGE_CARGO_POLICIES_V1);
    const second = projectCatalogUsageArchitectures(built.snapshot, USAGE_CARGO_POLICIES_V1);
    expect(first.entries()).toEqual(second.entries());
    expect(built.variant).toEqual(before);
    expect(Object.isFrozen(first.get("variant-a"))).toBe(true);
  });
});
