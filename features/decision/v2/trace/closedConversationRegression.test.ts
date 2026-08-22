import { describe, expect, it } from "vitest";

import { createCarsDecisionV2ProductionComposition } from "../composition/production.server";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { materialQuestionText } from "../realization/materialQuestionText";
import type { NaturalRealizationModel } from "../realization/types";

const BASE = ["pick up araç arıyorum.", "Yük taşıma", "Pickup", "Otomatik", "2 milyonum var."] as const;
const interpreter: StructuredInterpretationModel = { interpret: async (request): Promise<InterpretationResult> => ({ schemaVersion: 1, messageId: request.messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] }) };
const realizer: NaturalRealizationModel = { realize: async (request) => ({ message: request.materialQuestion ? materialQuestionText(request.materialQuestion) : "Karar yeniden hesaplandı.", usedExplanationFactIds: [], mentionedCandidateIds: [], ...(request.materialQuestion ? { renderedQuestionId: request.materialQuestion.id } : {}) }) };

async function replay(conversationId: string, messages: readonly string[], interpretationModel: StructuredInterpretationModel = interpreter) {
  const store = new InMemoryV2ConversationStore();
  const traces: Record<string, unknown>[] = [];
  const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: interpretationModel, realizer, shadow: true, smokeObserver: (trace) => { if (trace.phase === "DECISION") traces.push({ ...trace }); } });
  const outputs = [];
  for (let index = 0; index < messages.length; index += 1) outputs.push(await runCarsDecisionTurnV2({ conversationId, messageId: `${conversationId}-${index}`, idempotencyKey: `${conversationId}-${index}`, expectedConversationRevision: index, userMessage: messages[index]!, requestTime: `2026-08-21T12:${String(index).padStart(2, "0")}:00.000Z` }, composition));
  return { traces, outputs, memory: (await store.load(conversationId))!.memory!, events: await store.getEvents(conversationId) };
}

