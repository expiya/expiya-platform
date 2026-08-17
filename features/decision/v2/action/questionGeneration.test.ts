import { describe, expect, it } from "vitest";
import { generateMaterialQuestionCandidates } from "./questionGeneration";
import { assessRecommendationReadiness } from "./readiness";
import type { CatalogSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";

const memory = (overrides: Partial<ConversationMemory> = {}): ConversationMemory => ({ conversationId: "c", turn: 1, state: "UNDERSTANDING_NEEDS", vehicleIntentEstablished: true, events: [], budget: { financeFlexibility: "NONE", unresolvedFinancedCeiling: false, budgetImportance: "UNKNOWN", budgetUnknown: true, budgetExcluded: false }, modelReferences: [], revealedCandidateIds: [], socialState: { consecutiveSocialTurns: 0 }, offTopicState: { consecutiveOffTopicTurns: 0, boundaryStated: false }, abuseState: { level: "NONE", strikeCount: 0 }, directAnswerHistory: [], materialQuestionHistory: [], persona: { activated: false, requestedTraits: [] }, catalogAuthority: { market: "TR", releaseVersion: "1", catalogFingerprint: "catalog", manifestFingerprint: "manifest", activatedAt: "2026-08-19T00:00:00.000Z" }, memoryFingerprint: "memory", decisionFingerprint: "decision", ...overrides });
const fact = <T,>(value: T) => ({ value, confidence: "HIGH" as const, provenance: [{ sourceId: "s", sourceUrl: "https://example.com", accessedAt: "2026-08-19T00:00:00.000Z", confidence: "HIGH" as const, extractionMethod: "MANUAL" as const, limitations: [] }] });
const variant = (id: string, body: string, fuel: "GASOLINE" | "HEV") => ({ id, exactVariantId: id, modelFamilyId: `f-${id}`, canonicalBrand: "Brand", canonicalModel: `Model ${id}`, canonicalTrim: "Trim", market: "TR", lifecycleStatus: "ON_SALE", decisionFacts: { bodyStyle: fact(body), modelYear: fact(2026), powertrain: { fuelType: fact(fuel), powerKw: fact(100), transmission: fact(id === "v1" ? "Automatic" : "Manual") }, dimensions: {}, efficiency: {}, safetyFeatureCodes: [] }, priceObservations: [] });

describe("production material-question generation", () => {
  it("derives stable consumer-facing discriminators only from the current pool", () => {
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants: [variant("v1", "Sedan", "GASOLINE"), variant("v2", "SUV", "HEV"), variant("eliminated", "Pickup", "GASOLINE")] } as unknown as CatalogSnapshot;
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2"], memory: memory(), constraints: { activeHardConstraints: [], activeNonHardConstraints: [{ fieldId: "usageScenario", normalizedValue: "URBAN_DAILY" }], supersessionTrace: [], diagnostics: [] } as never, comparisonScope: false });
    expect(generated.unansweredDecisionFields).toEqual(expect.arrayContaining(["bodyStyle", "fuelType", "transmission", "budget"]));
    const body = generated.questionCandidates.find((candidate) => candidate.question.field === "bodyStyle")!;
    expect(body.question.options.map((option) => option.userFacingLabel)).toEqual(["Sedan", "SUV/crossover"]);
    expect(body.question.options.flatMap((option) => option.provenance.supportingCandidateIds)).not.toContain("eliminated");
    expect(assessRecommendationReadiness({ memory: memory(), candidateAvailability: "READY", candidateCount: 577, comparisonScope: false, ...generated })).toBe("NEEDS_MATERIAL_DISCRIMINATOR");
  });

  it("opens architecture before energy after usage is known", () => {
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants: [variant("v1", "Sedan", "GASOLINE"), variant("v2", "SUV", "HEV")] } as unknown as CatalogSnapshot;
    const constraints = { activeHardConstraints: [], activeNonHardConstraints: [{ fieldId: "usageScenario", normalizedValue: "URBAN_DAILY" }], supersessionTrace: [], diagnostics: [] } as never;
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2"], memory: memory(), constraints, comparisonScope: false });
    expect(generated.questionCandidates.find((candidate) => candidate.question.field === "bodyStyle")?.stage).toBe("VEHICLE_ARCHITECTURE");
    expect(generated.questionCandidates.find((candidate) => candidate.question.field === "fuelType")?.stage).toBe("ENERGY_FIT");
    expect(generated.questionCandidates.find((candidate) => candidate.question.field === "fuelType")?.eligible).toBe(false);
    expect(generated.stageCompletion.find((stage) => stage.stage === "VEHICLE_ARCHITECTURE")?.status).toBe("INCOMPLETE");
  });

  it("does not ask answered fields or single-valued facets", () => {
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants: [variant("v1", "Sedan", "GASOLINE"), variant("v2", "Sedan", "HEV")] } as unknown as CatalogSnapshot;
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2"], memory: memory({ materialQuestionHistory: [{ questionId: "q", stableSemanticKey: "discovery.fuelType", field: "fuelType", askedOnTurn: 1, answerStatus: "ANSWERED", answeredOnTurn: 2 }] }), constraints: { activeHardConstraints: [], activeNonHardConstraints: [], supersessionTrace: [], diagnostics: [] }, comparisonScope: false });
    expect(generated.questionCandidates.some((candidate) => candidate.question.field === "bodyStyle")).toBe(false);
    expect(generated.questionCandidates.some((candidate) => candidate.question.field === "fuelType")).toBe(false);
  });

  it("does not repeat a generic body question after explicit cargo architecture", () => {
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants: [variant("v1", "Panel Van", "GASOLINE"), variant("v2", "SUV", "HEV")] } as unknown as CatalogSnapshot;
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2"], memory: memory(), constraints: { activeHardConstraints: [{ fieldId: "usageArchitecture" }], activeNonHardConstraints: [], supersessionTrace: [], diagnostics: [] } as never, comparisonScope: false });
    expect(generated.questionCandidates.some((candidate) => candidate.question.field === "bodyStyle")).toBe(false);
  });

  it("asks commercial architecture without passenger body options after urban delivery intent", () => {
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants: [variant("v1", "Panel Van", "GASOLINE"), variant("v2", "Pickup", "HEV"), variant("v3", "Sedan", "GASOLINE")] } as unknown as CatalogSnapshot;
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2", "v3"], memory: memory(), constraints: { activeHardConstraints: [], activeNonHardConstraints: [{ fieldId: "usageScenario", normalizedValue: "URBAN_DELIVERY" }], supersessionTrace: [], diagnostics: [] } as never, comparisonScope: false });
    const architecture = generated.questionCandidates.find((candidate) => candidate.stage === "VEHICLE_ARCHITECTURE")!;
    expect(architecture.question.options.map((option) => option.semanticValue)).toEqual(["Panel Van", "Pickup"]);
    expect(architecture.question.options.map((option) => option.semanticValue)).not.toEqual(expect.arrayContaining(["Sedan", "SUV", "Hatchback"]));
  });

  it("skips already supplied body and energy while keeping the earlier missing usage context", () => {
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants: [variant("v1", "Hatchback", "HEV"), variant("v2", "Sedan", "GASOLINE")] } as unknown as CatalogSnapshot;
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2"], memory: memory(), constraints: { activeHardConstraints: [], activeNonHardConstraints: [{ fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "Hatchback" } }, { fieldId: "fuelType", normalizedValue: { operator: "EQUALS", value: "BEV" } }], supersessionTrace: [], diagnostics: [] } as never, comparisonScope: false });
    expect(generated.questionCandidates.find((candidate) => candidate.stage === "USAGE_CONTEXT")?.question.field).toBe("usageScenario");
    expect(generated.questionCandidates.some((candidate) => candidate.question.field === "bodyStyle" || candidate.question.field === "fuelType")).toBe(false);
    expect(generated.questionCandidates.some((candidate) => candidate.question.field === "transmission")).toBe(false);
  });

  it("keeps rough-road traction ahead of energy once architecture is answered", () => {
    const driven = (id: string, value: string, fuel: "GASOLINE" | "HEV") => ({ ...variant(id, "SUV", fuel), decisionFacts: { ...variant(id, "SUV", fuel).decisionFacts, powertrain: { ...variant(id, "SUV", fuel).decisionFacts.powertrain, drivenWheels: fact(value) } } });
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants: [driven("v1", "AWD", "GASOLINE"), driven("v2", "FWD", "HEV")] } as unknown as CatalogSnapshot;
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2"], memory: memory(), constraints: { activeHardConstraints: [], activeNonHardConstraints: [{ fieldId: "usageScenario", normalizedValue: "ROUGH_ROAD" }, { fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "SUV" } }], supersessionTrace: [], diagnostics: [] } as never, comparisonScope: false });
    expect(generated.questionCandidates.find((candidate) => candidate.question.field === "drivenWheels")?.stage).toBe("FUNCTIONAL_NEEDS");
    expect(generated.questionCandidates.find((candidate) => candidate.question.field === "fuelType")?.eligible).toBe(false);
  });

  it("prioritizes passenger architectures for passenger transport", () => {
    const snapshot = { authority: { catalogFingerprint: "catalog" }, variants: [variant("v1", "Passenger Van", "GASOLINE"), variant("v2", "MPV", "HEV"), variant("v3", "Sedan", "GASOLINE")] } as unknown as CatalogSnapshot;
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2", "v3"], memory: memory(), constraints: { activeHardConstraints: [], activeNonHardConstraints: [{ fieldId: "usageScenario", normalizedValue: "PASSENGER_TRANSPORT" }], supersessionTrace: [], diagnostics: [] } as never, comparisonScope: false });
    expect(generated.questionCandidates.find((candidate) => candidate.stage === "VEHICLE_ARCHITECTURE")?.question.options.map((option) => option.semanticValue)).toEqual(["MPV", "Passenger Van"]);
  });
});
