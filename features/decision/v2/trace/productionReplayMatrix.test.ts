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
    expect(gate).toMatchObject({ disposition: "BLOCKED", scenarioCount: 2, criticalFailureCount: 1, failedScenarioIds: ["toyota-sedan-hev-automatic"] });
    expect(gate.failuresByCode).toEqual({ OFFER_WITH_ZERO_MATERIAL_PREFERENCE_COVERAGE: 1 });

    const toyotaFinal = results[0]!.traces.at(-1)!;
    expect(toyotaFinal.activeConstraints).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: "bodyStyle", decisionEffect: "STRONG_RANK" }),
      expect.objectContaining({ fieldId: "fuelType", decisionEffect: "STRONG_RANK" }),
      expect.objectContaining({ fieldId: "transmission", decisionEffect: "STRONG_RANK" }),
    ]));
    expect(toyotaFinal.shortlistMode).toBe("FAMILY_DIVERSE");
    expect(toyotaFinal.rankingCandidates.some((candidate) => candidate.bodyStyle === "Sedan")).toBe(false);
    expect(toyotaFinal.action).toBe("REQUEST_REVEAL_CONSENT");
  }, 120_000);
});
