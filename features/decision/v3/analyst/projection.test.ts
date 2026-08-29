import { describe, expect, it } from "vitest";
import { createV3ConversationState } from "../engine.server";
import { activeDecisionPreferences } from "../ledger";
import type { GovernedAnalysis, GovernedAnalystFact } from "./governance";
import { projectGovernedAnalystFacts } from "./projection";

const analysis = (
  facts: readonly GovernedAnalystFact[],
  corrections: GovernedAnalysis["acceptedCorrections"] = [],
): GovernedAnalysis => ({
  acceptedExplicitFacts: facts,
  rejectedExplicitFacts: [],
  acceptedHypotheses: [],
  rejectedHypotheses: [],
  acceptedCorrections: corrections,
  rejectedCorrections: [],
});

const fact = (
  concept: GovernedAnalystFact["concept"],
  value: GovernedAnalystFact["normalizedValue"],
  text: string,
): GovernedAnalystFact => ({
  concept,
  normalizedValue: value,
  sourceSpan: { start: 0, end: text.length, text },
  confidence: 0.98,
  explicitness: "USER_EXPLICIT",
  confirmationRequired: false,
  governance: "ACCEPTED_EXPLICIT",
});

describe("governed Analyst fact projection", () => {
  it("projects explicit usage, capacity and body facts with user authority", () => {
    const projected = projectGovernedAnalystFacts(
      createV3ConversationState("projection"),
      "m1",
      analysis([
        fact("primaryUsage", "PASSENGER_TRANSPORT", "öğrenci taşıyorum"),
        fact("passengerCapacity", 16, "16 kişilik"),
        fact("bodyStyleReference", "PICK-UP", "pick-up"),
      ]),
    );
    expect(activeDecisionPreferences(projected.ledger)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ concept: "primaryUsage", normalizedValue: "PASSENGER_TRANSPORT", authority: "USER_EXPLICIT" }),
        expect.objectContaining({ concept: "minimumSeats", normalizedValue: 16, authority: "USER_EXPLICIT" }),
        expect.objectContaining({ concept: "bodyStyle", normalizedValue: "PICKUP", authority: "USER_EXPLICIT" }),
      ]),
    );
  });

  it("keeps hypotheses out of the ledger and applies accepted clear corrections append-only", () => {
    const first = projectGovernedAnalystFacts(
      createV3ConversationState("correction"),
      "m1",
      analysis([fact("bodyStyleReference", "SUV", "SUV")]),
    );
    const corrected = projectGovernedAnalystFacts(
      first,
      "m2",
      analysis([], [
        {
          concept: "bodyStyleReference",
          operation: "CLEAR",
          sourceSpan: { start: 0, end: 14, text: "SUV istemiyorum" },
          confidence: 0.99,
        },
      ]),
    );
    expect(first.ledger).toHaveLength(1);
    expect(corrected.ledger).toHaveLength(2);
    expect(activeDecisionPreferences(corrected.ledger)).toEqual([]);
    expect(corrected.ledger.at(-1)?.status).toBe("CLEARED");
  });
});
