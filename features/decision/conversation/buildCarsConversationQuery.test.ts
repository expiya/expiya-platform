import { describe, expect, it } from "vitest";

import { buildCarsConversationQuery } from "./buildCarsConversationQuery";

describe("buildCarsConversationQuery", () => {
  it("keeps every user turn in order and excludes assistant questions", () => {
    const query = buildCarsConversationQuery([
      { id: "1", role: "user", content: "I need a family car." },
      { id: "2", role: "assistant", content: "What is your budget?" },
      { id: "3", role: "user", content: "Up to 1.5 million TL." },
    ]);

    expect(query).toContain("User turn 1: I need a family car.");
    expect(query).toContain("User turn 2: Up to 1.5 million TL.");
    expect(query).not.toContain("What is your budget?");
  });

  it("preserves corrections and tells downstream extraction to prefer the latest fact", () => {
    const query = buildCarsConversationQuery([
      { id: "1", role: "user", content: "My budget is 1.2 million TL." },
      { id: "2", role: "user", content: "Correction: make that 1.5 million TL." },
    ]);

    expect(query.indexOf("1.2 million")).toBeLessThan(query.indexOf("1.5 million"));
    expect(query).toContain("newest statement replaces the older one");
  });
});
