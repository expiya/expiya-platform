import { describe, expect, it } from "vitest";
import { resolveRootStageOneAdapter, rootStageOneCoverage } from "./rootStageOneRegistry";

describe("root Stage 1 registry", () => {
  it("automatically covers active categories in supported domain families", () => {
    const coverage = rootStageOneCoverage();
    expect(coverage.every(row => row.supported)).toBe(true);
  });
  it("binds Cars and Tools to explicit thin adapters", () => {
    expect(resolveRootStageOneAdapter("TOOLS", "CORDLESS_DRILL")?.endpoint).toBe("/api/tools/conversation");
    expect(resolveRootStageOneAdapter("CARS", "NEW_CAR")?.mode).toBe("CARS_V3");
  });
});
