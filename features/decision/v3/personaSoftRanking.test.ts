import { describe, expect, it } from "vitest";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";
import type { PreferenceEvent } from "./types";
import { scoreV39PersonaPreference, V39_PERSONA_SOFT_SCORE_CAP } from "./personaSoftRanking";
import { evaluateV3Catalog, rankV3Candidates } from "./catalogAdapter.server";
import { createV31Offer, resetV31OffersForTests } from "./offerGovernance.server";

const preference = (concept: PreferenceEvent["concept"], decisionUse: PreferenceEvent["decisionUse"] = "SOFT_RANK"): PreferenceEvent => ({
  id: concept, sourceMessageId: "m1", sourceTurn: 1,
  sourceSpan: { start: 0, end: 1, text: "x" }, concept, normalizedValue: concept,
  strength: "CONFIRMED_STRONG", status: "ACTIVE", decisionUse, confidence: 1,
  authority: "USER_CONFIRMED", confirmationRequired: false,
});
const traits = (...values: VehiclePersonaTrait[]) => new Set(values);

describe("V3.9 persona evidence soft-ranking boundary", () => {
  it.each([
    ["distinctiveDesign", ["DESIGN", "PRESTIGE"]],
    ["drivingEnjoyment", ["DRIVING_ENGAGEMENT"]],
    ["cockpitAmbience", ["TECHNOLOGY", "DESIGN"]],
    ["cabinComfort", ["COMFORT"]],
    ["cargoPracticality", ["PRACTICALITY", "FAMILY"]],
    ["mixedRoadUse", ["ADVENTURE"]],
  ] as const)("supports the %s corpus with neutral traits", (concept, values) => {
    expect(scoreV39PersonaPreference(traits(...values), [preference(concept)])).toBeGreaterThan(0);
  });

  it("caps accumulated persona influence", () => {
    const all = traits("DESIGN", "DRIVING_ENGAGEMENT", "COMFORT", "PRACTICALITY", "TECHNOLOGY", "PRESTIGE", "ADVENTURE", "FAMILY");
    const corpus = ["distinctiveDesign", "drivingEnjoyment", "cockpitAmbience", "cabinComfort", "cargoPracticality", "mixedRoadUse"].map((value) => preference(value as PreferenceEvent["concept"]));
    expect(scoreV39PersonaPreference(all, corpus)).toBe(V39_PERSONA_SOFT_SCORE_CAP);
  });

  it("ignores hard filters and inactive signals", () => {
    const hard = preference("distinctiveDesign", "HARD_FILTER");
    const inactive = { ...preference("drivingEnjoyment"), status: "SUPERSEDED" as const };
    expect(scoreV39PersonaPreference(traits("DESIGN", "DRIVING_ENGAGEMENT"), [hard, inactive])).toBe(0);
  });

  it("does not infer a trait when evidence is empty", () => {
    expect(scoreV39PersonaPreference(traits(), [preference("distinctiveDesign")])).toBe(0);
  });

  it("cannot alter candidate filtering, counts, or affordability", async () => {
    const budget = { ...preference("budgetMax", "HARD_FILTER"), field: "activeNewPrice", normalizedValue: 3_000_000, authority: "USER_EXPLICIT" as const, strength: "EXPLICIT_HARD" as const };
    const baseline = await evaluateV3Catalog([budget]);
    const persona = preference("distinctiveDesign");
    const withPersona = await evaluateV3Catalog([budget, persona]);
    expect(withPersona.candidateIds).toEqual(baseline.candidateIds);
    expect(withPersona.variants.map((variant) => variant.activeNewPrice?.amountTry)).toEqual(baseline.variants.map((variant) => variant.activeNewPrice?.amountTry));
  });

  it("preserves the eligible set through ranking and offer governance", async () => {
    resetV31OffersForTests();
    const catalog = await evaluateV3Catalog([]);
    const ranked = rankV3Candidates(catalog.variants, [preference("cockpitAmbience")]);
    expect(new Set(ranked.map((variant) => variant.id))).toEqual(new Set(catalog.candidateIds));
    const chosen = ranked.slice(0, 3);
    const governed = createV31Offer({ conversationId: "persona-v39-invariant", variants: chosen, catalogReleaseVersion: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint, decisionFingerprint: "persona-soft-only", limit: 3 });
    expect(governed.offer.candidateRefs.map((candidate) => candidate.exactVariantId)).toEqual(chosen.map((variant) => variant.id));
    expect(governed.offer.candidateRefs.every((candidate) => String(candidate.priceRealizationPermission) === "NOT_PERMITTED")).toBe(true);
  });
});
