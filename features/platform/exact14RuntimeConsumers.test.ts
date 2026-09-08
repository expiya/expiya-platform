import { describe, expect, it } from "vitest";
import { loadActiveSecretaryProductIdentityIndex } from "./secretaryProductIdentityIndex.server";
import { classifySecretaryMessage } from "./upperSecretary";
import { loadActiveCatalogDirectory } from "./catalogDirectory.server";
import { loadEffectiveCatalogFactoryView, projectExact14CategoryDecision } from "@/features/catalog-factory/runtime/effectiveCatalog.server";

describe("exact-108 Catalog Factory consumers", () => {
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
    expect(index.entries.some(entry => entry.phrase.includes("electronics:") || entry.phrase.includes("appliances:"))).toBe(false);
  });

  it("keeps the shared authority at 108 while Wave-04 remains P/Y inactive", () => {
    const view = loadEffectiveCatalogFactoryView();
    expect(view.totals).toEqual({ before: 80, additions: 28, active: 108 });
    expect(view.authority).toMatchObject({ pointerSha256: "c6d1a1ee821891e34d3e7c2bb05d7fe63a4375d0a43da543a964404b7eed4589", releaseDigest: "cb1eb28a6bcf8d2a63c66bcc72d277dc7e9b6f9417c1790bb2d774e82b1e902e", admittedWave04: 3, allCatalogAuthority: 813 });
    for (const category of ["AIR_PURIFIER", "HOB", "BUILT_IN_MICROWAVE_OVEN"]) {
      const projection = projectExact14CategoryDecision(category, { arbitrary: true });
      expect(projection).toMatchObject({ status: "DECISION_NOT_READY", winner: null, candidates: [], rankingSignals: [], activeQuestionEffects: [], unknownEffect: "NEUTRAL" });
      expect(projection.shadowCandidates).toHaveLength(1);
      expect(projection.shadowCandidates[0]?.readiness).toMatchObject({ INFORMATION_READY: true, P_READY: false, Y_READY: false });
    }
  });
});
