import { describe, expect, it } from "vitest";
import { assessCandidateFactMateriality, choiceSubmissionText, consumerQuestionIsSafe, consumerQuestionText, defineXpyQuestionPack, selectHighestMaterialQuestion, validateChoiceSubmission } from "./questionGuidance";

describe("XPY bounded question contract", () => {
  const pack = defineXpyQuestionPack({ packId: "test/v1", questions: {
    next: { questionKey: "next", selectionMode: "SINGLE", source: "DOMAIN_PACK", options: [{ value: "A", label: "A" }, { value: "UNKNOWN", label: "Emin değilim", exclusive: true }] },
  } });

  it("selects exactly one answerable axis with the highest material value", () => {
    expect(selectHighestMaterialQuestion([
      { stableKey: "low", answerable: true, materialDecisionValue: 2, question: "low" },
      { stableKey: "blocked", answerable: false, materialDecisionValue: 99, question: "blocked" },
      { stableKey: "high", answerable: true, materialDecisionValue: 8, question: "high" },
    ])).toBe("high");
  });

  it.each(["CARS", "APPLIANCES", "ELECTRONICS"])("applies the same candidate-split gate to %s", () => {
    const candidates = [
      { candidateId: "a", facts: { universal: true, discriminator: 1 } },
      { candidateId: "b", facts: { universal: true, discriminator: 2 } },
      { candidateId: "c", facts: { universal: true } },
    ];
    expect(assessCandidateFactMateriality(candidates, ["universal"])).toMatchObject({ material: false, reason: "UNIVERSAL_VALUE" });
    expect(assessCandidateFactMateriality(candidates, ["discriminator"])).toMatchObject({ material: true, reason: "CANDIDATE_SPLIT", impact: 2 });
    expect(assessCandidateFactMateriality(candidates, ["missing"])).toMatchObject({ material: false, reason: "NO_GOVERNED_EVIDENCE" });
  });

  it("does not pretend predominantly unknown evidence distinguishes candidates", () => {
    expect(assessCandidateFactMateriality([
      { candidateId: "a", facts: { battery: 6000 } },
      { candidateId: "b", facts: {} },
      { candidateId: "c", facts: {} },
    ], ["battery"])).toMatchObject({ material: false, reason: "PREDOMINANTLY_UNKNOWN" });
  });

  it("accepts only the pending pack-owned value", () => {
    expect(validateChoiceSubmission(pack, "next", { questionKey: "next", values: ["A"] })).toBe(true);
    expect(validateChoiceSubmission(pack, "other", { questionKey: "next", values: ["A"] })).toBe(false);
    expect(validateChoiceSubmission(pack, "next", { questionKey: "next", values: ["CARS_ONLY"] })).toBe(false);
  });

  it("derives the interpreter input from validated values instead of client display text", () => {
    expect(choiceSubmissionText({ questionKey: "next", values: ["A", "B"] })).toBe("A ve B");
  });

  it("blocks schema/meta and multi-question planner copy in favor of a vetted pack prompt", () => {
    expect(consumerQuestionIsSafe("İhtiyacını kategoriye ait ölçü veya zorunlu işlevlerle biraz açar mısın?")).toBe(false);
    expect(consumerQuestionIsSafe("Alan ve parametreleri söyler misin?")).toBe(false);
    expect(consumerQuestionIsSafe("Hangisi? Neden?")).toBe(false);
    expect(consumerQuestionText("Aday constraint nedir?", { ...pack.questions.next, prompt: "Günlük kullanımda hangisi önemli?" })).toBe("Günlük kullanımda hangisi önemli?");
  });
});
