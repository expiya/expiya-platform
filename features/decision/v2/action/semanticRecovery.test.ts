import { describe, expect, it } from "vitest";
import { createConversationLocalSemanticRecoveryQuestion } from "./semanticRecovery";

const memory = { turn: 2, decisionFingerprint: "decision" } as never;
const snapshot = { authority: { catalogFingerprint: "catalog" } } as never;

describe("conversation-local semantic recovery", () => {
  it("clarifies five-door language instead of silently treating it as hatchback", () => {
    const question = createConversationLocalSemanticRecoveryQuestion({ userText: "Günlük şehir içi, 5 kapılı bir araç olsun", memory, snapshot, candidateIds: ["v2", "v1"], bodyStyleAlreadyInterpreted: false });
    expect(question?.question.stableSemanticKey).toBe("semanticRecovery.fiveDoorBodyStyle");
    expect(question?.question.options.map((option) => option.semanticValue)).toEqual(["Hatchback", "SUV"]);
    expect(question?.reasonCodes).toContain("CONVERSATION_LOCAL_SEMANTIC_RECOVERY");
  });

  it("does not override an explicitly interpreted body style", () => {
    expect(createConversationLocalSemanticRecoveryQuestion({ userText: "5 kapılı hatchback olsun", memory, snapshot, candidateIds: ["v1"], bodyStyleAlreadyInterpreted: true })).toBeNull();
  });

  it("does not turn unrelated user language into a global learning signal", () => {
    expect(createConversationLocalSemanticRecoveryQuestion({ userText: "İçi ferah olsun", memory, snapshot, candidateIds: ["v1"], bodyStyleAlreadyInterpreted: false })).toBeNull();
  });
});
