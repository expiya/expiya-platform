import { describe, expect, it } from "vitest";
import { projectActiveConstraints } from "../filter/constraintProjection";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";

const result = (messageId: string, acts: InterpretationResult["acts"] = [], extra: Partial<InterpretationResult> = {}): InterpretationResult => ({ schemaVersion: 1, messageId, acts, directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [], ...extra });
const model = (values: Readonly<Record<string, InterpretationResult>> = {}): StructuredInterpretationModel => ({ interpret: async ({ messageId }) => values[messageId] ?? result(messageId) });
const realizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };
const request = (conversationId: string, messageId: string, revision: number, userMessage: string) => ({ conversationId, messageId, idempotencyKey: messageId, expectedConversationRevision: revision, userMessage, requestTime: `2026-08-20T18:${String(revision).padStart(2, "0")}:00.000Z` });

async function runSequence(name: string, messages: readonly string[], interpretations: Readonly<Record<string, InterpretationResult>> = {}) {
  const store = new InMemoryV2ConversationStore(); const traces: Readonly<Record<string, unknown>>[] = []; const conversationId = `batch6-${name}`;
  const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model(interpretations), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) }); const outputs = [];
  for (let index = 0; index < messages.length; index += 1) outputs.push(await runCarsDecisionTurnV2(request(conversationId, `m${index + 1}`, index, messages[index]!), composition));
  return { memory: (await store.load(conversationId))!.memory!, outputs, traces };
}

const bodySequences = [
  ["SUV istiyorum.", "Fikrimi değiştirdim, sedan olsun.", "Artık hatchback istiyorum.", "Son kararım coupe olsun."],
  ["Sedan düşünüyorum.", "Düzeltme: SUV olsun.", "SUV'dan vazgeçtim, station wagon istiyorum.", "Son olarak sedan olsun."],
  ["Hatchback arıyorum.", "Artık sedan istiyorum.", "Düzelt, coupe olsun.", "Coupe değil SUV istiyorum."],
  ["Coupe olsun.", "Fikrimi değiştirdim, hatchback olsun.", "Şimdi sedan istiyorum.", "Son karar SUV."],
  ["Station wagon istiyorum.", "Artık SUV olsun.", "SUV değil sedan istiyorum.", "Son karar hatchback."],
  ["SUV olabilir.", "Sedana dönelim.", "Düzeltme: hatchback istiyorum.", "En son coupe olsun."],
  ["Sedan olsun.", "Artık coupe istiyorum.", "Coupe'den vazgeçtim, SUV olsun.", "Son karar station wagon."],
  ["Hatchback düşünüyorum.", "Fikrimi değiştirdim, SUV olsun.", "Şimdi coupe istiyorum.", "Son karar sedan."],
  ["Coupe arıyorum.", "Sedan olsun artık.", "Düzeltme: station wagon istiyorum.", "Son karar SUV."],
  ["SUV istiyorum.", "Şimdi hatchback olsun.", "Artık sedan istiyorum.", "Son karar coupe."],
] as const;
const bodyTerminal = ["Coupe", "Sedan", "SUV", "SUV", "Hatchback", "Coupe", "Station Wagon", "Sedan", "SUV", "Coupe"] as const;

const fuelSequences = [
  ["Benzinli istiyorum.", "Fikrimi değiştirdim, dizel olsun.", "Artık hibrit istiyorum.", "Son karar elektrikli."],
  ["Dizel düşünüyorum.", "Benzinliye dönelim.", "Şimdi elektrikli olsun.", "Son karar hibrit."],
  ["Hibrit istiyorum.", "Artık benzinli olsun.", "Düzeltme: dizel istiyorum.", "Son karar elektrikli."],
  ["Elektrikli olsun.", "Fikrimi değiştirdim, hibrit olsun.", "Şimdi dizel istiyorum.", "Son karar benzinli."],
  ["Benzinli bakıyorum.", "Elektrikli olsun artık.", "Elektrikliden vazgeçtim, hibrit istiyorum.", "Son karar dizel."],
  ["Dizel olsun.", "Şimdi hibrit istiyorum.", "Artık elektrikli olsun.", "Son karar benzinli."],
  ["Hibrit olabilir.", "Dizele dönelim.", "Düzeltme: benzinli.", "Son karar elektrikli."],
  ["Elektrikli istiyorum.", "Benzinli olsun.", "Şimdi hibrit istiyorum.", "Son karar dizel."],
  ["Benzinli olsun.", "Dizel istiyorum artık.", "Yakıt fark etmez.", "Son karar hibrit."],
  ["Dizel düşünüyorum.", "Elektrikli olsun.", "Artık benzinli istiyorum.", "Son karar hibrit."],
] as const;
const fuelTerminal = ["BEV", "MHEV", "BEV", "GASOLINE", "DIESEL", "GASOLINE", "BEV", "DIESEL", "MHEV", "MHEV"] as const;

