import { describe, expect, it } from "vitest";

import { hasActionableCarsContext } from "./hasActionableCarsContext";

function user(content: string) {
  return { id: content, role: "user" as const, content };
}

describe("hasActionableCarsContext", () => {
  it.each([
    "araba almak istiyorum.",
    "Bir otomobil arıyorum",
    "I want to buy a car.",
    "I'm looking for a vehicle",
  ])("rejects generic purchase intent without a decision factor: %s", (content) => {
    expect(hasActionableCarsContext([user(content)])).toBe(false);
  });

  it.each([
    "Aile için geniş bir araba istiyorum.",
    "Bütçem 1.4 milyon TL.",
    "Compare Toyota Corolla and Honda Civic.",
  ])("accepts a concrete need, constraint, or candidate: %s", (content) => {
    expect(hasActionableCarsContext([user(content)])).toBe(true);
  });

  it("accepts a concrete follow-up after a generic opening", () => {
    expect(hasActionableCarsContext([
      user("Araba almak istiyorum."),
      { id: "question", role: "assistant", content: "What matters most?" },
      user("Mostly city driving, under 1.5 million TL."),
    ])).toBe(true);
  });
});
