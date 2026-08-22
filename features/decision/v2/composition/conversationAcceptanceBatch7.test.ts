import { describe, expect, it } from "vitest";
import { createHmacOfferSigner } from "../offer/signer.server";
import { InMemoryGovernedOfferStore } from "../offer/store";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";

const empty = (messageId: string): InterpretationResult => ({ schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const interpreter: StructuredInterpretationModel = { interpret: async ({ messageId }) => empty(messageId) };
const realizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };
const starts = [
  "Araba almak istiyorum.", "İlk arabamı alacağım.", "Kızım için sıfır araç bakıyorum.", "Oğluma ilk arabasını hediye edeceğim.", "Şehir içinde kullanmak için araç lazım.",
  "Aile için yeni bir araba arıyorum.", "Uzun yola uygun araç bakıyorum.", "İş için araç almam gerekiyor.", "Köy yollarında kullanacağım bir araç istiyorum.", "Nasıl bir araba almalıyım bilmiyorum.",
] as const;
const bodies = ["SUV/crossover", "Hatchback", "Sedan", "Kapalı kasa ticari", "Coupe"] as const;
const fuels = ["Benzin", "Dizel", "Elektrik", "Hafif hibrit", "Tam hibrit"] as const;
const scenarios = Array.from({ length: 50 }, (_, index) => ({ name: `journey-${index + 1}`, start: starts[index % starts.length]!, body: bodies[index % bodies.length]!, fuel: fuels[index % fuels.length]!, transmission: index % 3 === 0 ? "Manuel" : "Otomatik", budget: `${2 + (index % 5)} milyon`, redirectFirstQuestion: index % 2 === 0 }));

describe("V2 seventh batch of fifty end-to-end discovery conversations", () => {
  it("contains exactly fifty distinct multi-turn journeys", () => expect(scenarios).toHaveLength(50));
  it.each(scenarios)("$name", async (scenario) => {
    const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T20:09:00.000Z") }), smokeObserver: (trace) => traces.push(trace) });
    const conversationId = `batch7-${scenario.name}`; let revision = 0; let redirected = false;
    let output = await runCarsDecisionTurnV2({ conversationId, messageId: "start", idempotencyKey: "start", expectedConversationRevision: revision++, userMessage: scenario.start, requestTime: "2026-08-20T20:00:00.000Z" }, composition);
    for (let step = 0; step < 7 && !output.offer; step += 1) {
      const key = traces.filter((trace) => trace.phase === "DECISION").at(-1)?.selectedQuestionKey;
      let answer: string;
      if (scenario.redirectFirstQuestion && !redirected && key) { redirected = true; answer = key === "discovery.fuelType" ? "Yakıtı sonra konuşalım, önce gövde tipini belirleyelim." : key === "discovery.bodyStyle" ? "Gövdeyi sonra konuşalım, önce yakıtı belirleyelim." : "Bunu sonra konuşalım, başka önemli noktadan ilerleyelim."; }
      else answer = key === "discovery.bodyStyle" ? scenario.body : key === "discovery.fuelType" ? scenario.fuel : key === "discovery.transmission" ? scenario.transmission : key === "discovery.budget" ? scenario.budget : "Fark etmez";
      output = await runCarsDecisionTurnV2({ conversationId, messageId: `answer-${step}`, idempotencyKey: `answer-${step}`, expectedConversationRevision: revision++, userMessage: answer, requestTime: `2026-08-20T20:0${step + 1}:00.000Z` }, composition);
      const latestDecision = traces.filter((trace) => trace.phase === "DECISION").at(-1);
      if (["HARD_CONFLICT", "PRICE_UNRESOLVED", "TECHNICALLY_NOT_EVALUABLE"].includes(String(latestDecision?.recommendationReadiness))
        || ["HARD_CONFLICT", "PRICE_UNRESOLVED", "TECHNICALLY_NOT_EVALUABLE"].includes(String(latestDecision?.availability))) break;
    }
    const memory = (await store.load(conversationId))!.memory!;
    expect(memory.vehicleIntentEstablished).toBe(true);
    const decisionTrace = traces
      .filter((trace) => trace.phase === "DECISION")
      .map((trace) => ({
        action: trace.action,
        interpretedActs: trace.interpretedActs,
        recommendationReadiness: trace.recommendationReadiness,
        availability: trace.availability,
        selectedQuestionKey: trace.selectedQuestionKey,
        selectedQuestionStage: trace.selectedQuestionStage,
        unansweredDecisionFields: trace.unansweredDecisionFields,
        materialQuestionCount: trace.materialQuestionCount,
        questionStageCompletion: trace.questionStageCompletion,
        technicalBuckets: trace.technicalBuckets,
        affordabilityBuckets: trace.affordabilityBuckets,
      }));
    const finalDecision = decisionTrace.at(-1);
    const safelyBlocked = ["HARD_CONFLICT", "PRICE_UNRESOLVED", "TECHNICALLY_NOT_EVALUABLE"].includes(String(finalDecision?.recommendationReadiness))
      || ["HARD_CONFLICT", "PRICE_UNRESOLVED", "TECHNICALLY_NOT_EVALUABLE"].includes(String(finalDecision?.availability));
    if (safelyBlocked) {
      expect(output.offer).toBeUndefined();
      expect(output.cards).toEqual([]);
    } else {
      expect(output.state, JSON.stringify({ decisionTrace, directAnswerHistory: memory.directAnswerHistory })).toBe("AWAITING_CONSENT");
      expect(output.offer?.token).toBeTruthy();
    }
    expect(output.cards).toEqual([]);
    expect(decisionTrace.every((turn) => Number(turn.materialQuestionCount) <= 1)).toBe(true);
    const stageOrder = ["USAGE_CONTEXT", "VEHICLE_ARCHITECTURE", "FUNCTIONAL_NEEDS", "ENERGY_FIT", "TECHNICAL_PREFERENCES", "BUDGET", "SOFT_DIFFERENTIATION"];
    const selectedStages = decisionTrace.map((turn) => String(turn.selectedQuestionStage ?? "")).filter(Boolean).map((stage) => stageOrder.indexOf(stage));
    if (!scenario.redirectFirstQuestion) expect(selectedStages.every((stage, index) => index === 0 || stage >= selectedStages[index - 1]!), JSON.stringify(decisionTrace)).toBe(true);
    if (!safelyBlocked) expect(memory.materialQuestionHistory.some((item) => item.answerStatus === "OPEN")).toBe(false);
    if (scenario.redirectFirstQuestion) {
      expect(memory.materialQuestionHistory.some((item) => item.answerStatus === "DEFERRED")).toBe(true);
      expect(decisionTrace.some((turn) => (turn.questionStageCompletion as readonly { status: string; reasonCodes: readonly string[] }[] | undefined)?.some((stage) => stage.status === "SKIPPED_OR_DEFERRED" && stage.reasonCodes.includes("USER_EXPLICITLY_SKIPPED_OR_REDIRECTED_STAGE")))).toBe(true);
    }
    expect(output.message.trim()).not.toBe(""); expect(output.message).not.toMatch(/runtime|discriminator|evidence|GASOLINE|DIESEL|BEV/iu);
  });
});
