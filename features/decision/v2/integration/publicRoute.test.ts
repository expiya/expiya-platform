import { describe, expect, it } from "vitest";
import { resolveAuthorizedOptionAnswer, selectCarsDecisionRoute } from "./publicRoute.server";

describe("public V2 route selection", () => {
  it("keeps V1 when the public flag is off", () => expect(selectCarsDecisionRoute(false, { ready: true })).toBe("V1"));
  it("fails closed instead of silently returning to V1 when public V2 is not ready", () => expect(selectCarsDecisionRoute(true, { ready: false })).toBe("V2_UNAVAILABLE"));
  it("selects V2 only for explicit flag plus complete readiness", () => expect(selectCarsDecisionRoute(true, { ready: true })).toBe("V2"));
  it("binds multiple stable option ids to server-authorized labels", () => {
    const priorOutput = { revision: 1, options: [{ id: "gasoline", label: "Benzin" }, { id: "hev", label: "Tam hibrit" }], optionSelection: { mode: "MULTIPLE", minimumSelections: 1, maximumSelections: 2 } } as never;
    expect(resolveAuthorizedOptionAnswer({ selectedOptionIds: ["gasoline", "hev"], priorOutput })).toBe("Benzin veya Tam hibrit");
    expect(() => resolveAuthorizedOptionAnswer({ selectedOptionIds: ["unknown"], priorOutput })).toThrow("V2_OPTION_SELECTION_UNKNOWN_ID");
  });
  it("rejects duplicate, stale, over-limit and wrong-mode selections", () => {
    const multiple = { revision: 1, options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], optionSelection: { mode: "MULTIPLE", minimumSelections: 1, maximumSelections: 2 } } as never;
    expect(() => resolveAuthorizedOptionAnswer({ selectedOptionIds: ["a", "a"], priorOutput: multiple })).toThrow("V2_OPTION_SELECTION_INVALID");
    expect(() => resolveAuthorizedOptionAnswer({ selectedOptionIds: ["old"], priorOutput: multiple })).toThrow("V2_OPTION_SELECTION_UNKNOWN_ID");
    expect(() => resolveAuthorizedOptionAnswer({ selectedOptionIds: ["a", "b", "c"], priorOutput: multiple })).toThrow("V2_OPTION_SELECTION_COUNT_INVALID");
    const single = { revision: 1, options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], optionSelection: { mode: "SINGLE", minimumSelections: 1, maximumSelections: 1 } } as never;
    expect(() => resolveAuthorizedOptionAnswer({ selectedOptionIds: ["a"], priorOutput: single })).toThrow("V2_OPTION_SELECTION_MODE_MISMATCH");
    expect(resolveAuthorizedOptionAnswer({ selectedOptionId: "a", priorOutput: multiple })).toBe("A");
  });
  it("does not combine disposition text with authorized real selections", () => {
    const priorOutput = { revision: 1, options: [{ id: "a", label: "Benzin" }], optionSelection: { mode: "MULTIPLE", minimumSelections: 1, maximumSelections: 2 } } as never;
    expect(resolveAuthorizedOptionAnswer({ selectedOptionIds: ["a"], priorOutput })).toBe("Benzin");
  });
  it("rejects an economic-recovery option id against another open question", () => {
    const priorOutput = { revision: 1, options: [{ id: "body.sedan", label: "Sedan" }], optionSelection: { mode: "SINGLE", minimumSelections: 1, maximumSelections: 1 } } as never;
    expect(() => resolveAuthorizedOptionAnswer({ selectedOptionId: "v2q.semanticRecovery.economic.running", priorOutput })).toThrow("V2_OPTION_SELECTION_UNKNOWN_ID");
  });
});
