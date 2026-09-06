import { describe, expect, it } from "vitest";
import { canonicalize } from "../fingerprint/canonicalize";
import type { CatalogSnapshot } from "../catalog/types";
import { compileAutomotiveSemantics, mergeDecisionCompilation } from "./compilation";
import { createCatalogCapabilityRegistry } from "./catalogCapability";
import { createAutomotiveSemanticRequest } from "./prompt";
import { projectCatalogSemantics } from "./projection";
import { parseAutomotiveSemanticResult } from "./schema";
import { boundedSemanticFallback, interpretAutomotiveSemantics } from "./service";
import { selectDiscriminatingSemanticDimension } from "./planner";
import type { AutomotiveSemanticResult, AutomotiveSemanticSignal } from "./types";

const fact = <T,>(value: T) => ({ value, confidence: "HIGH", provenance: [], catalogFingerprint: "sha256:catalog", explanationAccess: "AUTHORITY_REQUIRED" });
const snapshot = { authority: { releaseVersion: "0.55.4", catalogFingerprint: "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9" }, variants: Array.from({ length: 10 }, (_, index) => ({ id: `v${index}`, decisionFacts: { bodyStyle: fact(index % 2 ? "SUV" : "Sedan"), powertrain: { fuelType: fact(index % 2 ? "HEV" : "GASOLINE"), transmission: fact("Automatic"), powerKw: fact(100 + index), drivenWheels: index < 8 ? fact("FWD") : undefined }, dimensions: { seats: index < 8 ? fact(5) : undefined, luggageLitres: index < 7 ? fact(400) : undefined }, efficiency: {} } })) } as unknown as CatalogSnapshot;
const registry = createCatalogCapabilityRegistry(snapshot, "sha256:universe");
const signal = (overrides: Partial<AutomotiveSemanticSignal> = {}): AutomotiveSemanticSignal => ({ id: "s1", concept: "PERFORMANCE_ORIENTED_VEHICLE", polarity: "POSITIVE", sourceSpan: "performans arabası", explicitness: "USER_EXPLICIT", confidence: 0.95, confirmationStatus: "CONFIRMED_BY_USER", ...overrides });
const result = (signals: readonly AutomotiveSemanticSignal[] = [signal()]): AutomotiveSemanticResult => ({ schemaVersion: "ASIL-0.1", messageId: "m1", concepts: signals, archetypes: [], analogies: [], qualitativeNeeds: [], ambiguities: [], candidateInterpretations: [], requestedFacts: [], conversationalAct: "VEHICLE_DISCOVERY", providerStatus: "AVAILABLE" });

