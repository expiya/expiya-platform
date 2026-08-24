import { describe, expect, it } from "vitest";
import { clearSubmittedV2MultiSelection, selectedV2OptionLabels, toggleV2MultiSelection } from "./v2MultiSelectState";

describe("V2 multi-select UI state", () => {
  it("clears only the submitted question selection", () => {
    expect(clearSubmittedV2MultiSelection({ q1: ["a", "b"], q2: ["c"] }, "q1")).toEqual({ q2: ["c"] });
  });
});

describe("multi-selection drafting", () => {
  it("adds, removes, and bounds selections deterministically", () => {
    expect(toggleV2MultiSelection([], "suv", 2)).toEqual(["suv"]);
    expect(toggleV2MultiSelection(["suv"], "sedan", 2)).toEqual(["suv", "sedan"]);
    expect(toggleV2MultiSelection(["suv", "sedan"], "coupe", 2)).toEqual(["suv", "sedan"]);
    expect(toggleV2MultiSelection(["suv", "sedan"], "suv", 2)).toEqual(["sedan"]);
  });

  it("projects only a complete set of governed labels into the draft", () => {
    const options = [{ id: "suv", label: "SUV" }, { id: "coupe", label: "Coupe" }];
    expect(selectedV2OptionLabels(["suv", "coupe"], options)).toEqual(["SUV", "Coupe"]);
    expect(selectedV2OptionLabels(["unknown"], options)).toEqual([]);
  });
});
