import { describe, expect, it } from "vitest";
import { emptyConversationTrace } from "./carsRequirementLedger";
import { unsupportedSoftPreferenceBoundaryMessage } from "./carsDirectRecommendation";

describe("unsupported soft preference boundary", () => {
  it("retains comfort without inventing a winner and offers one material path", () => {
    const memory = {
      ...emptyConversationTrace(),
      requirements: [{
        key: "EQUIPMENT_LEVEL" as const,
        value: "Konfor öncelikli",
        sourceTurn: 4,
        sourceText: "Konfor öncelikli olsun.",
        status: "SUPPORTED_NOT_YET_EVALUABLE" as const,
        category: "SOFT_PREFERENCE" as const,
        evaluability: "UNDERSTOOD_NOT_EVALUABLE" as const,
        usedInDecision: false,
      }],
    };
    const message = unsupportedSoftPreferenceBoundaryMessage(memory);
    expect(message).toMatch(/yumuşaklığı.*sessizliği/iu);
    expect(message).toMatch(/minimum bagaj.*litre/iu);
    expect(message).not.toMatch(/en konforlu|konfor kazananı.*(?:Captur|Yaris)/iu);
  });
});