describe("Automotive Semantic Intelligence Layer v0.1", () => {
  it("uses a bounded provider request with explicit authority separation", () => {
    const request = createAutomotiveSemanticRequest("m1", "Vito tarzı bir şey");
    expect(request.instructions.join(" ")).toMatch(/never choose, rank, filter|never.*recommend/iu);
    expect(request.instructions.join(" ")).toMatch(/UNCONFIRMED_HYPOTHESIS/u);
  });

  it.each(["Vito tarzı", "performans arabası", "spor ama aileye uygun", "roket gibi ama çok yakmasın", "Golf gibi ama yüksek", "uzun yolda yormayan", "hantal olmasın", "Vito gibi olmasın", "aslında sportif istemiyorum", "hem çok güçlü hem performans önemli değil", "katalogda olmayan model", "bu ne demek?"])("keeps provider-inferred subdimensions unconfirmed for %s", (text) => {
    const parsed = parseAutomotiveSemanticResult({ ...result([signal({ id: `s-${text}`, sourceSpan: text, explicitness: "INFERRED_SUBDIMENSION", confirmationStatus: "UNCONFIRMED_HYPOTHESIS", projectionHint: { fieldId: "powerKw", normalizedValue: { operator: "MINIMUM", value: 150 } } })]), concepts: [signal({ id: `s-${text}`, sourceSpan: text, explicitness: "INFERRED_SUBDIMENSION", confirmationStatus: "UNCONFIRMED_HYPOTHESIS", projectionHint: { fieldId: "powerKw", normalizedValue: { operator: "MINIMUM", value: 150 } } })] });
    expect(compileAutomotiveSemantics({ result: parsed, registry, userText: text }).decisionImpact).toBe("NONE");
  });

  it("compiles only explicit confirmed and catalog-evaluable meaning", () => {
    const compilation = compileAutomotiveSemantics({ result: result([signal({ sourceSpan: "SUV istiyorum", projectionHint: { fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "SUV" } } }), signal({ id: "inferred", explicitness: "INFERRED_SUBDIMENSION", confirmationStatus: "UNCONFIRMED_HYPOTHESIS", projectionHint: { fieldId: "powerKw", normalizedValue: { operator: "MINIMUM", value: 200 } } }), signal({ id: "unsupported", projectionHint: { fieldId: "payloadKg", normalizedValue: { operator: "MINIMUM", value: 1000 } } })]), registry, userText: "SUV istiyorum" });
    expect(compilation.decisionMutations).toEqual([expect.objectContaining({ fieldId: "bodyStyle" })]);
    expect(compilation.withheldSignals).toEqual(expect.arrayContaining([expect.objectContaining({ signalId: "inferred", reason: "UNCONFIRMED" }), expect.objectContaining({ signalId: "unsupported" })]));
    expect(compilation.compilationFingerprint).toBe(compileAutomotiveSemantics({ result: result([signal({ sourceSpan: "SUV istiyorum", projectionHint: { fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "SUV" } } }), signal({ id: "inferred", explicitness: "INFERRED_SUBDIMENSION", confirmationStatus: "UNCONFIRMED_HYPOTHESIS", projectionHint: { fieldId: "powerKw", normalizedValue: { operator: "MINIMUM", value: 200 } } }), signal({ id: "unsupported", projectionHint: { fieldId: "payloadKg", normalizedValue: { operator: "MINIMUM", value: 1000 } } })]), registry, userText: "SUV istiyorum" }).compilationFingerprint);
  });

  it("does not trust provider confirmation labels for an unstated projection", () => {
    const compilation = compileAutomotiveSemantics({ result: result([signal({ sourceSpan: "performans arabası", explicitness: "USER_EXPLICIT", confirmationStatus: "CONFIRMED_BY_USER", projectionHint: { fieldId: "powerKw", normalizedValue: { operator: "MINIMUM", value: 150 } } })]), registry, userText: "performans arabası" });
    expect(compilation.decisionMutations).toEqual([]);
    expect(compilation.personaMutations).toEqual([{ operation: "ACTIVATE", traits: ["DRIVING_ENGAGEMENT"], sourceSpan: "performans arabası" }]);
    expect(compilation.withheldSignals).toContainEqual(expect.objectContaining({ signalId: "s1", reason: "INFERRED" }));
  });

  it.each([["PERFORMANCE_ORIENTED_VEHICLE", "performanslı bir araç", "DRIVING_ENGAGEMENT"], ["EFFORTLESS_LONG_DISTANCE", "uzun yolda yormayan", "COMFORT"]] as const)("compiles explicit qualitative meaning to a safe persona trait without inventing a technical fact: %s", (concept, sourceSpan, trait) => {
    const compilation = compileAutomotiveSemantics({ result: result([signal({ concept, sourceSpan, projectionHint: undefined })]), registry, userText: sourceSpan });
    expect(compilation.decisionMutations).toEqual([]);
    expect(compilation.personaMutations).toEqual([{ operation: "ACTIVATE", traits: [trait], sourceSpan }]);
    expect(compilation.decisionImpact).toBe("PROPOSED_MUTATIONS");
  });

  it("rejects a provider-invented source span even when its projection looks explicit", () => {
    const compilation = compileAutomotiveSemantics({ result: result([signal({ sourceSpan: "SUV istiyorum", projectionHint: { fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "SUV" } } })]), registry, userText: "performans arabası istiyorum" });
    expect(compilation.decisionImpact).toBe("NONE");
    expect(compilation.withheldSignals).toContainEqual(expect.objectContaining({ signalId: "s1", reason: "INFERRED" }));
  });

  it("projects evaluability without candidate identity or decision authority", () => {
    const projection = projectCatalogSemantics(result([signal({ projectionHint: { fieldId: "bodyStyle", normalizedValue: "SUV" } })]), registry);
    expect(projection.decisionAuthority).toBe("NONE");
    expect(canonicalize(projection)).not.toMatch(/candidateId|exactVariantId/iu);
  });

  it("does not change interpretation when hypotheses are withheld", () => {
    const base = { constraintMutations: [] as const, personaMutations: [] as const, acts: ["VEHICLE_INTENT"] as const };
    const compilation = compileAutomotiveSemantics({ result: result([signal({ confirmationStatus: "UNCONFIRMED_HYPOTHESIS", projectionHint: { fieldId: "bodyStyle", normalizedValue: "SUV" } })]), registry, userText: "performans arabası" });
    expect(mergeDecisionCompilation(base, compilation)).toBe(base);
  });

  it("keeps information detours decision-neutral", () => {
    const info = { ...result([]), conversationalAct: "INFORMATION" as const, requestedFacts: [{ factId: "charging-time", authority: "KNOWLEDGE_LAYER" as const, reason: "User asked for education" }] };
    expect(compileAutomotiveSemantics({ result: info, registry, userText: "bu ne demek?" }).decisionImpact).toBe("NONE");
  });

  it("returns a bounded clarification when providers are unavailable", async () => {
    const fallback = await interpretAutomotiveSemantics({ model: { interpretAutomotiveSemantics: async () => { throw new Error("offline"); } }, messageId: "m", userText: "Vito tarzı" });
    expect(fallback).toMatchObject({ providerStatus: "BOUNDED_FALLBACK", concepts: [], qualitativeNeeds: [] });
    expect(fallback.ambiguities[0]?.clarificationCandidates).toHaveLength(2);
    expect(boundedSemanticFallback("m", "hantal olmasın")).toEqual(boundedSemanticFallback("m", "hantal olmasın"));
  });

  it("selects a deterministic high-information dimension without choosing a question or candidate", () => {
    const selected = selectDiscriminatingSemanticDimension({ registry, universeFingerprint: "sha256:universe", answeredFieldIds: [], statistics: [{ fieldId: "bodyStyle", coverageRatio: 1, valueCounts: { SUV: 5, Sedan: 5 } }, { fieldId: "fuelType", coverageRatio: 1, valueCounts: { HEV: 9, GASOLINE: 1 } }] });
    expect(selected).toMatchObject({ fieldId: "bodyStyle", universeFingerprint: "sha256:universe" });
    expect(selectDiscriminatingSemanticDimension({ registry, universeFingerprint: "wrong", answeredFieldIds: [], statistics: [] })).toBeNull();
  });
});
