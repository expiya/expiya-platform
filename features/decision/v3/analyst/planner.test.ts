import { describe, expect, it } from "vitest";
import type { PreferenceEvent } from "../types";
import { planDeterministicQuestion, type MaterialQuestion, type QuestionPlanningInput } from "./planner";

const preference = (concept: string, normalizedValue: string | number, field = concept): PreferenceEvent => ({ id: concept, sourceMessageId: "m", sourceTurn: 1, sourceSpan: { start: 0, end: 1, text: "x" }, concept, field, normalizedValue, strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER", confidence: 1, authority: "USER_EXPLICIT", confirmationRequired: false });
const question = (key: string, concept: string, partitions: readonly { value: string; candidateIds: readonly string[] }[]): MaterialQuestion => ({ key, concept, kind: "MATERIAL_DECISION_QUESTION", text: key, partitions, reliability: 1 });
const base = (questions: readonly MaterialQuestion[], preferences: readonly PreferenceEvent[] = []): QuestionPlanningInput => ({ activePreferences: preferences, analystFacts: [], analystHypotheses: [], candidateSnapshot: { candidateIds: ["a", "b", "c", "d"] }, catalogCapabilities: { reliableConcepts: questions.map((item) => item.concept), questions }, askedQuestionKeys: [], answeredConcepts: [], rejectedConcepts: [], conversationTurn: 1, questionFatigue: 0 });
describe("deterministic material question planner", () => {
  it("selects a reliable balanced split", () => {
    const result = planDeterministicQuestion(base([question("body", "bodyStyleReference", [{ value: "SUV", candidateIds: ["a", "b"] }, { value: "CAR", candidateIds: ["c", "d"] }])], [preference("primaryUsage", "FAMILY", "usagePurpose")]));
    expect(result.selectedQuestion?.key).toBe("body"); expect(result.evaluatedCandidates[0]).toMatchObject({ candidateReductionValue: 1, disposition: "SELECTED" });
  });
  it("suppresses transmission after BEV even when analyst hypothesis is relevant", () => {
    const q = question("transmission", "transmissionPreference", [{ value: "AUTO", candidateIds: ["a", "b"] }, { value: "MANUAL", candidateIds: ["c", "d"] }]); const input = base([q], [preference("fuelType", "BEV")]);
    const result = planDeterministicQuestion({ ...input, analystHypotheses: [{ concept: "transmissionPreference", proposedValue: "AUTOMATIC", sourceSpans: [{ start: 0, end: 1, text: "x" }], confidence: 0.99, decisionUse: "QUESTION_INPUT", reasonCode: "AMBIGUOUS_DAILY_LANGUAGE", confirmationRequired: true, governance: "ACCEPTED_QUESTION_INPUT" }] });
    expect(result.selectedQuestion).toBeUndefined(); expect(result.evaluatedCandidates[0]?.reasonCodes).toContain("CAPABILITY_DEPENDENCY_BLOCKED");
  });
  it.each([["bodyStyle", "SUV", "bodyStyleReference", "body"], ["minimumSeats", 7, "passengerCapacity", "seats"]] as const)("suppresses an already resolved concept: %s", (activeConcept, value, questionConcept, key) => {
    const q = question(key, questionConcept, [{ value: "A", candidateIds: ["a", "b"] }, { value: "B", candidateIds: ["c", "d"] }]); const result = planDeterministicQuestion(base([q], [preference(activeConcept, value)]));
    expect(result.selectedQuestion).toBeUndefined(); expect(result.evaluatedCandidates[0]?.reasonCodes).toContain("CAPABILITY_DEPENDENCY_BLOCKED");
  });
  it("suppresses questions whose answers cannot reduce candidates", () => {
    const result = planDeterministicQuestion(base([question("auto", "transmissionPreference", [{ value: "AUTO", candidateIds: ["a", "b", "c", "d"] }])]));
    expect(result.selectedQuestion).toBeUndefined(); expect(result.evaluatedCandidates[0]?.reasonCodes).toContain("ZERO_CANDIDATE_REDUCTION");
  });
  it("does not interpret unknown equipment as absence", () => {
    const result = planDeterministicQuestion(base([question("camera", "equipmentRequirement", [{ value: "VERIFIED_PRESENT", candidateIds: ["a", "b"] }])]));
    expect(result.selectedQuestion).toBeUndefined(); expect(result.evaluatedCandidates[0]?.candidateReductionValue).toBe(0);
  });
  it("rejects partitions containing candidates outside the active universe", () => {
    const result = planDeterministicQuestion(base([question("body", "bodyStyleReference", [{ value: "SUV", candidateIds: ["a", "external"] }, { value: "CAR", candidateIds: ["b", "c"] }])], [preference("primaryUsage", "FAMILY", "usagePurpose")]));
    expect(result.selectedQuestion).toBeUndefined(); expect(result.evaluatedCandidates[0]?.reasonCodes).toContain("ZERO_CANDIDATE_REDUCTION");
  });
  it("rejects overlapping answer partitions instead of counting unknown as absence", () => {
    const result = planDeterministicQuestion(base([question("equipment", "equipmentRequirement", [{ value: "YES", candidateIds: ["a", "b"] }, { value: "NO", candidateIds: ["b", "c", "d"] }])], [preference("primaryUsage", "FAMILY", "usagePurpose")]));
    expect(result.selectedQuestion).toBeUndefined(); expect(result.evaluatedCandidates[0]?.candidateReductionValue).toBe(0);
  });
  it("does not repeat a question after it was asked or rejected", () => {
    const q = question("fuel", "fuelPreference", [{ value: "BEV", candidateIds: ["a", "b"] }, { value: "ICE", candidateIds: ["c", "d"] }]);
    expect(planDeterministicQuestion({ ...base([q]), askedQuestionKeys: ["fuel"] }).selectedQuestion).toBeUndefined();
    expect(planDeterministicQuestion({ ...base([q]), rejectedConcepts: ["fuelPreference"] }).selectedQuestion).toBeUndefined();
  });
  it("suppresses hard-filter questions without reliable catalog capability", () => {
    const q = { ...question("fuel", "fuelPreference", [{ value: "BEV", candidateIds: ["a", "b"] }, { value: "ICE", candidateIds: ["c", "d"] }]), reliability: 0 };
    const result = planDeterministicQuestion(base([q])); expect(result.selectedQuestion).toBeUndefined(); expect(result.evaluatedCandidates[0]?.reasonCodes).toContain("CATALOG_RELIABILITY_UNAVAILABLE");
  });
  it("suppresses material questions for social turns without any semantic or preference signal", () => {
    const q = question("body", "bodyStyleReference", [{ value: "SUV", candidateIds: ["a", "b"] }, { value: "CAR", candidateIds: ["c", "d"] }]); const result = planDeterministicQuestion(base([q]));
    expect(result.selectedQuestion).toBeUndefined(); expect(result.evaluatedCandidates[0]?.reasonCodes).toContain("NO_SEMANTIC_RELEVANCE");
  });
});
