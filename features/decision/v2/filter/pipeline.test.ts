import { describe, expect, it } from "vitest";
import { buildCatalogSnapshot } from "../catalog/snapshot";
import { release, sourced, variant } from "../catalog/testFixtures.testSupport";
import type { ConstraintEvent } from "../domain/constraint";
import type { CandidateRejectionEvent } from "../domain/rejection";
import { USAGE_CARGO_POLICIES_V1 } from "../usage/policy";
import type { UsageCargoNeed } from "../usage/types";
import { projectActiveConstraints } from "./constraintProjection";
import { evaluateTechnicalCandidatePool } from "./pipeline";
import { projectActiveRejections } from "./rejectionProjection";
import { V2_DECISION_FIELD_REGISTRY_V1 } from "./registry";

const NOW = new Date("2026-08-19T12:00:00.000Z");
const need: UsageCargoNeed = { commercialScenario: "UNSPECIFIED", orientation: "UNKNOWN" };
function event(id: string, field: string, operator: string, value: unknown, overrides: Partial<ConstraintEvent> = {}): ConstraintEvent {
  return { schemaVersion: 1, conversationId: "conversation", id, sourceMessageId: `message-${id}`, sourceTurn: 1, sequence: Number(id.replace(/\D/gu, "")) || 0, createdAt: NOW.toISOString(), eventType: "CONSTRAINT", kind: "HARD_CONSTRAINT", field, normalizedValue: { operator, value, ...(field === "seats" ? { unit: "COUNT" } : {}) }, sourceText: "explicit technical requirement", confidence: 1, authority: "USER_EXPLICIT", decisionEffect: "HARD_FILTER", status: "ACTIVE", ...overrides };
}
function rejection(id: string, scope: CandidateRejectionEvent["scope"], reference: string): CandidateRejectionEvent {
  return { schemaVersion: 1, conversationId: "conversation", id, sourceMessageId: `message-${id}`, sourceTurn: 1, sequence: 1, createdAt: NOW.toISOString(), eventType: "CANDIDATE_REJECTION", scope, reason: "OTHER_EXPLICIT", scopeExplicitlyRequested: true, ...(scope === "EXACT_VARIANT" ? { candidateId: reference } : scope === "MODEL_FAMILY" ? { familyId: reference } : { brandId: reference }) };
}
async function snapshot(records = [
  variant("v-a", "Generic Alpha", "One", "Base", { bodyStyle: sourced("Sedan"), powertrain: { fuelType: sourced("HEV"), powerKw: sourced(100), transmission: sourced("Automatic"), drivenWheels: sourced("FWD") }, dimensions: { seats: sourced(5), luggageLitres: sourced(450) } }),
  variant("v-b", "Generic Beta", "Two", "Cargo", { bodyStyle: sourced("Panel Van"), vehicleUseClass: sourced("LIGHT_COMMERCIAL"), powertrain: { fuelType: sourced("DIESEL"), powerKw: sourced(90), transmission: sourced("Manual") }, dimensions: { seats: sourced(2), cargoVolumeLitres: sourced(5000), payloadKg: sourced(900) } }),
]) {
  const data = release("1.0.0", records); const result = await buildCatalogSnapshot({ pointer: data.pointer, manifest: data.manifest, catalog: data.catalog, decisionFacets: data.facets, now: NOW });
  if (result.status !== "READY") throw new Error(result.reason); return result.snapshot;
}
async function run(constraints: readonly ConstraintEvent[] = [], rejections: readonly CandidateRejectionEvent[] = [], usageNeed = need, records?: Parameters<typeof snapshot>[0]) {
  return evaluateTechnicalCandidatePool({ snapshot: await snapshot(records), decisionFingerprint: "decision-fingerprint", activeConstraints: projectActiveConstraints(constraints), activeRejections: projectActiveRejections(rejections), usageNeed, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, usagePolicies: USAGE_CARGO_POLICIES_V1 });
}

