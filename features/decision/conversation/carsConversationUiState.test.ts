import { describe, expect, it } from "vitest";

import { hasActiveFinalDiscriminator } from "./carsConversationUiState";

describe("hasActiveFinalDiscriminator", () => {
  it("locks text only while the latest assistant turn exposes structured choices", () => {
    expect(hasActiveFinalDiscriminator([{ id: "1", role: "assistant", content: "Seçin", discriminatorChoices: [
      { id: "MAX_CARGO", label: "Daha fazla bagaj alanı" },
    ] }])).toBe(true);
    expect(hasActiveFinalDiscriminator([{ id: "1", role: "assistant", content: "Devam edin" }])).toBe(false);
    expect(hasActiveFinalDiscriminator([
      { id: "1", role: "assistant", content: "Seçin", discriminatorChoices: [{ id: "MAX_CARGO", label: "Bagaj" }] },
      { id: "2", role: "user", content: "Bagaj" },
    ])).toBe(false);
  });
});
