import { describe, expect, it } from "vitest";

import { assessCarsConversationSufficiency } from "./assessCarsConversationSufficiency";
import { buildCarsRequirementLedger } from "./carsConversationMemory";
import { cannotRepeatQuestion, isSemanticLoop } from "./carsSemanticLoopGuard";

describe("dynamic sufficiency", () => {
  it("evaluates immediately when seats and cargo are both explicit", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "En az 7 koltuk ve 300 litre bagaj istiyorum." },
    ]);
    expect(assessCarsConversationSufficiency(trace)).toMatchObject({
      readyToEvaluate: true,
      phase: "READY_TO_EVALUATE",
    });
  });

  it("does not treat usage plus budget as ready", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "arazi aracı bakıyorum" },
      { id: "2", role: "user", content: "kamp ve stabilize yol" },
      { id: "3", role: "user", content: "2 milyon tl" },
    ]);
    const assessment = assessCarsConversationSufficiency(trace);
    expect(assessment.readyToEvaluate).toBe(false);
    expect(assessment.nextPurpose).not.toBe("FINAL_PRIORITY");
  });

  it("defers daily vs off-road when the user supplies a budget instead", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "arazi aracı lazım" },
      { id: "2", role: "assistant", content: "Hangisine daha yakınsınız: kamp ve stabilize yol, çamurlu/kötü yol, ciddi arazi mi?" },
      { id: "3", role: "user", content: "ciddi arazi kullanımı" },
      { id: "4", role: "assistant", content: "Ciddi arazi isteğiniz kaydı duruyor. Aracı yine de günlük şehirde de kullanacak mısınız, yoksa arazi önceliği açık ara daha mı yüksek?" },
      { id: "5", role: "user", content: "3 milyon" },
    ]);
    expect(trace.askedQuestionPurposes).toContain("DAILY_VS_OFFROAD");
    expect(cannotRepeatQuestion(trace, "DAILY_VS_OFFROAD")).toBe(false);
    expect(trace.questionMemory).toContainEqual(expect.objectContaining({ purpose: "DAILY_VS_OFFROAD", status: "DEFERRED" }));
    expect(assessCarsConversationSufficiency(trace).nextPurpose).not.toBe("DAILY_VS_OFFROAD");
    expect(assessCarsConversationSufficiency(trace).readyToEvaluate).toBe(false);
  });

  it("uses an explicit party size without redundant party confirmation", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "5 kişiyiz, bagaj da önemli." },
    ]);
    expect(trace.requirements).toContainEqual(expect.objectContaining({ key: "PARTY_SIZE", value: 5, evaluability: "EVALUABLE_NOW" }));
    expect(assessCarsConversationSufficiency(trace).nextPurpose).not.toBe("PARTY_CONFIRMATION");
    expect(assessCarsConversationSufficiency(trace).readyToEvaluate).toBe(false);
  });
});

describe("semantic loop guard", () => {
  it("forbids repeating an answered purpose without a correction", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "kamp ve stabilize yol" },
      { id: "2", role: "assistant", content: "Daha çok kamp ve stabilize yol mu?" },
      { id: "3", role: "user", content: "kamp ve stabilize yol" },
    ]);
    expect(cannotRepeatQuestion(trace, "USAGE_DETAIL")).toBe(true);
    expect(cannotRepeatQuestion(trace, "FINAL_PRIORITY")).toBe(true);
  });

  it("detects a no-progress same-purpose loop", () => {
    const previous = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "pickup tercihim" },
      { id: "2", role: "assistant", content: "Pickup tercihinizi kaydettim." },
      { id: "3", role: "user", content: "pickup dedim ya" },
    ]);
    expect(previous.didConversationProgress).toBe(false);
    expect(isSemanticLoop({ ...previous, lastAssistantQuestion: { purpose: "BODY_TYPE", prompt: "Pickup?" } }, "BODY_TYPE")).toBe(true);
  });
});
