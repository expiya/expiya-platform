import { describe, expect, it } from "vitest";

import { inspectCatalogFact } from "./decisionFacts";
import { buildCatalogSnapshot } from "./snapshot";
import { release, sourced, variant } from "./testFixtures.testSupport";

function build(overrides: Readonly<Record<string, unknown>> = {}, activeNewPrice: unknown = null) {
  const record = { ...variant("variant-a", "Brand Alpha", "Model 10", "Base", overrides), activeNewPrice };
  const fixture = release("1.2.3", [record as ReturnType<typeof variant>]);
  return { fixture, result: buildCatalogSnapshot({ ...fixture, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") }) };
}

describe("V2 decision-safe vehicle fact projection", () => {
  it("projects sourced facts, independent luggage/cargo/payload, and catalog authority", () => {
    const { result } = build({
      vehicleUseClass: sourced("LIGHT_COMMERCIAL"),
      dimensions: { seats: sourced(2), luggageLitres: sourced(300), cargoVolumeLitres: sourced(3_000), payloadKg: sourced(900) },
    });
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    const facts = result.snapshot.variants[0]!.decisionFacts;
    expect(facts.vehicleUseClass?.value).toBe("LIGHT_COMMERCIAL");
    expect({ luggage: facts.dimensions.luggageLitres?.value, cargo: facts.dimensions.cargoVolumeLitres?.value, payload: facts.dimensions.payloadKg?.value }).toEqual({ luggage: 300, cargo: 3_000, payload: 900 });
    expect(facts.bodyStyle.catalogFingerprint).toBe(result.snapshot.authority.catalogFingerprint);
    expect(inspectCatalogFact(facts.dimensions.cargoVolumeLitres)).toMatchObject({ availability: "AVAILABLE", hardFilterAuthority: "NOT_DETERMINED" });
    expect(inspectCatalogFact(undefined)).toMatchObject({ availability: "MISSING" });
  });

  it("allows missing optional facts but fails closed for missing required body style", () => {
    expect(build().result.status).toBe("READY");
    expect(build({ bodyStyle: undefined }).result).toMatchObject({ status: "UNAVAILABLE", diagnostics: expect.arrayContaining([expect.objectContaining({ code: "REQUIRED_DECISION_FACT_MISSING" })]) });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects malformed numeric fact %s", (value) => {
    const valid = build().fixture;
    const record = valid.catalog.records[0]!;
    const catalog = { ...valid.catalog, records: [{ ...record, variant: { ...record.variant, powertrain: { ...record.variant.powertrain, powerKw: sourced(value) } } }] };
    expect(buildCatalogSnapshot({ manifest: valid.manifest, catalog, decisionFacets: valid.facets, now: new Date("2026-08-20T00:00:00.000Z") })).toMatchObject({ status: "UNAVAILABLE", diagnostics: expect.arrayContaining([expect.objectContaining({ code: "DECISION_FACT_VALUE_INVALID" })]) });
  });

  it("rejects empty provenance and invalid confidence", () => {
    expect(build({ bodyStyle: { ...sourced("Generic"), provenance: [] } }).result).toMatchObject({ status: "UNAVAILABLE", diagnostics: expect.arrayContaining([expect.objectContaining({ code: "DECISION_FACT_PROVENANCE_INVALID" })]) });
    expect(build({ bodyStyle: { ...sourced("Generic"), confidence: "CERTAIN" } }).result.status).toBe("UNAVAILABLE");
  });

  it("rejects unknown usage/fuel vocabulary and non-positive seats", () => {
    expect(build({ vehicleUseClass: sourced("UNKNOWN_CLASS") }).result.status).toBe("UNAVAILABLE");
    expect(build({ powertrain: { fuelType: sourced("STEAM"), powerKw: sourced(10), transmission: sourced("Automatic") } }).result.status).toBe("UNAVAILABLE");
    expect(build({ dimensions: { seats: sourced(0) } }).result.status).toBe("UNAVAILABLE");
    expect(build({ dimensions: { seats: sourced(2.5) } }).result.status).toBe("UNAVAILABLE");
  });

  it("deep-freezes facts and detaches the snapshot from later input mutation", () => {
    const dimensions = { seats: sourced(5) };
    const { result } = build({ dimensions, safetyFeatureCodes: [sourced("AEB")] });
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    const variantSnapshot = result.snapshot.variants[0]!;
    dimensions.seats.value = 7;
    expect(variantSnapshot.decisionFacts.dimensions.seats?.value).toBe(5);
    expect(Object.isFrozen(variantSnapshot.decisionFacts.dimensions.seats)).toBe(true);
    expect(Object.isFrozen(variantSnapshot.decisionFacts.dimensions.seats?.provenance)).toBe(true);
    expect(Object.isFrozen(variantSnapshot.decisionFacts.safetyFeatureCodes)).toBe(true);
    expect(() => Object.assign(variantSnapshot.decisionFacts.dimensions.seats!, { value: 9 })).toThrow();
  });

  it("does not share mutable fact objects between variants", () => {
    const first = variant("variant-a", "Brand Alpha", "Model 10", "Base", { dimensions: { seats: sourced(5) } });
    const second = variant("variant-b", "Brand Alpha", "Model 10", "Plus", { dimensions: { seats: sourced(2) } });
    const fixture = release("1.2.3", [first, second]);
    const result = buildCatalogSnapshot({ ...fixture, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") });
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.snapshot.variants[0]?.decisionFacts.dimensions.seats).not.toBe(result.snapshot.variants[1]?.decisionFacts.dimensions.seats);
    expect(result.snapshot.variants.map((item) => item.decisionFacts.dimensions.seats?.value)).toEqual([5, 2]);
  });

  it("does not infer a driven axle from 4x2-only provenance", () => {
    const ambiguous = sourced("FWD");
    ambiguous.provenance[0]!.documentVersion = "Pickup 4x2 AT";
    const result = build({ powertrain: { fuelType: sourced("DIESEL"), powerKw: sourced(120), transmission: sourced("Automatic"), drivenWheels: ambiguous } }).result;
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.snapshot.variants[0]?.decisionFacts.powertrain.drivenWheels).toBeUndefined();

    const explicit = sourced("FWD");
    explicit.provenance[0]!.documentVersion = "Pickup 4x2 FWD AT";
    const explicitResult = build({ powertrain: { fuelType: sourced("DIESEL"), powerKw: sourced(120), transmission: sourced("Automatic"), drivenWheels: explicit } }).result;
    expect(explicitResult.status === "READY" && explicitResult.snapshot.variants[0]?.decisionFacts.powertrain.drivenWheels?.value).toBe("FWD");
  });

  it("keeps public and internal estimate price observations distinct without affordability decisions", () => {
    const basePrice = {
      id: "price-1", vehicleVariantId: "variant-a", market: "TR", condition: "NEW", amountTry: 1_000_000,
      validFrom: "2026-08-18T23:00:00.000Z", provenance: sourced("x").provenance, confidence: "HIGH",
    };
    const publicResult = build({}, { ...basePrice, priceType: "LIST", consumerVisibility: "PUBLIC" }).result;
    const estimateResult = build({}, { ...basePrice, priceType: "ESTIMATE", consumerVisibility: "INTERNAL_ONLY", estimationMethod: "internal" }).result;
    expect(publicResult.status === "READY" && publicResult.snapshot.variants[0]?.activeNewPrice).toMatchObject({ consumerVisibility: "PUBLIC", realizationSafe: true });
    expect(estimateResult.status === "READY" && estimateResult.snapshot.variants[0]?.activeNewPrice).toMatchObject({ priceType: "ESTIMATE", consumerVisibility: "INTERNAL_ONLY", realizationSafe: false });
  });
});