const transmissionSequences = [
  ["Otomatik istiyorum.", "Fikrimi değiştirdim, manuel olsun.", "Tekrar otomatik istiyorum.", "Son karar manuel."],
  ["Manuel olsun.", "Artık otomatik istiyorum.", "Manuele dönelim.", "Son karar otomatik."],
  ["Otomatik bakıyorum.", "Düzeltme: manuel.", "Şimdi otomatik olsun.", "Son karar manuel."],
  ["Manuel istiyorum.", "Otomatik olsun artık.", "Fikrimi değiştirdim, manuel.", "Son karar otomatik."],
  ["Otomatik olsun.", "Manuel istiyorum.", "Artık otomatik olsun.", "Otomatik tercihim devam ediyor."],
  ["Manuel olabilir.", "Otomatiğe dönelim.", "Düzeltme: manuel olsun.", "Son karar otomatik."],
  ["Otomatik istiyorum.", "Şimdi manuel olsun.", "Artık otomatik istiyorum.", "Son karar manuel."],
  ["Manuel düşünüyorum.", "Fikrimi değiştirdim, otomatik.", "Manuel olsun artık.", "Son karar otomatik."],
  ["Otomatik olsun.", "Manuele dönelim.", "Tekrar otomatik istiyorum.", "Son karar manuel."],
  ["Manuel istiyorum.", "Şimdi otomatik olsun.", "Artık manuel istiyorum.", "Son karar otomatik."],
] as const;
const transmissionTerminal = ["MANUAL", "AUTOMATIC", "MANUAL", "AUTOMATIC", "AUTOMATIC", "AUTOMATIC", "MANUAL", "AUTOMATIC", "MANUAL", "AUTOMATIC"] as const;

const mixedSequences = Array.from({ length: 20 }, (_, index) => ({
  name: `mixed-${index + 1}`,
  messages: index % 2 === 0
    ? ["SUV ve benzinli istiyorum.", "Fikrimi değiştirdim, sedan ve hibrit olsun.", "Şimdi otomatik hatchback istiyorum.", "Son karar elektrikli SUV ve otomatik."]
    : ["Manuel dizel sedan istiyorum.", "Artık otomatik benzinli SUV olsun.", "Düzeltme: hibrit hatchback istiyorum.", "Son karar otomatik elektrikli sedan."],
  terminal: index % 2 === 0 ? { bodyStyle: "SUV", fuelType: "BEV", transmission: "AUTOMATIC" } : { bodyStyle: "Sedan", fuelType: "BEV", transmission: "AUTOMATIC" },
}));

const budgetSequences = Array.from({ length: 15 }, (_, index) => {
  const start = 2 + index * 0.1; const middle = start + 1; const end = middle + 1;
  return { name: `budget-${index + 1}`, messages: [`Bütçe tavanım ${start.toFixed(1).replace(".", ",")} milyon.`, `Fikrimi değiştirdim, en fazla ${middle.toFixed(1).replace(".", ",")} milyon verebilirim.`, `Son bütçe tavanım ${end.toFixed(1).replace(".", ",")} milyon.`], expected: Math.round(end * 1_000_000) };
});

const socialReturns = Array.from({ length: 15 }, (_, index) => ({ name: `social-return-${index + 1}`, messages: ["SUV istiyorum.", index % 2 ? "Nasılsın, işler nasıl?" : "Biraz heyecanlandım, ilk arabam olacak 😄", "Fikrimi değiştirdim, sedan olsun."] }));
const offTopicReturns = Array.from({ length: 10 }, (_, index) => ({ name: `off-return-${index + 1}`, messages: ["Hibrit istiyorum.", index % 2 ? "Bana makarna tarifi ver." : "Bugünkü hava nasıl?", "Neyse arabaya dönelim, elektrikli olsun."] }));
const angryCorrections = [
  ["SUV istiyorum.", "Salak mısın, SUV değil sedan dedim.", "bodyStyle", "Sedan"], ["Benzinli istiyorum.", "Aptal gibi davranma, dizel olsun dedim.", "fuelType", "DIESEL"], ["Manuel istiyorum.", "Gerizekalı mısın, otomatik dedim.", "transmission", "AUTOMATIC"], ["Sedan istiyorum.", "Mal mısın, hatchback olsun dedim.", "bodyStyle", "Hatchback"], ["Dizel istiyorum.", "Lanet olsun, hibrit istiyorum artık.", "fuelType", "MHEV"],
  ["Otomatik istiyorum.", "Salakça cevap verme, manuel olsun.", "transmission", "MANUAL"], ["Hatchback istiyorum.", "Aptal sistem, SUV olsun dedim.", "bodyStyle", "SUV"], ["Elektrikli istiyorum.", "Gerizekâlı gibi davranma, benzinli olsun.", "fuelType", "GASOLINE"], ["SUV istiyorum.", "Mal mısın kardeşim, coupe istiyorum.", "bodyStyle", "Coupe"], ["Manuel istiyorum.", "Lanet cevap, otomatik olsun artık.", "transmission", "AUTOMATIC"],
] as const;

