import { describe, expect, it } from "vitest";

import { evaluateCarsConversationQuality } from "./evaluateCarsConversationQuality";
import { emptyConversationTrace } from "./carsRequirementLedger";

const FORBIDDEN = [
  "koltuk veya bagaj için sayısal eşik",
  "mevcut doğrulanmış karar verisi",
  "USAGE_CAMP, BUDGET_MAX_TRY, MIN_SEATS",
  "minimum hacmi litre olarak belirtir misiniz",
  "Size uygun aracı birlikte daraltalım",
  "Kaydettim",
  "Not ettim",
];

describe("naturalness regression", () => {
  it.each(FORBIDDEN)("flags forbidden active-conversation pattern: %s", (sample) => {
    const quality = evaluateCarsConversationQuality({
      messages: [{ id: "1", role: "user", content: "Merhaba" }],
      conversation: emptyConversationTrace(),
      assistantMessage: sample,
    });
    expect(quality.roboticTemplateHits).toBeGreaterThan(0);
  });

  it("does not treat a natural greeting as robotic", () => {
    const quality = evaluateCarsConversationQuality({
      messages: [{ id: "1", role: "user", content: "Merhaba" }],
      conversation: emptyConversationTrace(),
      assistantMessage: "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?",
    });
    expect(quality.roboticTemplateHits).toBe(0);
  });
});