describe("closed conversation affordability and trace contract", () => {
  it("answers charging duration directly and retains the material discovery path", async () => {
    const result = await replay("charging-duration-detour", [
      "Elektrikli bir araç düşünüyorum; bataryayı doldurmak ne kadar sürüyor?",
    ]);
    expect(result.outputs[0]!.message).toMatch(/Tek bir şarj süresi yoktur[\s\S]*20–40 dakikalık/iu);
    expect(result.outputs[0]!.message).not.toMatch(/neyi kastettiğinden emin olamadım/iu);
    expect(result.outputs[0]!.cards).toEqual([]);
  }, 30_000);
  it("keeps greeting, purchase intent, recommendation follow-up, and a neutral continuation in separate authority lanes", async () => {
    const result = await replay("social-to-recommendation", [
      "Merhabalar.",
      "Yeni bir otomobil almak istiyorum; yaklaşık 2 milyon TL bütçem var, seçenek önerir misin?",
      "Olur, bir araç öner.",
      "Bu çizgide ilerleyelim.",
    ]);
    expect(result.traces[0]).toMatchObject({ interpretedActs: ["GREETING"], action: "SOCIAL_REPLY", offerCreated: false });
    expect(result.events.filter((event) => event.sourceTurn === 1).map((event) => event.eventType)).not.toContain("VEHICLE_INTENT_ESTABLISHED");
    expect(result.memory.budget.preferredBudget?.amount).toBe(2_000_000);
    expect(result.traces[1]).toMatchObject({ action: "REQUEST_REVEAL_CONSENT", offerCreated: false });
    expect(result.traces[2]).toMatchObject({ action: "REQUEST_REVEAL_CONSENT", offerCreated: false });
    expect(result.events.filter((event) => event.sourceTurn === 4).map((event) => event.eventType)).toEqual(["TURN_RECORDED"]);
    expect(result.outputs.every((output) => output.cards.length === 0)).toBe(true);
  }, 30_000);
  it("recomputes an exact-model scope when the user asks to show another brand", async () => {
    const result = await replay("post-card-model-switch", [
      "Uzun yol için elektrikli SUV arıyorum. Bütçem 10 milyon TL, BYD SEAL U EV istiyorum.",
      "Tesla göster",
    ]);
    const finalCandidates = result.traces.at(-1)!.rankingCandidates as readonly { brand: string }[];
    expect(finalCandidates.length).toBeGreaterThan(0);
    expect(finalCandidates.every((candidate) => candidate.brand === "Tesla")).toBe(true);
    expect(result.memory.modelReferences.at(-1)).toMatchObject({ rawText: "Tesla", decisionEffect: "PREFERENCE" });
  }, 30_000);
  it("answers a rural electric-pickup question without asking what village means", async () => {
    const message = "Elektrikli araçlar günümüzde çok fazla kullanılıyor. Ben köyde yaşıyorum. Yeni bir araç almak istiyorum. Pickup alacağım. Sence köyde elektrikli araç kullanmak mümkün mü? Özellikle pickup araçlarda elektrikli motor önerir misin?";
    const ambiguousProvider: StructuredInterpretationModel = { interpret: async (request): Promise<InterpretationResult> => ({ schemaVersion: 1, messageId: request.messageId, acts: ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [{ code: "UNKNOWN_DECISION_PHRASE", sourceSpan: "köyde" }] }) };
    const result = await replay("rural-electric-pickup", [message], ambiguousProvider);
    expect(result.traces[0]!.activeConstraints).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: "usageScenario", normalizedValue: "ROUGH_ROAD" }),
      expect.objectContaining({ fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "Pickup" } }),
      expect.objectContaining({ fieldId: "fuelType", normalizedValue: { operator: "EQUALS", value: "BEV" } }),
    ]));
    expect(result.outputs[0]!.message).toMatch(/Arazi veya kırsal kullanımda elektrikli araç mantıklı olabilir[\s\S]*yerden yükseklik[\s\S]*şarj[\s\S]*koşulsuz önermem/iu);
    expect(result.outputs[0]!.message).not.toMatch(/köyde.*neyi kastettiğinden emin olamadım/iu);
  }, 30_000);
  it("understands body aliases on the first turn and blocks an unaffordable automatic pickup offer", async () => {
    const result = await replay("pickup-budget-conflict", BASE);
    expect(result.traces[0]!.activeConstraints).toContainEqual(expect.objectContaining({ fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "Pickup" } }));
    const final = result.traces.at(-1)!;
    expect(final).toMatchObject({ action: "ASK_MATERIAL_QUESTION", offerCreated: false });
    expect(final.selectedQuestionKey).toBe("affordabilityConflict.2000000.transmission=AUTOMATIC&bodyStyle=Pickup");
    expect(result.outputs.at(-1)!.cards).toEqual([]);
    expect(result.outputs.at(-1)!.message).toMatch(/Otomatik Pickup tercihini 2\.000\.000 TL bütçe içinde karşılayan bir seçenek bulamadım[\s\S]*Bütçe artırılabilir mi[\s\S]*şanzıman[\s\S]*Gövde tipi/iu);
  }, 30_000);

  it("recomputes the pool after budget, transmission, and body-style relaxations", async () => {
    const raised = await replay("pickup-budget-raised", [...BASE, "Bütçemi 5 milyon TL yapabilirim."]);
    expect(raised.memory.budget.preferredBudget?.amount).toBe(5_000_000);
    expect(String(raised.traces.at(-1)!.selectedQuestionKey ?? "")).not.toMatch(/^affordabilityConflict\.2000000/u);
    const manual = await replay("pickup-manual-relaxed", [...BASE, "Otomatik yerine manuel düşünülebilir."]);
    expect(manual.traces.at(-1)!.activeConstraints).toContainEqual(expect.objectContaining({ fieldId: "transmission", normalizedValue: { operator: "EQUALS", value: "MANUAL" } }));
    expect(manual.traces.at(-1)!.activeConstraints).not.toContainEqual(expect.objectContaining({ fieldId: "transmission", normalizedValue: { operator: "EQUALS", value: "AUTOMATIC" } }));
    const enclosed = await replay("pickup-body-relaxed", [...BASE, "Pickup yerine kapalı kasa ticari düşünülebilir."]);
    expect(enclosed.traces.at(-1)!.activeConstraints).toContainEqual(expect.objectContaining({ fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "Panel Van" } }));
    expect(enclosed.traces.at(-1)!.activeConstraints).not.toContainEqual(expect.objectContaining({ fieldId: "bodyStyle", normalizedValue: expect.objectContaining({ value: "Pickup" }) }));
  }, 60_000);

  it("does not bind an unqualified short confirmation to a trade-off", async () => {
    const result = await replay("pickup-unbound-confirmation", [...BASE, "tamam."]);
    const final = result.traces.at(-1)!;
    expect(final).toMatchObject({ action: "ANSWER_DIRECTLY", offerCreated: false, selectedQuestionKey: null });
    expect(result.outputs.at(-1)!.message).toMatch(/“tamam\.” derken neyi kastettiğinden emin olamadım/iu);
  }, 30_000);
});
