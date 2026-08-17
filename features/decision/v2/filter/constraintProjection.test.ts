import { describe, expect, it } from "vitest";
import type { ConstraintEvent } from "../domain/constraint";
import { projectActiveConstraints } from "./constraintProjection";

function constraint(id: string, overrides: Partial<ConstraintEvent> = {}): ConstraintEvent {
  return { schemaVersion: 1, conversationId: "conversation", id, sourceMessageId: `message-${id}`, sourceTurn: 1, sequence: 1, createdAt: "2026-08-16T00:00:00.000Z", eventType: "CONSTRAINT", kind: "HARD_CONSTRAINT", field: "fuelType", normalizedValue: { operator: "EQUALS", value: "HEV" }, sourceText: "explicit", confidence: 1, authority: "USER_EXPLICIT", decisionEffect: "HARD_FILTER", status: "ACTIVE", ...overrides };
}

describe("active constraint projection", () => {
  it("applies only active terminal authorized hard constraints", () => {
    const old = constraint("old", { status: "SUPERSEDED", supersededById: "new" });
    const current = constraint("new", { sourceTurn: 2, sequence: 0, supersedesId: "old", field: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "SUV" } });
    const result = projectActiveConstraints([current, old]);
    expect(result.activeHardConstraints.map((item) => item.constraintId)).toEqual(["new"]);
  });
  it("does not turn guided, illustrative, persona or soft preferences into filters", () => {
    const kinds: ConstraintEvent["kind"][] = ["GUIDED_APPROXIMATION", "ILLUSTRATIVE_SIGNAL", "PERSONA_PREFERENCE", "SOFT_PREFERENCE"];
    const result = projectActiveConstraints(kinds.map((kind, index) => constraint(`c${index}`, { kind, decisionEffect: "SOFT_RANK" })));
    expect(result.activeHardConstraints).toEqual([]); expect(result.activeNonHardConstraints).toHaveLength(4);
  });
  it("requires explicit policy permission for a functional hard preference", () => {
    expect(projectActiveConstraints([constraint("c1", { kind: "CONFIRMED_FUNCTIONAL_PREFERENCE" })]).activeHardConstraints).toEqual([]);
    expect(projectActiveConstraints([constraint("c2", { kind: "CONFIRMED_FUNCTIONAL_PREFERENCE", hardFilterPolicy: { allowed: true, policyId: "decision-safe", policyVersion: "1", fieldAuthority: "CATALOG_VERIFIED" } })]).activeHardConstraints).toHaveLength(1);
  });
});
