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
    const generated = generateMaterialQuestionCandidates({ snapshot, candidateIds: ["v1", "v2"], memory: memory(), constraints: { activeHardConstraints: [], activeNonHardConstraints: [], supersessionTrace: [], diagnostics: [] }, comparisonScope: false });
    expect(generated.unansweredDecisionFields).toEqual(expect.arrayContaining(["bodyStyle", "fuelType", "transmission", "budget"]));
    const body = generated.questionCandidates.find((candidate) => candidate.question.field === "bodyStyle")!;
    expect(body.question.options.map((option) => option.userFacingLabel)).toEqual(["Sedan", "SUV/crossover"]);
    expect(body.question.options.flatMap((option) => option.provenance.supportingCandidateIds)).not.toContain("eliminated");
    expect(assessRecommendationReadiness({ memory: memory(), candidateAvailability: "READY", candidateCount: 577, comparisonScope: false, ...generated })).toBe("NEEDS_MATERIAL_DISCRIMINATOR");
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
});