function activeValue(memory: Awaited<ReturnType<typeof runSequence>>["memory"], field: string): string {
  const projection = projectActiveConstraints(memory.events.filter((event) => event.eventType === "CONSTRAINT")); const event = [...projection.activeHardConstraints, ...projection.activeNonHardConstraints].find((item) => item.fieldId === field); return JSON.stringify(event && "normalizedValue" in event ? event.normalizedValue : event ? { operator: event.operator, value: event.value } : undefined);
}

describe("V2 sixth batch of one hundred frequent-decision-change conversations", () => {
  it("contains exactly one hundred multi-turn scenarios", () => expect(bodySequences.length + fuelSequences.length + transmissionSequences.length + mixedSequences.length + budgetSequences.length + socialReturns.length + offTopicReturns.length + angryCorrections.length).toBe(100));

  it.each(bodySequences.map((messages, index) => ({ name: `body-${index + 1}`, messages, expected: bodyTerminal[index]! })))("$name", async ({ name, messages, expected }) => { const run = await runSequence(name, messages); expect(activeValue(run.memory, "bodyStyle")).toContain(expected); expect(run.memory.events.filter((event) => event.eventType === "CONSTRAINT" && event.field === "bodyStyle")).toHaveLength(4); expect(run.outputs.every((output) => output.cards.length === 0 && output.message.trim() !== "")).toBe(true); });
  it.each(fuelSequences.map((messages, index) => ({ name: `fuel-${index + 1}`, messages, expected: fuelTerminal[index]! })))("$name", async ({ name, messages, expected }) => { const run = await runSequence(name, messages); expect(activeValue(run.memory, "fuelType")).toContain(expected); expect(run.memory.events.filter((event) => event.eventType === "CONSTRAINT" && event.field === "fuelType").length).toBeGreaterThanOrEqual(3); });
  it.each(transmissionSequences.map((messages, index) => ({ name: `transmission-${index + 1}`, messages, expected: transmissionTerminal[index]! })))("$name", async ({ name, messages, expected }) => { const run = await runSequence(name, messages); expect(activeValue(run.memory, "transmission")).toContain(expected); expect(run.memory.events.filter((event) => event.eventType === "CONSTRAINT" && event.field === "transmission")).toHaveLength(4); });
  it.each(mixedSequences)("$name", async ({ name, messages, terminal }) => { const run = await runSequence(name, messages); for (const [field, value] of Object.entries(terminal)) expect(activeValue(run.memory, field)).toContain(value); expect(run.outputs.at(-1)?.message.trim()).not.toBe(""); });
  it.each(budgetSequences)("$name", async ({ name, messages, expected }) => { const run = await runSequence(name, messages); expect(run.memory.budget.maximumHardCeiling?.amount).toBe(expected); expect(run.memory.events.filter((event) => event.eventType === "BUDGET_MUTATION" && "field" in event && event.field === "MAXIMUM_HARD_CEILING")).toHaveLength(3); });
  it.each(socialReturns)("$name", async ({ name, messages }) => { const interpretations = { m2: result("m2", ["SOCIAL_MESSAGE"], { socialSignal: { kind: "GENERAL" } }) }; const run = await runSequence(name, messages, interpretations); expect(activeValue(run.memory, "bodyStyle")).toContain("Sedan"); expect(run.outputs[1]?.message.trim()).not.toBe(""); expect(run.outputs[1]?.state).not.toBe("LIMITED_OR_ENDED"); expect(run.outputs[2]?.state).not.toBe("SOCIAL"); });
  it.each(offTopicReturns)("$name", async ({ name, messages }) => { const interpretations = { m2: result("m2", ["OFF_TOPIC"], { offTopicSignal: { detected: true } }) }; const run = await runSequence(name, messages, interpretations); expect(run.outputs[1]?.state).toBe("OFF_TOPIC_RECOVERY"); expect(activeValue(run.memory, "fuelType")).toContain("BEV"); expect(run.memory.offTopicState.consecutiveOffTopicTurns).toBe(0); });
  it.each(angryCorrections)("angry correction: %s", async (first, second, field, expected) => { const run = await runSequence(`angry-${angryCorrections.findIndex((item) => item[1] === second)}`, [first, second]); const active = activeValue(run.memory, field); expect(active, JSON.stringify(run.memory.events.filter((event) => event.eventType === "CONSTRAINT"))).toContain(expected); expect(run.outputs[1]?.state).not.toBe("LIMITED_OR_ENDED"); expect(run.memory.abuseState.strikeCount).toBe(1); });
});
