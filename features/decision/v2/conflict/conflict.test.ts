import { describe, expect, it } from "vitest";
import { analyzeHardConflict } from "./analyze";
import type { CandidateDecisionAvailability } from "./types";

const constraints = ["body", "fuel", "budget"].map((id) => ({ constraintId: id, sourceEventId: id, fieldId: id, operator: "EQUALS", value: id }));
describe("WP8 bounded conflict recovery", () => {
  it("finds inclusion-minimal single and pair relaxations in canonical order", () => { const result = analyzeHardConflict({ availability: "HARD_CONFLICT", activeHardConstraints: constraints, recomputeWithoutConstraintIds: (ids) => ids.includes("budget") || (ids.includes("body") && ids.includes("fuel")) ? ["candidate"] : [], maximumOptions: 2 }); expect(result?.inclusionMinimalConflictSets).toEqual([["budget"], ["body", "fuel"]]); expect(result?.relaxationOptions).toHaveLength(2); });
  it("does not analyze uncertainty states as hard conflict", () => { for (const availability of ["READY_WITH_APPROXIMATE_BUDGET", "PRICE_UNRESOLVED", "TECHNICALLY_NOT_EVALUABLE"] as CandidateDecisionAvailability[]) expect(analyzeHardConflict({ availability, activeHardConstraints: constraints, recomputeWithoutConstraintIds: () => [] })).toBeNull(); });
  it("never mutates or silently relaxes constraints", () => { const before = JSON.stringify(constraints); analyzeHardConflict({ availability: "HARD_CONFLICT", activeHardConstraints: constraints, recomputeWithoutConstraintIds: () => ["candidate"] }); expect(JSON.stringify(constraints)).toBe(before); });
});
