import { describe, expect, it } from "vitest";
import { loadActiveSecretaryProductIdentityIndex } from "./secretaryProductIdentityIndex.server";
import { classifySecretaryMessage } from "./upperSecretary";
import { loadActiveCatalogDirectory } from "./catalogDirectory.server";
import { loadEffectiveCatalogFactoryView, projectExact14CategoryDecision } from "@/features/catalog-factory/runtime/effectiveCatalog.server";

describe("exact-111 Catalog Factory consumers", () => {
  it("refreshes directory category membership from the shared effective view", async () => {
    const directory = await loadActiveCatalogDirectory();
    const appliances = directory.find(row => row.id === "APPLIANCES")!;
    const electronics = directory.find(row => row.id === "ELECTRONICS")!;
    expect(appliances.categories.find(row => row.id === "DRYER")?.variants.some(row => row.label === "Bosch WQB245A0TR")).toBe(true);
    expect(electronics.categories.find(row => row.id === "MONITOR")?.variants.some(row => row.label === "ASUS PG27AQDM")).toBe(true);
    expect(electronics.categories.find(row => row.id === "GAME_CONSOLE")?.variants.some(row => row.label === "Sony PS5 CFI-2000 Disc")).toBe(true);
    expect(appliances.categories.find(row => row.id === "AIR_PURIFIER")?.variants.some(row => row.label === "Samsung AX5500")).toBe(true);
    expect(appliances.categories.find(row => row.id === "HOB")?.variants.some(row => row.label === "Siemens ER6A6PH40")).toBe(true);
    expect(appliances.categories.find(row => row.id === "BUILT_IN_MICROWAVE_OVEN")?.variants.some(row => row.label === "Siemens BF922L1B1")).toBe(true);
    expect(electronics.categories.find(row => row.id === "SMART_HOME_HUB")?.variants.some(row => row.label === "TP-Link H110(EU) V1")).toBe(true);
    expect(electronics.categories.find(row => row.id === "E_READER")?.variants.some(row => row.label === "Kobo Elipsa 2E N605")).toBe(true);
    expect(electronics.categories.find(row => row.id === "FITNESS_TRACKER")?.variants.some(row => row.label === "Xiaomi Smart Band 8 Pro M2333B1")).toBe(true);
  });

  it("routes unique exact aliases, clarifies brands, and leaks no raw product IDs", () => {
    const index = loadActiveSecretaryProductIdentityIndex();
    expect(index.status).toBe("ACTIVE");
    expect(classifySecretaryMessage("PG27AQDM arıyorum", { productIdentityIndex: index })).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: expect.stringContaining("category=MONITOR") });
    expect(classifySecretaryMessage("Siemens ürünleri", { productIdentityIndex: index })).toMatchObject({ kind: "CLARIFY_DESTINATION" });
    expect(classifySecretaryMessage("Tapo C225 V1 arıyorum", { productIdentityIndex: index })).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: expect.stringContaining("category=HOME_SECURITY_CAMERA") });
    expect(classifySecretaryMessage("AX5500 arıyorum", { productIdentityIndex: index })).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: expect.stringContaining("category=AIR_PURIFIER") });
    expect(classifySecretaryMessage("ER6A6PH40 arıyorum", { productIdentityIndex: index })).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: expect.stringContaining("category=HOB") });
    expect(classifySecretaryMessage("BF922L1B1 arıyorum", { productIdentityIndex: index })).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: expect.stringContaining("category=BUILT_IN_MICROWAVE_OVEN") });
    expect(classifySecretaryMessage("H110(EU) V1 arıyorum", { productIdentityIndex: index })).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: expect.stringContaining("category=SMART_HOME_HUB") });
    expect(index.entries.some(entry => entry.phrase.includes("n605") && entry.choice.categoryId === "E_READER")).toBe(true);
    expect(index.entries.some(entry => entry.phrase.includes("m2333b1") && entry.choice.categoryId === "FITNESS_TRACKER")).toBe(true);
    expect(index.entries.some(entry => entry.phrase.includes("electronics:") || entry.phrase.includes("appliances:"))).toBe(false);
  });

  it("keeps the shared authority at 111 while Wave-05 remains P/Y inactive", () => {
    const view = loadEffectiveCatalogFactoryView();
    expect(view.totals).toEqual({ before: 80, additions: 31, active: 111 });
    expect(view.authority).toMatchObject({ pointerSha256: "268a9528b4fb40247730f6482ccdb9a82e2ec898a7506c559421a86191bc095e", releaseDigest: "31929641c5673990bb28180b238983f6935d4cb2532cd4863676e936ed3cc6f0", admittedWave05: 3, allCatalogAuthority: 813 });
    for (const category of ["SMART_HOME_HUB", "E_READER", "FITNESS_TRACKER"]) {
      const projection = projectExact14CategoryDecision(category, { arbitrary: true });
      expect(projection).toMatchObject({ status: "DECISION_NOT_READY", winner: null, candidates: [], rankingSignals: [], activeQuestionEffects: [], unknownEffect: "NEUTRAL" });
      expect(projection.shadowCandidates).toHaveLength(1);
      expect(projection.shadowCandidates[0]?.readiness).toMatchObject({ INFORMATION_READY: true, P_READY: false, Y_READY: false });
    }
  });
});