describe("WP5 full-catalog technical pipeline", () => {
  it.each([
    ["ON_SALE", "ELIGIBLE"], ["ANNOUNCED", "NOT_EVALUABLE"], ["ORDER_CLOSED", "ELIMINATED"], ["DISCONTINUED", "ELIMINATED"],
  ] as const)("maps %s lifecycle deterministically", async (lifecycleStatus, disposition) => {
    const result = await run([], [], need, [variant("v-scope", "Generic", "Scope", "Base", { lifecycleStatus, bodyStyle: sourced("SUV") })]);
    expect(result.candidates[0]?.disposition).toBe(disposition);
  });
  it("starts from every snapshot variant and catalog additions/removals flow automatically", async () => {
    expect((await run()).initialCandidateIds).toEqual(["v-a", "v-b"]);
    expect((await run([], [], need, [variant("v-c", "Generic Gamma", "Three", "Base", { bodyStyle: sourced("SUV") })])).initialCandidateIds).toEqual(["v-c"]);
  });
  it("recomputes corrected body style constraints from the full snapshot", async () => {
    expect((await run([event("c1", "bodyStyle", "EQUALS", "Sedan")])).eligibleCandidateIds).toEqual(["v-a"]);
    expect((await run([event("c2", "bodyStyle", "EQUALS", "Panel Van")])).eligibleCandidateIds).toEqual(["v-b"]);
  });
  it("is independent from constraint input order and writes registry-ordered trace", async () => {
    const a = await run([event("c2", "seats", "MINIMUM", 4), event("c1", "fuelType", "ONE_OF", ["HEV", "MHEV", "PHEV"])]);
    const b = await run([event("c1", "fuelType", "ONE_OF", ["HEV", "MHEV", "PHEV"]), event("c2", "seats", "MINIMUM", 4)]);
    expect(a).toEqual(b); expect(a.filterTrace.map((step) => step.fieldId)).toEqual(["lifecycleStatus", "rejectionScope", "fuelType", "seats", "usageCargo"]); expect(a.eligibleCandidateIds).toEqual(["v-a"]);
  });
  it("keeps exact, family and brand rejection scopes explicit", async () => {
    const base = await snapshot(); const family = base.familyIndex.values().find((entry) => entry.variantIds.includes("v-a"))!;
    expect((await run([], [rejection("r1", "EXACT_VARIANT", "v-a")])).eliminatedCandidateIds).toEqual(["v-a"]);
    expect((await run([], [rejection("r2", "MODEL_FAMILY", family.familyId)])).eliminatedCandidateIds).toEqual(["v-a"]);
    expect((await run([], [rejection("r3", "BRAND", "generic beta")])).eliminatedCandidateIds).toEqual(["v-b"]);
  });
  it("supports exact enum/string and numeric fields without fuzzy matching", async () => {
    expect((await run([event("c1", "fuelType", "EQUALS", "HEV")])).eligibleCandidateIds).toEqual(["v-a"]);
    expect((await run([event("c1", "transmission", "EQUALS", "Auto")])).eligibleCandidateIds).toEqual([]);
    expect((await run([event("c1", "luggageLitres", "MINIMUM", 400, { normalizedValue: { operator: "MINIMUM", value: 400, unit: "LITRE" } })])).eligibleCandidateIds).toEqual(["v-a"]);
  });
  it("eliminates four- and five-seat candidates from a controlled minimum-nine-seat answer", async () => {
    const records = [
      variant("v-four", "Generic", "Four", "Base", { bodyStyle: sourced("MPV"), dimensions: { seats: sourced(4) } }),
      variant("v-five", "Generic", "Five", "Base", { bodyStyle: sourced("MPV"), dimensions: { seats: sourced(5) } }),
      variant("v-nine", "Generic", "Nine", "Base", { bodyStyle: sourced("Passenger Van"), dimensions: { seats: sourced(9) } }),
    ];
    const result = await run([event("c1", "seats", "MINIMUM", 9)], [], need, records);
    expect(result.eligibleCandidateIds).toEqual(["v-nine"]);
    expect(result.eliminatedCandidateIds).toEqual(["v-five", "v-four"]);
  });
  it("applies selected payload and cargo-volume thresholds as hard filters", async () => {
    const records = [
      variant("v-light", "Generic", "Light", "Cargo", { bodyStyle: sourced("Panel Van"), dimensions: { cargoVolumeLitres: sourced(3_000), payloadKg: sourced(600) } }),
      variant("v-heavy", "Generic", "Heavy", "Cargo", { bodyStyle: sourced("Panel Van"), dimensions: { cargoVolumeLitres: sourced(5_000), payloadKg: sourced(1_000) } }),
    ];
    const result = await run([
      event("c1", "cargoVolumeLitres", "MINIMUM", 5_000, { normalizedValue: { operator: "MINIMUM", value: 5_000, unit: "LITRE" } }),
      event("c2", "payloadKg", "MINIMUM", 1_000, { normalizedValue: { operator: "MINIMUM", value: 1_000, unit: "KG" } }),
    ], [], need, records);
    expect(result.eligibleCandidateIds).toEqual(["v-heavy"]);
    expect(result.eliminatedCandidateIds).toEqual(["v-light"]);
  });
  it("matches canonical manual intent against a descriptive catalog transmission", async () => {
    const result = await run([
      event("c1", "bodyStyle", "EQUALS", "Pickup"),
      event("c2", "fuelType", "EQUALS", "DIESEL"),
      event("c3", "drivenWheels", "EQUALS", "AWD"),
      event("c4", "transmission", "EQUALS", "MANUAL"),
    ], [], need, [variant("v-manual", "Generic", "Work", "4x4 MT", { bodyStyle: sourced("Pickup"), powertrain: { fuelType: sourced("DIESEL"), powerKw: sourced(120), transmission: sourced("6-speed manual"), drivenWheels: sourced("AWD") } })]);
    expect(result.eligibleCandidateIds).toEqual(["v-manual"]);
  });
  it.each([
    ["fuelType", "EQUALS", "HEV", undefined, "v-a"],
    ["fuelType", "ONE_OF", ["MHEV", "HEV", "PHEV"], undefined, "v-a"],
    ["fuelType", "EXCLUDES", ["BEV"], undefined, "v-a"],
    ["transmission", "EQUALS", "Manual", undefined, "v-b"],
    ["bodyStyle", "EQUALS", "Panel Van", undefined, "v-b"],
    ["drivenWheels", "EQUALS", "FWD", undefined, "v-a"],
    ["seats", "MINIMUM", 4, "COUNT", "v-a"],
    ["luggageLitres", "MINIMUM", 400, "LITRE", "v-a"],
    ["cargoVolumeLitres", "MINIMUM", 4000, "LITRE", "v-b"],
    ["payloadKg", "MINIMUM", 800, "KG", "v-b"],
    ["powerKw", "MINIMUM", 95, "KW", "v-a"],
    ["powerKw", "MAXIMUM", 95, "KW", "v-b"],
  ] as const)("evaluates registered %s %s", async (field, operator, value, unit, expected) => {
    const result = await run([event("c1", field, operator, value, { normalizedValue: { operator, value, ...(unit ? { unit } : {}) } })]);
    expect(result.eligibleCandidateIds).toContain(expected);
  });
  it("keeps missing and low-authority hard facts not evaluable, while failure wins", async () => {
    const missing = await run([event("c1", "payloadKg", "MINIMUM", 500, { normalizedValue: { operator: "MINIMUM", value: 500, unit: "KG" } })]);
    expect(missing.notEvaluableCandidateIds).toContain("v-a"); expect(missing.eligibleCandidateIds).toContain("v-b");
    const both = await run([event("c1", "payloadKg", "MINIMUM", 1000, { normalizedValue: { operator: "MINIMUM", value: 1000, unit: "KG" } }), event("c2", "electricRangeKm", "MINIMUM", 100, { normalizedValue: { operator: "MINIMUM", value: 100, unit: "KM" } })]);
    expect(both.candidates.find((candidate) => candidate.exactVariantId === "v-b")?.disposition).toBe("ELIMINATED");
  });
  it("does not use LOW confidence facts for a hard pass or failure", async () => {
    const lowSeats = { ...sourced(5), confidence: "LOW" };
    const result = await run([event("c1", "seats", "MINIMUM", 4)], [], need, [variant("v-low", "Generic", "Low", "Base", { bodyStyle: sourced("SUV"), dimensions: { seats: lowSeats } })]);
    expect(result.notEvaluableCandidateIds).toEqual(["v-low"]);
  });
  it("ignores non-hard semantics and defers price to WP6", async () => {
    const soft = event("c1", "dailyLife", "MINIMUM", 110, { kind: "GUIDED_APPROXIMATION", decisionEffect: "SOFT_RANK" });
    expect((await run([soft])).eligibleCandidateIds).toEqual(["v-a", "v-b"]);
    const price = event("c2", "price", "MAXIMUM", 5_000_000);
    expect((await run([price])).deferredConstraintIds).toEqual(["c2"]);
  });
  it("fails closed for unregistered fields, operators, types, and conflicting active constraints", async () => {
    expect((await run([event("c1", "futureFact", "EQUALS", "x")])).diagnostics.map((d) => d.code)).toContain("UNREGISTERED_DECISION_FIELD");
    expect((await run([event("c1", "fuelType", "FUZZY", "HEV")])).notEvaluableCandidateIds).toEqual(["v-a", "v-b"]);
    expect((await run([event("c1", "powerKw", "MINIMUM", "100")])).notEvaluableCandidateIds).toEqual(["v-a", "v-b"]);
    expect((await run([event("c1", "bodyStyle", "EQUALS", "Sedan"), event("c2", "bodyStyle", "EQUALS", "SUV")])).diagnostics.map((d) => d.code)).toContain("CONFLICTING_ACTIVE_HARD_CONSTRAINTS");
  });
  it("integrates usage hard fail/unknown and preserves cargo architecture semantics", async () => {
    const cargoNeed: UsageCargoNeed = { commercialScenario: "GENERAL_CARGO", orientation: "CARGO_PRIORITY", architectureRequirement: { required: "ENCLOSED_CARGO", explicitness: "USER_EXPLICIT" }, minimumCargoLitres: { minimumLitres: 6000, authority: "USER_EXPLICIT", decisionEffect: "HARD_FILTER" } };
    const result = await run([], [], cargoNeed);
    expect(result.candidates.find((c) => c.exactVariantId === "v-a")?.disposition).toBe("ELIMINATED");
    expect(result.candidates.find((c) => c.exactVariantId === "v-b")?.disposition).toBe("ELIMINATED");
  });
  it("keeps buckets disjoint, totals stable, and deterministic", async () => {
    const first = await run([event("c1", "seats", "MINIMUM", 4)]); const second = await run([event("c1", "seats", "MINIMUM", 4)]);
    expect(first).toEqual(second); expect(first.counts.initial).toBe(first.counts.eligible + first.counts.notEvaluable + first.counts.eliminated);
    expect(new Set([...first.eligibleCandidateIds, ...first.notEvaluableCandidateIds, ...first.eliminatedCandidateIds]).size).toBe(first.counts.initial);
  });
});
