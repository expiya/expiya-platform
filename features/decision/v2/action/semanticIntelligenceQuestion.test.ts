import { describe, expect, it } from "vitest";
import type { CatalogSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { AutomotiveSemanticResult } from "../semantic-intelligence";
import { materialQuestionText } from "../realization/materialQuestionText";
import { createAutomotiveSemanticClarificationQuestion } from "./semanticIntelligenceQuestion";

const semantics: AutomotiveSemanticResult = { schemaVersion: "ASIL-0.1", messageId: "m1", concepts: [], archetypes: [], analogies: [], qualitativeNeeds: [], ambiguities: [{ code: "REFERENCE_ATTRIBUTE_UNCLEAR", sourceSpan: "Vito tarzı", clarificationCandidates: ["Yolcu taşıma", "Yük taşıma", "Karma kullanım"] }], candidateInterpretations: [], requestedFacts: [], conversationalAct: "VEHICLE_DISCOVERY", providerStatus: "AVAILABLE" };

describe("ASIL material clarification question", () => {
  it("turns bounded semantic alternatives into a decision-neutral public question", () => {
    const candidate = createAutomotiveSemanticClarificationQuestion({ semantics, memory: { turn: 2, decisionFingerprint: "sha256:decision" } as ConversationMemory, snapshot: { authority: { catalogFingerprint: "sha256:catalog" } } as CatalogSnapshot, candidateIds: ["v2", "v1", "v1"] });
    expect(candidate?.question).toMatchObject({ field: "semanticMeaning", promptIntent: "CONFIRM_INTERPRETATION", selectionMode: "SINGLE" });
    expect(candidate?.question.options.map((option) => option.userFacingLabel)).toEqual(["Düzenli yolcu taşıma ve çok koltuklu kullanım", "Yük ve eşya taşıma odaklı ticari kullanım", "Yolcu ve yükü birlikte taşıyan karma kullanım"]);
    expect(candidate?.question.options.every((option) => option.provenance.source === "SEMANTIC_INTERPRETATION")).toBe(true);
    expect(candidate?.compatibleCandidateIds).toEqual(["v1", "v2"]);
    expect(materialQuestionText(candidate!.question)).toMatch(/hangisini kastediyorsun/iu);
  });

  it("does not invent a question without at least two bounded meanings", () => {
    expect(createAutomotiveSemanticClarificationQuestion({ semantics: { ...semantics, ambiguities: [] }, memory: { turn: 0, decisionFingerprint: "sha256:d" } as ConversationMemory, snapshot: {} as CatalogSnapshot, candidateIds: [] })).toBeNull();
  });

  it("does not render provider-outage fallback guidance as selectable meanings", () => {
    expect(createAutomotiveSemanticClarificationQuestion({ semantics: { ...semantics, providerStatus: "BOUNDED_FALLBACK" }, memory: { turn: 0, decisionFingerprint: "sha256:d" } as ConversationMemory, snapshot: {} as CatalogSnapshot, candidateIds: [] })).toBeNull();
  });

  it("does not repeat a semantic question that the user already closed", () => {
    const memory = { turn: 3, decisionFingerprint: "sha256:d", materialQuestionHistory: [{ stableSemanticKey: "semanticIntelligence.REFERENCE_ATTRIBUTE_UNCLEAR", answerStatus: "ANSWERED" }] } as unknown as ConversationMemory;
    expect(createAutomotiveSemanticClarificationQuestion({ semantics, memory, snapshot: {} as CatalogSnapshot, candidateIds: [] })).toBeNull();
  });

  it("translates provider segment jargon into self-contained Turkish choices", () => {
    const jargon = { ...semantics, ambiguities: [{ code: "SMALL_VEHICLE_MEANING", sourceSpan: "küçük", clarificationCandidates: ["A-segment city car", "B-segment small hatchback", "Any compact urban hatchback regardless of exact segment", "two-person micro car"] }] };
    const candidate = createAutomotiveSemanticClarificationQuestion({ semantics: jargon, memory: { turn: 1, decisionFingerprint: "sha256:d" } as ConversationMemory, snapshot: {} as CatalogSnapshot, candidateIds: ["v1"] });
    expect(candidate?.question.options.map((option) => option.userFacingLabel)).toEqual([
      "Şehir içinde kolay kullanılan, en küçük otomobil sınıfı",
      "Clio veya Polo boyutlarında küçük otomobil",
      "Kesin sınıfı önemli olmayan, şehirde kullanışlı küçük otomobil",
      "Çoğunlukla iki kişilik, çok küçük şehir aracı",
    ]);
    expect(candidate?.question.options.map((option) => option.userFacingLabel).join(" ")).not.toMatch(/segment|city car|hatchback|micro car/iu);
  });

  it("does not ask equipment sub-type questions that the catalog cannot evaluate", () => {
    const climate = { ...semantics, ambiguities: [{ code: "AIR_CONDITIONING_TYPE", sourceSpan: "klimalı", clarificationCandidates: ["Basic air conditioning may be intended.", "Automatic climate control may be intended.", "Multi-zone climate control may be intended."] }] };
    expect(createAutomotiveSemanticClarificationQuestion({ semantics: climate, memory: { turn: 1, decisionFingerprint: "sha256:d" } as ConversationMemory, snapshot: {} as CatalogSnapshot, candidateIds: ["v1"] })).toBeNull();
  });
});
