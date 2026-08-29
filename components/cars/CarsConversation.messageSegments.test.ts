import { describe, expect, it } from "vitest";

import { splitAssistantMessageSegments } from "./CarsConversation";

describe("splitAssistantMessageSegments", () => {
  it("splits a structured assistant turn into sequential chat bubbles", () => {
    expect(splitAssistantMessageSegments(
      "Şimdi seçenekleri ayıran teknik farklara bakalım.\n\nKalan aralık 110–132 kW.\n\nHangisini öne alalım?",
    )).toEqual([
      "Şimdi seçenekleri ayıran teknik farklara bakalım.",
      "Kalan aralık 110–132 kW.",
      "Hangisini öne alalım?",
    ]);
  });

  it("keeps a single response as one bubble", () => {
    expect(splitAssistantMessageSegments("Yakıt türünü birlikte değerlendirelim.")).toEqual([
      "Yakıt türünü birlikte değerlendirelim.",
    ]);
  });

  it("does not create empty bubbles from extra whitespace", () => {
    expect(splitAssistantMessageSegments("İlk bilgi.\n\n  \n\nSon soru. ")).toEqual([
      "İlk bilgi.",
      "Son soru.",
    ]);
  });
});
