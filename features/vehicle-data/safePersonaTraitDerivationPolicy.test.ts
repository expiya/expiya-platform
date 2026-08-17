import { describe, expect, it } from "vitest";
import { applySafePersonaTraitDerivationPolicy } from "./safePersonaTraitDerivationPolicy";

const apply = (overrides: Partial<Parameters<typeof applySafePersonaTraitDerivationPolicy>[0]> = {}) => applySafePersonaTraitDerivationPolicy({
  priorTraits: [], sourceEditorialText: "Nötr araç karakteri.", bodyStyles: ["SUV"], vehicleUseClasses: ["PASSENGER"], fuelTypes: ["GASOLINE"], ...overrides,
});

describe("safe persona semantic derivation policy", () => {
  it("removes COMMERCIAL from passenger SUV false positives including T-Cross and Model Y fixtures", () => {
    const tCross = apply({ priorTraits: ["URBAN", "COMMERCIAL"], bodyStyles: ["SUV"], vehicleUseClasses: ["PASSENGER"], fuelTypes: ["GASOLINE"] });
    const modelY = apply({ priorTraits: ["TECHNOLOGY", "COMMERCIAL", "SUSTAINABILITY"], bodyStyles: ["SUV"], vehicleUseClasses: ["PASSENGER"], fuelTypes: ["BEV"] });
    expect(tCross.traits).toEqual(["URBAN"]); expect(tCross.riskFlags).toContain("COMMERCIAL_FALSE_POSITIVE_RISK");
    expect(modelY.traits).toEqual(["TECHNOLOGY", "SUSTAINABILITY"]); expect(modelY.riskFlags).toContain("COMMERCIAL_FALSE_POSITIVE_RISK");
  });

  it("keeps COMMERCIAL only with canonical commercial architecture and a safe reason code", () => {
    const result = apply({ priorTraits: ["COMMERCIAL"], bodyStyles: ["Panel Van"], vehicleUseClasses: ["LIGHT_COMMERCIAL"], fuelTypes: ["DIESEL"] });
    expect(result.traits).toEqual(["COMMERCIAL"]); expect(result.reasons).toEqual([{ trait: "COMMERCIAL", reasonCode: "CANONICAL_COMMERCIAL_ARCHITECTURE" }]);
  });

  it("requires supported electrification for sustainability and flags MHEV or ICE mismatches", () => {
    expect(apply({ priorTraits: ["SUSTAINABILITY"], fuelTypes: ["BEV"] }).traits).toEqual(["SUSTAINABILITY"]);
    for (const fuelTypes of [["MHEV"], ["GASOLINE"]]) { const result = apply({ priorTraits: ["SUSTAINABILITY"], fuelTypes }); expect(result.traits).toEqual([]); expect(result.riskFlags).toContain("SUSTAINABILITY_TECHNICAL_MISMATCH"); }
  });

  it("removes dangerous-driving derivations and flags adventure body mismatches", () => {
    const dangerous = apply({ priorTraits: ["DRIVING_ENGAGEMENT", "ADVENTURE"], sourceEditorialText: "Agresif ve tehlikeli sürüş çağrışımı.", bodyStyles: ["SUV"] });
    expect(dangerous.traits).toEqual([]); expect(dangerous.riskFlags).toContain("DANGEROUS_DRIVING_SOURCE_CONTEXT");
    const sedan = apply({ priorTraits: ["ADVENTURE"], bodyStyles: ["Sedan"] }); expect(sedan.traits).toEqual(["ADVENTURE"]); expect(sedan.riskFlags).toContain("ADVENTURE_BODY_MISMATCH");
  });

  it("removes prestige and neutral-character traits when their only source context is stereotyped", () => {
    const prestige = apply({ priorTraits: ["PRESTIGE"], sourceEditorialText: "CEO ve milyarder sosyal statüsü." });
    expect(prestige.traits).toEqual([]); expect(prestige.riskFlags).toEqual(expect.arrayContaining(["PROFESSION_SOURCE_CONTEXT", "SOCIAL_CLASS_SOURCE_CONTEXT", "PRESTIGE_SOCIAL_CLASS_RISK"]));
    expect(apply({ priorTraits: ["DESIGN", "URBAN"], sourceEditorialText: "Genç influencer kullanıcı profili." }).traits).toEqual([]);
  });

  it("never publishes sensitive traits or raw source prose and never auto-approves", () => {
    const sourceEditorialText = "Kullanıcıya ait serbest ve riskli editoryal metin";
    const result = apply({ priorTraits: ["COMFORT", "PRACTICALITY", "VALUE", "FAMILY"], sourceEditorialText });
    expect(result.traits).toEqual([]); expect(JSON.stringify(result)).not.toContain(sourceEditorialText); expect(result.reviewStatus).toBe("OWNER_REVIEW_REQUIRED");
  });
});
