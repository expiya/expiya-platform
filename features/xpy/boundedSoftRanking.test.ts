import { describe, expect, it } from "vitest";
import { V39_PERSONA_SOFT_RANKING_AUTHORITY } from "@/features/decision/v3/personaSoftRanking";
import { rankWithBoundedSoftSignals, type XpyCandidateSoftSignal } from "./boundedSoftRanking";
import { XPY_DOMAIN_PACKS, resolveXpyCategorySoftRanking } from "./domainPacks";

const authority = V39_PERSONA_SOFT_RANKING_AUTHORITY;
const signal = (exactCandidateId: string, evidenceState: XpyCandidateSoftSignal["evidenceState"], contribution = 0.5): XpyCandidateSoftSignal => ({ exactCandidateId, preferenceKey: "comfort", mappingRef: "cars-persona-v39:comfort", evidenceRef: `owner-approved-persona-trait:${exactCandidateId}`, evidenceState, contribution, reasonCode: "PERSONA_COMFORT_MATCH", authority });
const rank = (ids: readonly string[], signals: readonly XpyCandidateSoftSignal[], status: "ACTIVE" | "SUPERSEDED" | "CLEARED" = "ACTIVE") => rankWithBoundedSoftSignals({ eligibleCandidateIds: ids, preferences: [{ eventId: "event-1", preferenceKey: "comfort", status }], signals, scoreCap: 0.75, singleSelectionAuthorized: false });

describe("XPY bounded soft-ranking contract", () => {
  it("retains candidate membership while a governed advantage changes only ordering", () => {
    const result = rank(["candidate-b", "candidate-a", "candidate-c"], [signal("candidate-b", "KNOWN_MATCH")]);
    expect(result.orderedCandidateIds).toEqual(["candidate-b", "candidate-a", "candidate-c"]);
    expect(result.retainedCandidateIds).toEqual(["candidate-a", "candidate-b", "candidate-c"]);
    expect(result.selectionOutcome).toBe("TIED_TOP_SET");
  });

  it("treats unknown and conflicted evidence as neutral, never as loss or gain", () => {
    const result = rank(["known-no-match", "unknown", "conflicted"], [signal("known-no-match", "KNOWN_NO_MATCH"), signal("unknown", "UNKNOWN"), signal("conflicted", "CONFLICTED")]);
    expect(result.traces.map(row => row.score)).toEqual([0, 0, 0]);
    expect(result.selectionOutcome).toBe("NON_DOMINATED_SET");
    expect(result.traces.flatMap(row => row.neutralEvidence)).toHaveLength(2);
  });

  it("removing or superseding a preference deterministically removes only its ordering effect", () => {
    const active = rank(["a", "b"], [signal("b", "KNOWN_MATCH")]);
    const corrected = rank(["a", "b"], [signal("b", "KNOWN_MATCH")], "SUPERSEDED");
    expect(active.orderedCandidateIds).toEqual(["b", "a"]);
    expect(corrected.orderedCandidateIds).toEqual(["a", "b"]);
    expect(corrected.retainedCandidateIds).toEqual(active.retainedCandidateIds);
  });

  it("is catalog-order independent and caps multiple governed contributions", () => {
    const signals = [signal("b", "KNOWN_MATCH", 0.5), { ...signal("b", "KNOWN_MATCH", 0.5), mappingRef: "cars-persona-v39:comfort:second", evidenceRef: "owner-approved-persona-trait:second" }];
    const left = rank(["a", "b"], signals), right = rank(["b", "a"], signals);
    expect(left.orderedCandidateIds).toEqual(right.orderedCandidateIds);
    expect(left.deterministicFingerprint).toBe(right.deterministicFingerprint);
    expect(left.traces[0]?.score).toBe(0.75);
  });

  it("never authorizes a single winner unless the Domain Pack selection contract permits it", () => {
    const held = rank(["a", "b"], [signal("b", "KNOWN_MATCH")]);
    const authorized = rankWithBoundedSoftSignals({ eligibleCandidateIds: ["a", "b"], preferences: [{ eventId: "event-1", preferenceKey: "comfort", status: "ACTIVE" }], signals: [signal("b", "KNOWN_MATCH")], scoreCap: 0.75, singleSelectionAuthorized: true });
    expect(held.selectionOutcome).toBe("TIED_TOP_SET");
    expect(authorized.selectionOutcome).toBe("SELECTED_SINGLE");
  });

  it("registers all 54 categories and activates only evidence-qualified Persona categories", () => {
    const registrations = Object.values(XPY_DOMAIN_PACKS).flatMap(pack => pack.categories.map(category => `${pack.departmentId}:${category}`));
    expect(registrations).toHaveLength(54);
    expect(new Set(registrations)).toHaveProperty("size", 54);
    expect(XPY_DOMAIN_PACKS.CARS.boundedSoftRanking).toMatchObject({ status: "ACTIVE", scoreCap: 0.75 });
    expect(XPY_DOMAIN_PACKS.APPLIANCES.boundedSoftRanking.status).toBe("CATEGORY_SCOPED");
    expect(XPY_DOMAIN_PACKS.ELECTRONICS.boundedSoftRanking.status).toBe("CATEGORY_SCOPED");
    expect(XPY_DOMAIN_PACKS.BABY_AND_CHILD.boundedSoftRanking.status).toBe("CATEGORY_SCOPED");
    expect(XPY_DOMAIN_PACKS.MOBILITY.boundedSoftRanking.status).toBe("FAILED_CLOSED");
    expect(XPY_DOMAIN_PACKS.TOOLS.boundedSoftRanking.status).toBe("FAILED_CLOSED");
    expect(resolveXpyCategorySoftRanking("APPLIANCES", "MANUAL_ESPRESSO_MACHINE").status).toBe("ACTIVE");
    expect(resolveXpyCategorySoftRanking("ELECTRONICS", "HEADPHONES").status).toBe("ACTIVE");
    expect(resolveXpyCategorySoftRanking("ELECTRONICS", "PROJECTOR").status).toBe("ACTIVE");
    expect(resolveXpyCategorySoftRanking("BABY_AND_CHILD", "STROLLER").status).toBe("ACTIVE");
    expect(resolveXpyCategorySoftRanking("APPLIANCES", "WASHING_MACHINE").status).toBe("FAILED_CLOSED");
    expect(resolveXpyCategorySoftRanking("ELECTRONICS", "LAPTOP").status).toBe("FAILED_CLOSED");
  });

  it("rejects hidden commerce influence and signals outside hard-filter membership", () => {
    expect(() => rank(["a"], [{ ...signal("a", "KNOWN_MATCH"), reasonCode: "AMAZON_POSITION" }])).toThrow("XPY_SOFT_RANKING_FORBIDDEN_SOURCE");
    expect(() => rank(["a"], [signal("b", "KNOWN_MATCH")])).toThrow("XPY_SOFT_RANKING_SIGNAL_OUTSIDE_ELIGIBLE_SET");
  });
});
