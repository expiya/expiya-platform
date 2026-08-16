import { describe, expect, it } from "vitest";

import { buildCarsRequirementLedger } from "./carsConversationMemory";
import { evaluateCatalogFacets, selectCatalogFacetWinner, type CatalogFacetCandidate } from "./carsCatalogFacetEngine";
import {
  derivePersonaPreference,
  explicitPersonaTraits,
  isPersonaCancellation,
  neutralPersonaLabels,
  shouldAskPersonaQuestion,
} from "./carsPersonaPreference";

describe("controlled vehicle persona decision layer", () => {
  const synthetic = (id: string, brand: string, model: string, powerKw: number, priceTry: number): CatalogFacetCandidate => ({
    id, brand, model, trim: "Test", body: "SEDAN", fuel: "GASOLINE", transmission: "AUTOMATIC",
    drivetrain: "FWD", powerKw, priceTry, record: {} as CatalogFacetCandidate["record"],
  });
  it("keeps persona disabled for budget-only input and leaves default ranking unchanged", () => {
    const trace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "Bütçem 5 milyon TL" }]);
    const evaluation = evaluateCatalogFacets(trace);
    expect(trace.personaPreference).toEqual({ activated: false, requestedTraits: [] });
    expect(selectCatalogFacetWinner(trace, evaluation.candidates)?.id).toBe(
      selectCatalogFacetWinner({ ...trace, personaPreference: undefined }, evaluation.candidates)?.id,
    );
  });

  it("does not confuse ordinary Turkish words with persona signals", () => {
    expect(explicitPersonaTraits("Bütçem yaklaşık 2,5 milyon")).toEqual([]);
  });

  it("activates neutral persona traits only from an explicit character request", () => {
    const trace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "Sportif ve tasarım odaklı bir otomobil istiyorum" }]);
    expect(trace.personaPreference).toMatchObject({ activated: true, activationSource: "USER_EXPLICIT" });
    expect(trace.personaPreference?.requestedTraits).toEqual(expect.arrayContaining(["DESIGN", "DRIVING_ENGAGEMENT"]));
  });

  it("maps masculine wording to neutral design traits without demographic language", () => {
    const traits = explicitPersonaTraits("Erkeksi görünen bir SUV istiyorum");
    expect(traits).toEqual(expect.arrayContaining(["DESIGN", "DRIVING_ENGAGEMENT"]));
    expect(neutralPersonaLabels(traits).join(" ")).not.toMatch(/erkek|kadın|aile babası/iu);
  });

  it("never changes the hard-filtered candidate pool", () => {
    const technical = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "2 milyon TL altında elektrikli sedan istiyorum" }]);
    const persona = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "2 milyon TL altında elektrikli, prestijli ve şık sedan istiyorum" }]);
    expect(evaluateCatalogFacets(persona).candidates.map((item) => item.id)).toEqual(
      evaluateCatalogFacets(technical).candidates.map((item) => item.id),
    );
  });

  it("uses persona between technically equal candidates but never ahead of functional performance", () => {
    const personaTrace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "Sportif ve tasarım odaklı olsun" }]);
    const alfa = synthetic("alfa", "Alfa Romeo", "Giulia", 100, 2_000_000);
    const daciaEqual = synthetic("dacia-equal", "Dacia", "Sandero", 100, 1_000_000);
    expect(selectCatalogFacetWinner(personaTrace, [daciaEqual, alfa])?.id).toBe("alfa");

    const performanceTrace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "Sportif tasarımlı olsun; performans ve güç önceliğim, en az 50 kW" }]);
    const daciaStronger = synthetic("dacia-strong", "Dacia", "Sandero", 200, 1_000_000);
    expect(selectCatalogFacetWinner(performanceTrace, [alfa, daciaStronger])?.id).toBe("dacia-strong");
  });

  it("allows prompted activation, cancellation, and later replacement", () => {
    const prompted = derivePersonaPreference([
      { id: "a1", role: "assistant", content: "Hangisi?", optionSet: { id: "p", purpose: "PERSONA", options: [], sourceAssistantTurn: 1, active: true } },
      { id: "u1", role: "user", content: "Teknolojik ve fütüristik" },
    ]);
    expect(prompted).toMatchObject({ activated: true, activationSource: "ADVISOR_PROMPT_RESPONSE", requestedTraits: ["TECHNOLOGY"] });
    expect(isPersonaCancellation("En mantıklısını seç")).toBe(true);
    const changed = derivePersonaPreference([
      { id: "u1", role: "user", content: "Prestijli ve dikkat çekici olsun" },
      { id: "u2", role: "user", content: "Aslında minimal olsun" },
    ]);
    expect(changed.requestedTraits).toEqual(["MINIMALISM"]);
    const cancelled = derivePersonaPreference([
      { id: "u1", role: "user", content: "Prestijli olsun" },
      { id: "u2", role: "user", content: "Tarz fark etmez" },
    ]);
    expect(cancelled).toMatchObject({ activated: false, requestedTraits: [] });
  });

  it("offers persona only after fundamentals and technical questions are exhausted", () => {
    const trace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "5 milyon TL, aile için 4 kişilik, elektrikli SUV; şehir içinde kullanacağım" }]);
    expect(shouldAskPersonaQuestion(trace, 4, true)).toBe(false);
    expect(shouldAskPersonaQuestion(trace, 4, false)).toBe(true);
    expect(shouldAskPersonaQuestion(trace, 1, false)).toBe(false);
  });
});
