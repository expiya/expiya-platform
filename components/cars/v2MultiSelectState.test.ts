import { describe, expect, it } from "vitest";
import { clearSubmittedV2MultiSelection } from "./v2MultiSelectState";

describe("V2 multi-select UI state", () => {
  it("clears only the submitted question selection", () => {
    expect(clearSubmittedV2MultiSelection({ q1: ["a", "b"], q2: ["c"] }, "q1")).toEqual({ q2: ["c"] });
  });
});
