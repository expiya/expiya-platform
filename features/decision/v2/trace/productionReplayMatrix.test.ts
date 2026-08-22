import { describe, expect, it } from "vitest";

import { createCarsDecisionV2ProductionComposition } from "../composition/production.server";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import type { NaturalRealizationModel } from "../realization/types";
import { replaySyntheticConversation, type SyntheticReplayScenario } from "./conversationReplay";
import { evaluateConversationDeploymentGate } from "./deploymentGate";

const emptyInterpretation = (messageId: string): InterpretationResult => ({
  schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [],
});
const interpreter: StructuredInterpretationModel = { interpret: async (request) => emptyInterpretation(request.messageId) };
const realizer: NaturalRealizationModel = { realize: async (request) => ({ message: request.materialQuestion ? `Kontrollü soru: ${request.materialQuestion.stableSemanticKey}` : "Kontrollü sentetik yanıt", usedExplanationFactIds: [], mentionedCandidateIds: [], ...(request.materialQuestion ? { renderedQuestionId: request.materialQuestion.id } : {}) }) };

const scenarios: readonly SyntheticReplayScenario[] = [
  {
    scenarioId: "toyota-sedan-hev-automatic",
    turns: [
      { messageId: "intent", text: "Merhaba, Toyota almak istiyorum." },
      { messageId: "usage", text: "Günlük şehir içi" },
      { messageId: "body", text: "Sedan" },
      { messageId: "fuel", text: "Tam hibrit" },
      { messageId: "transmission", text: "Otomatik" },
      { messageId: "budget", text: "3 milyon" },
    ],
  },
  {
    scenarioId: "electric-hatchback-no-budget",
    turns: [
      { messageId: "intent", text: "Elektrikli bir otomobil almak istiyorum." },
      { messageId: "usage", text: "Günlük şehir içi" },
      { messageId: "body", text: "Hatchback" },
      { messageId: "fuel", text: "Elektrik" },
      { messageId: "transmission", text: "Otomatik" },
      { messageId: "budget", text: "Bütçe önemli değil" },
    ],
  },
  {
    scenarioId: "latest-uncovered-preference-first",
    turns: [
      { messageId: "intent", text: "Toyota almak istiyorum." },
      { messageId: "usage", text: "Günlük şehir içi" },
      { messageId: "body", text: "Sedan" },
      { messageId: "fuel", text: "Hidrojen" },
      { messageId: "transmission", text: "Manuel" },
      { messageId: "budget", text: "Bütçe önemli değil" },
    ],
  },
  {
    scenarioId: "multi-body-choice-is-one-or-preference",
    turns: [
      { messageId: "intent", text: "Merhaba, araba almak istiyorum." },
      { messageId: "usage", text: "Uzun yol" },
      { messageId: "body-multi", text: "SUV/crossover veya Sedan" },
      { messageId: "body-correction", text: "SUV/crossover" },
    ],
  },
];

describe("production conversation replay matrix", () => {
  it("preserves material preferences through ranking and passes the deployment invariant gate", async () => {
    const results = [];
    for (const scenario of scenarios) {
      const store = new InMemoryV2ConversationStore();
      let observer: (value: Readonly<Record<string, unknown>>) => void = () => undefined;
      const composition = createCarsDecisionV2ProductionComposition({ store, interpreter, realizer, shadow: true, smokeObserver: (value) => observer(value) });
      const result = await replaySyntheticConversation({
        scenario,
        executeTurn: async (turn, revision, observe) => {
          observer = observe;
          await runCarsDecisionTurnV2({ conversationId: scenario.scenarioId, messageId: turn.messageId, idempotencyKey: turn.messageId, expectedConversationRevision: revision, userMessage: turn.text, requestTime: `2026-08-21T00:0${revision}:00.000Z` }, composition);
        },
      });
      results.push(result);
    }
    const gate = evaluateConversationDeploymentGate(results);
    expect(gate).toMatchObject({ disposition: "READY", scenarioCount: 4, criticalFailureCount: 0, failedScenarioIds: [] });
    expect(gate.failuresByCode).toEqual({});

    const toyotaFinal = results[0]!.traces.at(-1)!;
    expect(toyotaFinal.technicalBuckets).toMatchObject({ eligible: expect.any(Number), notEvaluable: expect.any(Number), eliminated: expect.any(Number) });
    expect(toyotaFinal.affordabilityBuckets).toMatchObject({ selectable: expect.any(Number), verifiedWithin: expect.any(Number), unresolved: expect.any(Number) });
    expect(toyotaFinal.activeConstraints).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: "bodyStyle", decisionEffect: "HARD_FILTER" }),
      expect.objectContaining({ fieldId: "fuelType", decisionEffect: "HARD_FILTER" }),
      expect.objectContaining({ fieldId: "transmission", decisionEffect: "STRONG_RANK" }),
    ]));
    expect(toyotaFinal.shortlistMode).toBe("FAMILY_DIVERSE");
    expect(toyotaFinal.action).toBe("ASK_MATERIAL_QUESTION");
    expect(toyotaFinal.selectedQuestionKey).toMatch(/^affordabilityConflict\.3000000\./u);
    expect(toyotaFinal.offerCreated).toBe(false);
    expect(toyotaFinal.shortlistCandidateIds).toHaveLength(0);

    const latestPreferenceFinal = results[2]!.traces.at(-1)!;
    expect(latestPreferenceFinal.action).toBe("ASK_MATERIAL_QUESTION");
    // The controlled fuel answer is authoritative. With no matching technical
    // candidate, the engine reports a technical conflict instead of weakening it.
    expect(latestPreferenceFinal.selectedQuestionKey).toMatch(/^technicalConflict\.fuelType\.HYDROGEN\./u);
    expect(latestPreferenceFinal.offerCreated).toBe(false);

    const multiBody = results[3]!;
    const multiSelection = multiBody.traces[2]!;
    expect(multiSelection.activeConstraints).toContainEqual(expect.objectContaining({
      fieldId: "bodyStyle",
      normalizedValue: { operator: "ONE_OF", value: ["Sedan", "SUV", "Crossover"] },
    }));
    expect(multiSelection.selectedQuestionKey).toBe("discovery.fuelType");
    const correctedSelection = multiBody.traces[3]!;
    expect(correctedSelection.activeConstraints.filter((constraint) => constraint.fieldId === "bodyStyle")).toEqual([
      expect.objectContaining({ normalizedValue: { operator: "ONE_OF", value: ["SUV", "Crossover"] } }),
    ]);
    expect(correctedSelection.selectedQuestionKey).toBe("discovery.transmission");
  }, 120_000);
});
