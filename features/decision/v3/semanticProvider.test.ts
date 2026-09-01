import { afterEach, describe, expect, it } from "vitest";
import { interpretV31Message } from "./semanticProvider.server";

const originalKey = process.env.OPENAI_API_KEY; const originalDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; if (originalDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = originalDisabled; });

describe("V3.1 semantic provider boundary", () => {
  it("falls back deterministically when provider is disabled", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true"; const result = await interpretV31Message({ message: "Yeni telefon almalıyım; iPhone mu Samsung mu?", hasPurchaseIntent: false, hasOpenQuestion: false });
    expect(result.origin).toBe("BOUNDED_FALLBACK"); expect(result.router).toMatchObject({ route: "OFF_TOPIC_REQUEST", decisionMutationAllowed: false, catalogEvaluationRequired: false });
  });

  it.each([
    ["Çocukken bir Mustang hayalim vardı.", "NOSTALGIA"],
    ["Hayalimdeki otomobile bir gün sahip olmak istiyorum.", "ASPIRATION"],
    ["Seçenekler arasında çok kararsızım.", "UNCERTAINTY"],
    ["Aracım sürekli sorun çıkarıyor, artık bıktım.", "FRUSTRATION"],
    ["İki hafta içinde acilen araç bulmalıyım.", "URGENCY"],
    ["Ehliyetimi aldım, ilk aracımı arıyorum.", "CELEBRATION"],
    ["Selam, bugün çok dertliyim.", "CONCERN"],
    ["Bugün baba oldum.", "CELEBRATION"],
  ])("detects grounded affect without turning it into a preference: %s", async (message, kind) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const result = await interpretV31Message({ message, hasPurchaseIntent: false, hasOpenQuestion: false });
    expect(result.affectiveSignals).toEqual(expect.arrayContaining([expect.objectContaining({ kind })]));
    if (kind === "NOSTALGIA") expect(result.preferenceSignals).toHaveLength(0);
  });

  it("recognizes not currently having a vehicle as human context, not a preference", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const result = await interpretV31Message({ message: "Arabam yok.", hasPurchaseIntent: false, hasOpenQuestion: false });
    expect(result.contextSignals).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "NO_CURRENT_VEHICLE" }),
    ]));
    expect(result.preferenceSignals).toHaveLength(0);
  });

  it("recognizes becoming a parent as context without inventing family usage", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const result = await interpretV31Message({ message: "Bebeğimiz oldu. Eşim ve ben bir araba almaya karar verdik.", hasPurchaseIntent: false, hasOpenQuestion: false });
    expect(result.contextSignals).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "NEW_PARENT_CONTEXT" }),
    ]));
    expect(result.preferenceSignals).toHaveLength(0);
  });

  it("extracts a cultural vehicle reference without creating a decision preference", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const result = await interpretV31Message({
      message: "Transformers filmindeki Bumblebee aracını istiyorum.",
      hasPurchaseIntent: false,
      hasOpenQuestion: false,
    });
    expect(result.vehicleReferenceSignals).toEqual([
      expect.objectContaining({
        kind: "POP_CULTURE",
        canonicalVehicle: expect.stringMatching(/Chevrolet Camaro/iu),
        ambiguity: "MULTIPLE_VEHICLES",
      }),
    ]);
    expect(result.preferenceSignals).toHaveLength(0);
  });
});
