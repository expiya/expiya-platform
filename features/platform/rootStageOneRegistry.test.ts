import { describe, expect, it } from "vitest";
import { resolveRootStageOneAdapter, rootStageOneCoverage } from "./rootStageOneRegistry";

describe("root Stage 1 registry", () => {
  it("automatically covers active categories in supported domain families", () => {
    const coverage = rootStageOneCoverage();
    expect(coverage.filter(row => ["APPLIANCES", "ELECTRONICS", "BABY_AND_CHILD", "MOBILITY"].includes(row.departmentId)).every(row => row.supported)).toBe(true);
  });
  it("fails closed when an active category has no root runtime adapter", () => {
    expect(resolveRootStageOneAdapter("TOOLS", "CORDLESS_DRILL")).toBeUndefined();
    expect(resolveRootStageOneAdapter("CARS", "NEW_CAR")).toBeUndefined();
  });
});
